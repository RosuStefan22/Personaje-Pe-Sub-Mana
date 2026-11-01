"""Utilitare comune pentru construirea procedurala a personajelor (Blender bpy)."""
import math
import bpy
import bmesh
from mathutils import Vector as V, Matrix, Quaternion


def srgb(h, a=1.0):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (*lin, a)


def lerp(a, b, t):
    return a + (b - a) * t


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def interp_table(tab, x):
    """tab: lista de (x, valoare|tuplu) sortata dupa x."""
    if x <= tab[0][0]:
        return tab[0][1]
    for (x0, a), (x1, b) in zip(tab, tab[1:]):
        if x0 <= x <= x1:
            t = (x - x0) / (x1 - x0)
            if isinstance(a, (tuple, list)):
                return tuple(lerp(p, q, t) for p, q in zip(a, b))
            return lerp(a, b, t)
    return tab[-1][1]


def make_material(name, hexcol, rough=0.85, metal=0.0, alpha=None, double=False, emission=None):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = srgb(hexcol)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if alpha is not None:
        p.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND' if hasattr(m, 'blend_method') else None
        try:
            m.surface_render_method = 'BLENDED'
        except Exception:
            pass
    if emission:
        p.inputs['Emission Color'].default_value = srgb(emission)
        p.inputs['Emission Strength'].default_value = 1.0
    m.use_backface_culling = not double
    m.diffuse_color = srgb(hexcol, 1 if alpha is None else alpha)
    return m


class MeshBuilder:
    """Acumuleaza geometrie + materiale + greutati pe oase, apoi creeaza un obiect Blender."""

    def __init__(self):
        self.v = []
        self.f = []
        self.fm = []
        self.w = []       # lista de dict bone->weight
        self.mats = []    # nume materiale
        self.smooth = []  # per fata

    def mat_index(self, name):
        if name not in self.mats:
            self.mats.append(name)
        return self.mats.index(name)

    def add(self, verts, faces, mat, weights=None, smooth=True):
        base = len(self.v)
        mi = self.mat_index(mat)
        self.v.extend([V(p) for p in verts])
        for f in faces:
            self.f.append([base + i for i in f])
            self.fm.append(mi)
            self.smooth.append(smooth)
        if weights is None:
            weights = [{}] * len(verts)
        elif callable(weights):
            weights = [weights(V(p)) for p in verts]
        elif isinstance(weights, dict):
            weights = [weights] * len(verts)
        self.w.extend(weights)
        return base

    def build(self, name, materials, collection=None, recalc=True):
        me = bpy.data.meshes.new(name)
        me.from_pydata([tuple(p) for p in self.v], [], self.f)
        me.update()
        for mname in self.mats:
            me.materials.append(materials[mname])
        for poly, mi, sm in zip(me.polygons, self.fm, self.smooth):
            poly.material_index = mi
            poly.use_smooth = sm
        if recalc:
            bm = bmesh.new()
            bm.from_mesh(me)
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            bm.to_mesh(me)
            bm.free()
        ob = bpy.data.objects.new(name, me)
        (collection or bpy.context.scene.collection).objects.link(ob)
        groups = {}
        for i, wd in enumerate(self.w):
            for b, wt in wd.items():
                if wt <= 0:
                    continue
                g = groups.get(b) or ob.vertex_groups.new(name=b)
                groups[b] = g
                g.add([i], wt, 'REPLACE')
        return ob


# ---------------- primitive geometrice ----------------

def ring(center, ax, ay, rx, ry_pos, ry_neg=None, n=24, p=2.0, phase=0.0):
    """Inel superelipsa. ay pozitiv foloseste ry_pos, negativ ry_neg."""
    ry_neg = ry_pos if ry_neg is None else ry_neg
    pts = []
    for i in range(n):
        a = phase + 2 * math.pi * i / n
        c, s = math.cos(a), math.sin(a)
        x = rx * math.copysign(abs(c) ** (2 / p), c)
        ry = ry_pos if s >= 0 else ry_neg
        y = ry * math.copysign(abs(s) ** (2 / p), s)
        pts.append(V(center) + V(ax) * x + V(ay) * y)
    return pts


def loft(rings, cap_start=True, cap_end=True):
    n = len(rings[0])
    verts = [p for r in rings for p in r]
    faces = []
    for k in range(len(rings) - 1):
        for i in range(n):
            a, b = k * n + i, k * n + (i + 1) % n
            c, d = (k + 1) * n + (i + 1) % n, (k + 1) * n + i
            faces.append([a, b, c, d])
    if cap_start:
        faces.append(list(range(n))[::-1])
    if cap_end:
        last = (len(rings) - 1) * n
        faces.append([last + i for i in range(n)])
    return verts, faces


def frame_for(direction, ref=V((0, 1, 0))):
    d = V(direction).normalized()
    if abs(d.dot(ref)) > 0.95:
        ref = V((1, 0, 0))
    ax = ref.cross(d).normalized()
    ay = d.cross(ax).normalized()
    return ax, ay, d


def ellipsoid(center, axes, nu=16, nv=10):
    """axes: 3 vectori (semiaxe). Returneaza (verts, faces)."""
    c = V(center)
    a, b, e = [V(x) for x in axes]
    verts = [c - e]
    for j in range(1, nv):
        th = math.pi * j / nv
        for i in range(nu):
            ph = 2 * math.pi * i / nu
            verts.append(c + a * (math.sin(th) * math.cos(ph)) + b * (math.sin(th) * math.sin(ph)) - e * math.cos(th))
    verts.append(c + e)
    faces = []
    for i in range(nu):
        faces.append([0, 1 + (i + 1) % nu, 1 + i])
    for j in range(nv - 2):
        r0, r1 = 1 + j * nu, 1 + (j + 1) * nu
        for i in range(nu):
            faces.append([r0 + i, r0 + (i + 1) % nu, r1 + (i + 1) % nu, r1 + i])
    top = len(verts) - 1
    r = 1 + (nv - 2) * nu
    for i in range(nu):
        faces.append([r + i, r + (i + 1) % nu, top])
    return verts, faces


def tube(path, radii, n=10, ref=V((0, 0, 1)), caps=True, flat=1.0):
    rings = []
    for i, p in enumerate(path):
        d = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)])
        ax, ay, _ = frame_for(d, ref)
        r = radii[i] if isinstance(radii, (list, tuple)) else radii
        rings.append(ring(p, ax, ay, r, r * flat, n=n))
    return loft(rings, caps, caps)


def box(center, size, frame=None):
    c = V(center)
    sx, sy, sz = [s / 2 for s in size]
    fx, fy, fz = frame or (V((1, 0, 0)), V((0, 1, 0)), V((0, 0, 1)))
    verts = []
    for z in (-sz, sz):
        for y in (-sy, sy):
            for x in (-sx, sx):
                verts.append(c + fx * x + fy * y + fz * z)
    faces = [[0, 2, 3, 1], [4, 5, 7, 6], [0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5]]
    return verts, faces


def rbox(center, size, r=0.2, n=4, frame=None):
    """'Rounded box' aproximat ca loft de superelipse (colturi rotunjite)."""
    c = V(center)
    sx, sy, sz = [s / 2 for s in size]
    fx, fy, fz = frame or (V((1, 0, 0)), V((0, 1, 0)), V((0, 0, 1)))
    rings = []
    zs = [-1, -0.92, 0.92, 1]
    for k, zz in enumerate(zs):
        shrink = 1 - r * 0.5 if abs(zz) == 1 else 1
        rings.append(ring(c + fz * (zz * sz), fx, fy, sx * shrink, sy * shrink, n=4 * n + 4, p=6))
    return loft(rings)


def grid_band(xs, top, bot, rows):
    """Grila 2D intre doua curbe (functii de x). Returneaza lista de randuri de puncte (x, z)."""
    out = []
    for r in range(rows + 1):
        t = r / rows
        out.append([(x, lerp(top(x), bot(x), t)) for x in xs])
    return out


def grid_faces(nr, nc, base=0):
    faces = []
    for r in range(nr - 1):
        for c in range(nc - 1):
            a = base + r * nc + c
            faces.append([a, a + 1, a + nc + 1, a + nc])
    return faces


def shell_from_grid(outer, inner):
    """outer, inner: randuri x coloane de puncte 3D -> solid inchis."""
    nr, nc = len(outer), len(outer[0])
    verts = [p for row in outer for p in row] + [p for row in inner for p in row]
    n = nr * nc
    faces = grid_faces(nr, nc)
    faces += [list(reversed(f)) for f in grid_faces(nr, nc, n)]
    # pereti laterali
    border = [(0, c) for c in range(nc)] + [(r, nc - 1) for r in range(1, nr)] + \
             [(nr - 1, c) for c in range(nc - 2, -1, -1)] + [(r, 0) for r in range(nr - 2, 0, -1)]
    for i in range(len(border)):
        r0, c0 = border[i]
        r1, c1 = border[(i + 1) % len(border)]
        a, b = r0 * nc + c0, r1 * nc + c1
        faces.append([b, a, n + a, n + b])
    return verts, faces


def mirror_x(verts, faces):
    return [V((-p.x, p.y, p.z)) for p in verts], [list(reversed(f)) for f in faces]


def seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-12)))
    return (a + ab * t - p).length
