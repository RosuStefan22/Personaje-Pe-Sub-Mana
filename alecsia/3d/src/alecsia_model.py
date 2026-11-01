"""Alecsia (Pe Sub Mana) — model 3D procedural: corp, haine, par, fata cu shape keys, schelet si weights.
Unitati: metri. Blender: Z sus, personajul priveste spre -Y, stanga ei = +X.
"""
import math
import bpy
import bmesh
from mathutils import Vector as V, Matrix
from mathutils.bvhtree import BVHTree
from common import *

# ---------------- PALETA (din turnaround) ----------------
COLORS = {
    'Skin': 'F0BE9B', 'Hair': '121017', 'HairShine': '3A3850', 'Hoodie': '836EB1', 'HoodieDark': '6A57A0',
    'Strings': 'A08BD0', 'Pants': '26252E', 'ShoeUpper': '4A4462', 'Sole': 'C9C2DF', 'ShoeWhite': 'EEECF5',
    'Phones': '3A3B43', 'PhonesDark': '1F1F25', 'PhonesLight': '62646E',
    'EyeWhite': 'F4EFEA', 'Iris': '3A2A20', 'Liner': '141218', 'Lips': 'BF7F6E', 'MouthIn': '5A2A2A',
    'Teeth': 'F4EEEA', 'Blush': 'E59B86', 'Lid': 'E3AE8B', 'Brow': '17141C',
}


def materials():
    import props_model as PM
    mats = {}
    for k in ('Laptop', 'LaptopDark', 'StickRed', 'StickBlue', 'StickGreen', 'StickPurple', 'StickOrange', 'StickTeal', 'StickBone'):
        COLORS[k] = PM.PCOL[k]
    for k, h in COLORS.items():
        mats[k] = make_material('ALX_' + k, h, rough=0.55 if k in ('Hair', 'Phones', 'PhonesDark') else 0.85)
    return mats


# ---------------- SCHELET (pozitie de repaus: A-pose) ----------------
def _arm_chain(side):
    s = 1 if side == 'L' else -1
    sh = V((0.17 * s, 0.01, 1.355))
    d = V((math.cos(math.radians(50)) * s, 0.0, -math.sin(math.radians(50))))
    el = sh + d * 0.28
    wr = el + d * 0.245
    hd = wr + d * 0.085
    fg = hd + d * 0.075
    return sh, el, wr, hd, fg


def bone_defs():
    B = {}
    B['Root'] = (V((0, 0, 0)), V((0, 0, 0.25)), None)
    B['Hips'] = (V((0, 0, 0.90)), V((0, 0, 0.98)), 'Root')
    B['Spine'] = (V((0, 0, 0.98)), V((0, 0, 1.13)), 'Hips')
    B['Chest'] = (V((0, 0, 1.13)), V((0, 0, 1.34)), 'Spine')
    B['Neck'] = (V((0, 0.004, 1.36)), V((0, 0, 1.45)), 'Chest')
    B['Head'] = (V((0, 0, 1.45)), V((0, 0, 1.66)), 'Neck')
    B['HairBack1'] = (V((0, 0.07, 1.56)), V((0, 0.11, 1.38)), 'Head')
    B['HairBack2'] = (V((0, 0.11, 1.38)), V((0, 0.13, 1.14)), 'HairBack1')
    for side in 'LR':
        s = 1 if side == 'L' else -1
        sh, el, wr, hd, fg = _arm_chain(side)
        B['Shoulder.' + side] = (V((0.03 * s, 0.0, 1.345)), sh.copy(), 'Chest')
        B['UpperArm.' + side] = (sh, el, 'Shoulder.' + side)
        B['ForeArm.' + side] = (el, wr, 'UpperArm.' + side)
        B['Hand.' + side] = (wr, hd, 'ForeArm.' + side)
        B['Fingers.' + side] = (hd, fg, 'Hand.' + side)
        B['UpLeg.' + side] = (V((0.09 * s, 0.0, 0.88)), V((0.095 * s, -0.004, 0.48)), 'Hips')
        B['Leg.' + side] = (V((0.095 * s, -0.004, 0.48)), V((0.10 * s, 0.012, 0.085)), 'UpLeg.' + side)
        B['Foot.' + side] = (V((0.10 * s, 0.012, 0.085)), V((0.10 * s, -0.085, 0.022)), 'Leg.' + side)
        B['Toe.' + side] = (V((0.10 * s, -0.085, 0.022)), V((0.10 * s, -0.16, 0.018)), 'Foot.' + side)
    # os pentru laptopul carat (scale 0 cand nu e folosit)
    sh, el, wr, hd, fg = _arm_chain('R')
    d = (hd - wr).normalized()
    palm = wr + d * 0.045
    B['Laptop.R'] = (palm, palm + d * 0.05, 'Hand.R')
    return B


BONES = bone_defs()


def auto_weights(cands, k=8, force=None):
    """Greutati dupa distanta pana la segmentele oaselor candidate (rest pose)."""
    segs = [(b, BONES[b][0], BONES[b][1]) for b in cands]

    def fn(p):
        if force:
            f = force(p)
            if f:
                return f
        ws = {}
        for b, a, c in segs:
            d = seg_dist(p, a, c) + 0.004
            ws[b] = 1.0 / d ** k
        tot = sum(ws.values())
        ws = {b: w / tot for b, w in ws.items()}
        ws = {b: w for b, w in ws.items() if w > 0.03}
        tot = sum(ws.values())
        return {b: w / tot for b, w in ws.items()}
    return fn


# ---------------- TORS (hanorac) ----------------
TORSO = [  # z, jumatate latime, adancime fata, adancime spate
    (0.785, .188, .124, .114), (0.83, .191, .129, .117), (0.92, .187, .131, .119), (1.04, .183, .135, .121),
    (1.16, .191, .143, .125), (1.26, .201, .136, .123), (1.32, .199, .119, .113), (1.36, .166, .099, .097),
    (1.385, .112, .073, .073), (1.395, .062, .056, .056)]
TORSO_P = 2.4


def torso_params(z):
    tab = [(t[0], t[1:]) for t in TORSO]
    return interp_table(tab, z)


def torso_radius(z, ang):
    w, df, db = torso_params(z)
    c, s = math.cos(ang), math.sin(ang)
    d = db if s >= 0 else df
    return 1.0 / ((abs(c) / w) ** TORSO_P + (abs(s) / d) ** TORSO_P) ** (1 / TORSO_P)


HOOD_C = V((0, 0.012, 0))


def hood_path(n=28):
    pts, rad = [], []
    for i in range(n + 1):
        b = math.radians(lerp(38, 322, i / n))
        x = math.sin(b) * 0.098
        y = -math.cos(b) * 0.094 + 0.012
        back = (1 - math.cos(b)) / 2  # 0 fata, 1 spate
        z = 1.372 + 0.036 * back ** 1.5
        pts.append(V((x, y, z)))
        rad.append(lerp(0.016, 0.042, back ** 1.2))
    return pts, rad


HOOD_PTS, HOOD_RAD = hood_path()


def push_out(p, margin=0.008, hood=True, neck=True, head=True):
    """Impinge un punct in afara hanoracului / glugii / gatului / capului."""
    p = V(p)
    if 0.78 < p.z < 1.40:
        ang = math.atan2(p.y, p.x)
        r = math.hypot(p.x, p.y)
        R = torso_radius(p.z, ang) + margin
        if r < R:
            k = R / max(r, 1e-6)
            p.x *= k
            p.y *= k
    if hood:
        best, bd = None, 1e9
        for i in range(len(HOOD_PTS) - 1):
            a, b = HOOD_PTS[i], HOOD_PTS[i + 1]
            ab = b - a
            t = max(0, min(1, (p - a).dot(ab) / ab.length_squared))
            q = a + ab * t
            d = (p - q).length
            if d < bd:
                bd, best, rr = d, q, lerp(HOOD_RAD[i], HOOD_RAD[i + 1], t)
        if bd < rr + margin:
            p = best + (p - best).normalized() * (rr + margin)
    if neck and 1.33 < p.z < 1.47:
        r = math.hypot(p.x, p.y - 0.003)
        if r < 0.05 + margin:
            k = (0.05 + margin) / max(r, 1e-6)
            p.x *= k
            p.y = 0.003 + (p.y - 0.003) * k
    if head:
        c = HEAD_C
        q = p - c
        e = V((q.x / 0.093, q.y / 0.107, q.z / 0.119))
        if e.length < 1.0 + margin * 8:
            s = (1.0 + margin * 8) / max(e.length, 1e-6)
            p = c + q * s
    return p


def build_torso(mb, mats):
    rings = [ring(V((0, 0.004 if z > 1.3 else 0, z)), V((1, 0, 0)), V((0, 1, 0)), w, db, df, n=40, p=TORSO_P)
             for z, w, df, db in TORSO]
    v, f = loft(rings)
    wfn = auto_weights(['Hips', 'Spine', 'Chest', 'Shoulder.L', 'Shoulder.R'], k=6)
    mb.add(v, f, 'Hoodie', wfn)
    # banda de jos (riaj) — usor mai lata
    band = [ring(V((0, 0, z)), V((1, 0, 0)), V((0, 1, 0)), w * 1.03 + .002, db * 1.03 + .002, df * 1.03 + .002, n=40, p=TORSO_P)
            for z, w, df, db in [(0.78, .187, .123, .113), (0.785, .190, .125, .115), (0.835, .193, .13, .118), (0.84, .19, .128, .116)]]
    v, f = loft(band)
    mb.add(v, f, 'HoodieDark', auto_weights(['Hips', 'Spine'], k=6))


def build_hood(mb):
    v, f = tube(HOOD_PTS, HOOD_RAD, n=12, ref=V((0, 0, 1)))
    mb.add(v, f, 'Hoodie', {'Chest': 0.85, 'Neck': 0.15})
    # snururile
    for s in (1, -1):
        top = V((0.034 * s, -0.082, 1.372))
        path = []
        for i in range(9):
            t = i / 8
            q = V((lerp(0.034, 0.042, t) * s, lerp(-0.082, -0.15, t), lerp(1.372, 1.235, t)))
            path.append(push_out(q, margin=0.006, hood=False, neck=False, head=False))
        path[0] = top
        v, f = tube(path, 0.0045, n=8)
        mb.add(v, f, 'Strings', {'Chest': 1.0})
        end = path[-1]
        d = (path[-1] - path[-2]).normalized()
        v, f = tube([end, end + d * 0.02], 0.0062, n=8)
        mb.add(v, f, 'HoodieDark', {'Chest': 1.0})


def build_pocket(mb, torso_bvh):
    xs = [lerp(-0.128, 0.128, i / 26) for i in range(27)]
    top = lambda x: 1.0 if abs(x) < 0.095 else 1.0 - (abs(x) - 0.095) / 0.033 * 0.075
    bot = lambda x: 0.862
    g = grid_band(xs, top, bot, 6)
    outer, inner = [], []
    for row in g:
        o, i_ = [], []
        for x, z in row:
            hit = torso_bvh.ray_cast(V((x, -1, z)), V((0, 1, 0)))
            p, n = (hit[0], hit[1]) if hit[0] else (V((x, -0.13, z)), V((0, -1, 0)))
            o.append(p + n * 0.0065)
            i_.append(p - n * 0.002)
        outer.append(o)
        inner.append(i_)
    v, f = shell_from_grid(outer, inner)
    mb.add(v, f, 'Hoodie', auto_weights(['Hips', 'Spine'], k=6))


# ---------------- BRATE / MAINI ----------------
def build_arm(mb, side):
    s = 1 if side == 'L' else -1
    sh, el, wr, hd, fg = _arm_chain(side)
    up, fo = (el - sh), (wr - el)
    L1, L2 = up.length, fo.length
    prof = [(-0.04, .066), (0.0, .074), (0.07, .074), (0.17, .069), (0.28, .064), (0.36, .060), (0.44, .056),
            (0.49, .054), (0.493, .046), (0.522, .045)]
    rings = []
    for dist, r in prof:
        if dist <= L1:
            c = sh + up.normalized() * dist
            d = up if abs(dist - L1) > 0.03 else (up.normalized() + fo.normalized())
        else:
            c = el + fo.normalized() * (dist - L1)
            d = fo
        ax, ay, _ = frame_for(d, V((0, 1, 0)))
        rings.append(ring(c, ax, ay, r, r * 0.95, n=24))
    v, f = loft(rings)
    sf = '.' + side
    wfn = auto_weights(['Shoulder' + sf, 'UpperArm' + sf, 'ForeArm' + sf], k=8)
    mb.add(v, f, 'Hoodie', wfn)
    # mansete (riaj, culoare putin mai inchisa)
    rr = [ring(wr - fo.normalized() * dd, *frame_for(fo, V((0, 1, 0)))[:2], r, r * .95, n=24) for dd, r in [(0.034, .047), (0.03, .049), (0.002, .048), (0.0, .045)]]
    v, f = loft(rr)
    mb.add(v, f, 'HoodieDark', {'ForeArm' + sf: 1.0})
    # mana: palma + degete + deget mare
    d = (hd - wr).normalized()
    n_out = d.cross(V((0, 1, 0))).normalized() if s > 0 else V((0, 1, 0)).cross(d).normalized()
    # n_out arata spre exterior (in afara corpului); palma priveste spre corp
    fwd = V((0, -1, 0))
    v, f = ellipsoid(wr + d * 0.045, (d * 0.052, fwd * 0.041, n_out * 0.018), 14, 8)
    mb.add(v, f, 'Skin', {'Hand' + sf: 1.0})
    v, f = ellipsoid(hd + d * 0.034, (d * 0.042, fwd * 0.038, n_out * 0.015), 14, 8)
    mb.add(v, f, 'Skin', {'Fingers' + sf: 1.0})
    tdir = (d * 0.55 + fwd * 0.75 - n_out * 0.25).normalized()
    v, f = ellipsoid(wr + d * 0.035 + fwd * 0.03 - n_out * 0.006, (tdir * 0.03, tdir.cross(n_out).normalized() * 0.012, n_out * 0.012), 10, 6)
    mb.add(v, f, 'Skin', {'Hand' + sf: 1.0})


# ---------------- PICIOARE / PANTOFI ----------------
def build_leg(mb, side):
    s = 1 if side == 'L' else -1
    hip, knee, ank = BONES['UpLeg.' + side][0], BONES['Leg.' + side][0], BONES['Leg.' + side][1]
    th, sh = knee - hip, ank - knee
    L1 = th.length
    prof = [(-0.07, .096, .09), (0.0, .095, .089), (0.10, .089, .083), (0.25, .075, .073), (0.40, .061, .063),
            (0.50, .057, .059), (0.62, .054, .056), (0.74, .056, .058), (0.80, .061, .064)]
    rings = []
    for dist, rx, ry in prof:
        if dist <= L1:
            c = hip + th.normalized() * dist
            d = th
        else:
            c = knee + sh.normalized() * (dist - L1)
            d = sh
        ax, ay, _ = frame_for(d, V((0, -1, 0)))
        c = c + V((-0.004 * s, 0, 0)) * (1 if dist < 0.1 else 0)
        rings.append(ring(c, ax, ay, rx, ry, n=24))
    v, f = loft(rings)
    sf = '.' + side
    mb.add(v, f, 'Pants', auto_weights(['Hips', 'UpLeg' + sf, 'Leg' + sf], k=8))
    build_shoe(mb, side)


SHOE = [(0.058, .028, .052), (0.048, .041, .094), (0.022, .046, .104), (-0.02, .048, .094), (-0.06, .050, .074),
        (-0.10, .050, .061), (-0.14, .046, .052), (-0.165, .037, .043), (-0.179, .022, .031)]


def build_shoe(mb, side):
    s = 1 if side == 'L' else -1
    sf = '.' + side
    ank = BONES['Foot.' + side][0]
    x0, y0 = ank.x, ank.y
    ball_y = BONES['Toe.' + side][0].y

    def wfn(p):
        t = smooth((p.y - (ball_y - 0.02)) / 0.04)
        return {'Foot' + sf: t, 'Toe' + sf: 1 - t} if t < 1 else {'Foot' + sf: 1.0}
    # fata (upper)
    rings = []
    for y, wx, top in SHOE:
        bot = 0.014
        rings.append(ring(V((x0, y0 + y, (top + bot) / 2)), V((1, 0, 0)), V((0, 0, 1)), wx, (top - bot) / 2, n=24, p=3.2))
    v, f = loft(rings)
    mb.add(v, f, 'ShoeUpper', wfn)
    # talpa
    rings = []
    for y, wx, top in [(0.062, .03, 0), (0.058, .036, 0), (0.04, .046, 0), (-0.06, .053, 0), (-0.14, .049, 0), (-0.172, .038, 0), (-0.185, .022, 0)]:
        rings.append(ring(V((x0, y0 + y, 0.014)), V((1, 0, 0)), V((0, 0, 1)), wx + .003, 0.0145, n=24, p=5))
    v, f = loft(rings)
    mb.add(v, f, 'Sole', wfn)
    # dunga alba (val) pe ambele laturi
    for side_sign in (1, -1):
        path = []
        for i in range(14):
            t = i / 13
            y = lerp(0.04, -0.085, t)
            z = 0.046 + 0.014 * math.sin(t * math.pi * 1.15 + 0.2) - 0.012 * t
            wx = interp_table([(q[0], q[1]) for q in reversed(SHOE)], y)
            path.append(V((x0 + side_sign * (wx + 0.0015), y0 + y, z)))
        v, f = tube(path, [0.0032 + 0.0018 * math.sin(math.pi * i / 13) for i in range(14)], n=6, ref=V((1, 0, 0)), flat=0.45)
        mb.add(v, f, 'ShoeWhite', wfn)
    # sireturi
    for i, y in enumerate([-0.005, -0.03, -0.055]):
        top = interp_table([(q[0], q[2]) for q in reversed(SHOE)], y)
        v, f = box(V((x0, y0 + y, top + 0.001)), (0.05, 0.007, 0.006))
        mb.add(v, f, 'ShoeWhite', wfn, smooth=False)


def build_carry_laptop(mb):
    import props_model as PM
    sh, el, wr, hd, fg = _arm_chain('R')
    d = (hd - wr).normalized()
    n_out = V((0, 1, 0)).cross(d).normalized()
    fwd = V((0, -1, 0))
    palm = wr + d * 0.045
    c = palm - n_out * 0.026 - d * 0.075 + fwd * 0.03
    for v, f, mat in PM.laptop_parts(c, fwd, -d, n_out):
        mb.add(v, f, mat, {'Laptop.R': 1.0})


def build_pelvis(mb):
    v, f = ellipsoid(V((0, 0.004, 0.86)), (V((0.15, 0, 0)), V((0, 0.105, 0)), V((0, 0, 0.085))), 20, 10)
    mb.add(v, f, 'Pants', auto_weights(['Hips', 'UpLeg.L', 'UpLeg.R'], k=6))


# ---------------- GAT / CAP ----------------
HEAD_C = V((0, -0.008, 1.556))
FS = 1.085  # scara trasaturilor fetei


def head_shape(x, y, z):
    X, Y, Z = x * 0.086, y * 0.100, z * 0.111
    if z < 0:
        t = -z
        X *= 1 - 0.40 * t ** 1.7
        if y < 0:
            Y *= 1 - 0.10 * t ** 2
        else:
            Y *= 1 - 0.48 * t ** 1.3
    if y < 0:
        Y *= 1 - 0.07 * (1 - abs(z)) * (1 - abs(x))
        # nas
        g = math.exp(-((x / 0.085) ** 2 + ((z + 0.19) / 0.14) ** 2))
        Y -= 0.0145 * g * (-y) ** 2
        # barbie
        Y -= 0.006 * math.exp(-((x / 0.25) ** 2 + ((z + 0.86) / 0.12) ** 2)) * (-y)
        # pometi
        X *= 1 + 0.035 * math.exp(-((z + 0.05) / 0.25) ** 2)
    return HEAD_C + V((X, Y, Z))


def head_grid(nu=48, nv=32):
    rows = []
    for j in range(nv + 1):
        th = math.pi * j / nv
        row = []
        for i in range(nu):
            ph = 2 * math.pi * i / nu
            # ph=0 -> fata (-Y)
            x, y, z = math.sin(th) * math.sin(ph), -math.sin(th) * math.cos(ph), -math.cos(th)
            row.append((x, y, z))
        rows.append(row)
    return rows


def build_head(mb):
    rows = head_grid()
    nu = len(rows[0])
    verts = []
    for row in rows[1:-1]:
        for x, y, z in row:
            verts.append(head_shape(x, y, z))
    bottom = head_shape(0, 0, -1)
    top = head_shape(0, 0, 1)
    verts = [bottom] + verts + [top]
    faces = []
    nv = len(rows) - 1
    for i in range(nu):
        faces.append([0, 1 + (i + 1) % nu, 1 + i])
    for j in range(nv - 2):
        r0, r1 = 1 + j * nu, 1 + (j + 1) * nu
        for i in range(nu):
            faces.append([r0 + i, r0 + (i + 1) % nu, r1 + (i + 1) % nu, r1 + i])
    t = len(verts) - 1
    r = 1 + (nv - 2) * nu
    for i in range(nu):
        faces.append([r + i, r + (i + 1) % nu, t])
    mb.add(verts, faces, 'Skin', {'Head': 1.0})
    bvh = BVHTree.FromPolygons([tuple(p) for p in verts], faces)
    # gat
    path = [V((0, 0.006, 1.33)), V((0, 0.005, 1.40)), V((0, 0.003, 1.47)), V((0, 0.0, 1.53))]
    v, f = tube(path, [0.047, 0.046, 0.045, 0.045], n=20, ref=V((0, -1, 0)))
    mb.add(v, f, 'Skin', auto_weights(['Chest', 'Neck', 'Head'], k=6))
    # urechi
    for s in (1, -1):
        c = V((0.083 * s, 0.008, 1.553))
        v, f = ellipsoid(c, (V((0.009 * s, 0.003, 0)), V((0.004, 0.015, 0)), V((0, 0.0, 0.023))), 12, 8)
        mb.add(v, f, 'Skin', {'Head': 1.0})
    return bvh


# ---------------- FATA (mesh separat, cu shape keys) ----------------
class FaceBuilder:
    """Trasaturi 2D (x, z relativ la centrul capului) proiectate pe suprafata capului, cu shape keys."""

    def __init__(self, bvh):
        self.bvh = bvh
        self.parts = []   # (material, {key: rows}, offset)

    def proj(self, x, z, off):
        x, z = x * FS, z * FS
        o = V((x, -1.0, HEAD_C.z + z))
        hit = self.bvh.ray_cast(o, V((0, 1, 0)))
        if hit[0] is None:
            return V((x, -0.09, HEAD_C.z + z))
        return hit[0] + hit[1] * off

    def band(self, mat, off, keyfns, xs, rows=3):
        """keyfns: {'Basis': (top, bot), 'blink': (top, bot), ...}"""
        self.parts.append((mat, {k: grid_band(xs, t, b, rows) for k, (t, b) in keyfns.items()}, off))

    def build(self, name, mats, collection=None):
        mb = MeshBuilder()
        keys = set()
        for _, kd, _ in self.parts:
            keys |= set(kd)
        keys.discard('Basis')
        keyed = {k: [] for k in keys}
        for mat, kd, off in self.parts:
            basis = kd['Basis']
            nr, nc = len(basis), len(basis[0])
            verts = [self.proj(x, z, off) for row in basis for x, z in row]
            mb.add(verts, grid_faces(nr, nc), mat, {'Head': 1.0})
            for k in keys:
                rows = kd.get(k, basis)
                keyed[k].extend([self.proj(x, z, off) for row in rows for x, z in row])
        ob = mb.build(name, mats, collection, recalc=False)
        # normale spre fata (-Y)
        me = ob.data
        for poly in me.polygons:
            if poly.normal.y > 0:
                poly.flip()
        ob.shape_key_add(name='Basis')
        for k in sorted(keys):
            sk = ob.shape_key_add(name=k, from_mix=False)
            sk.value = 0.0
            for i, p in enumerate(keyed[k]):
                sk.data[i].co = p
        return ob


def build_face(bvh, mats, collection):
    fb = FaceBuilder(bvh)
    cols = lambda a, b, n: [lerp(a, b, i / n) for i in range(n + 1)]
    for s in (1, -1):
        I, O = (0.0155, 0.0025), (0.047, 0.0068)

        def T(x, s=s):  # parametru 0..1 de la coltul interior la cel exterior
            return max(0.0, min(1.0, (abs(x) - I[0]) / (O[0] - I[0])))

        def base(x):
            t = T(x)
            return lerp(I[1], O[1], t)

        up = lambda x: base(x) + 0.0093 * math.sin(math.pi * T(x)) ** 0.7
        lo = lambda x: base(x) - 0.0062 * math.sin(math.pi * T(x)) ** 0.85
        closed = lambda x: base(x) - 0.0022 * math.sin(math.pi * T(x)) ** 0.9
        xs = [s * x for x in cols(I[0], O[0], 16)]
        if s < 0:
            xs = xs[::-1]
        fb.band('EyeWhite', 0.0009, {'Basis': (up, lo)}, xs, 4)
        # iris + pupila (decupate in alb)
        ic, irx, irz = s * 0.0315, 0.0068, 0.0080
        circ_t = lambda x, c, rx, rz, zc: zc + rz * math.sqrt(max(0.0, 1 - ((x - c) / rx) ** 2))
        circ_b = lambda x, c, rx, rz, zc: zc - rz * math.sqrt(max(0.0, 1 - ((x - c) / rx) ** 2))
        ixs = cols(ic - irx * 0.999, ic + irx * 0.999, 14)
        it = lambda x: max(lo(x) + 1e-5, min(up(x), circ_t(x, ic, irx, irz, 0.0022)))
        ib = lambda x: min(it(x), max(lo(x), circ_b(x, ic, irx, irz, 0.0022)))
        fb.band('Iris', 0.0014, {'Basis': (it, ib)}, ixs, 4)
        pc, pr = ic, 0.0027
        pxs = cols(pc - pr * 0.999, pc + pr * 0.999, 8)
        pt = lambda x: min(up(x), circ_t(x, pc, pr, pr * 1.1, 0.0028))
        pb = lambda x: min(pt(x), max(lo(x), circ_b(x, pc, pr, pr * 1.1, 0.0028)))
        fb.band('Liner', 0.0018, {'Basis': (pt, pb)}, pxs, 3)
        hc, hr = ic + s * 0.002, 0.0013
        hxs = cols(hc - hr * 0.999, hc + hr * 0.999, 6)
        fb.band('EyeWhite', 0.0022, {'Basis': (lambda x: circ_t(x, hc, hr, hr, 0.0055), lambda x: circ_b(x, hc, hr, hr, 0.0055))}, hxs, 2)
        # pleoapa (pentru clipit): colapsata sub tus, coboara la 'blink'
        lid_top = lambda x: up(x) + 0.0006
        fb.band('Lid', 0.0026, {'Basis': (lid_top, lambda x: up(x) + 0.0002), 'blink': (lid_top, lambda x: closed(x) - 0.0004)}, xs, 4)
        # tus superior + "wing"
        th = lambda x: 0.0007 + 0.0019 * T(x) ** 0.8
        fb.band('Liner', 0.0031, {'Basis': (lambda x: up(x) + th(x), lambda x: up(x) - 0.0003),
                                  'blink': (lambda x: closed(x) + th(x) * 0.8, lambda x: closed(x) - 0.0005)}, xs, 2)
        W = (0.0575, 0.0118)
        wxs = [s * x for x in cols(O[0] - 0.003, W[0], 8)]
        if s < 0:
            wxs = wxs[::-1]

        def wing_t(x, k=1.0):
            t = (abs(x) - (O[0] - 0.003)) / (W[0] - O[0] + 0.003)
            return lerp(up(s * (O[0] - 0.003)) + th(s * O[0]), W[1], t)

        def wing_b(x):
            t = (abs(x) - (O[0] - 0.003)) / (W[0] - O[0] + 0.003)
            return lerp(up(s * (O[0] - 0.003)) - 0.0003, W[1] - 0.0002, t ** 0.7)
        fb.band('Liner', 0.0031, {'Basis': (wing_t, wing_b),
                                  'blink': (lambda x: wing_t(x) - 0.0035, lambda x: wing_b(x) - 0.0035)}, wxs, 2)
        # gene de jos (linie subtire spre exterior)
        lxs = [s * x for x in cols(I[0] + 0.012, O[0], 8)]
        if s < 0:
            lxs = lxs[::-1]
        fb.band('Liner', 0.0016, {'Basis': (lambda x: lo(x) + 0.0002, lambda x: lo(x) - 0.0007 * T(x))}, lxs, 1)
        # spranceana
        B0, B1 = 0.0105, 0.0515
        bt_ = lambda x: (abs(x) - B0) / (B1 - B0)
        bc = lambda x: 0.0195 + 0.0062 * math.sin(math.pi * min(1, bt_(x) * 0.8 + 0.1)) + 0.003 * bt_(x)
        bth = lambda x: 0.0048 * (1 - bt_(x)) ** 0.7 + 0.0012
        bxs = [s * x for x in cols(B0, B1, 14)]
        if s < 0:
            bxs = bxs[::-1]
        fb.band('Brow', 0.0014, {'Basis': (lambda x: bc(x) + bth(x) * 0.5, lambda x: bc(x) - bth(x) * 0.5),
                                 'brow_up': (lambda x: bc(x) + bth(x) * 0.5 + 0.0055 - 0.0015 * bt_(x), lambda x: bc(x) - bth(x) * 0.5 + 0.0055 - 0.0015 * bt_(x)),
                                 'brow_angry': (lambda x: bc(x) + bth(x) * 0.5 - 0.004 * (1 - bt_(x)), lambda x: bc(x) - bth(x) * 0.5 - 0.004 * (1 - bt_(x)))}, bxs, 2)
        # blush
        bcx = s * 0.043
        bxs2 = cols(bcx - 0.0095, bcx + 0.0095, 10)
        fb.band('Blush', 0.0007, {'Basis': (lambda x: -0.017 + 0.0038 * math.sqrt(max(0, 1 - ((x - bcx) / 0.0095) ** 2)),
                                           lambda x: -0.017 - 0.0038 * math.sqrt(max(0, 1 - ((x - bcx) / 0.0095) ** 2)))}, bxs2, 2)
        # nara
        nx = s * 0.0062
        nxs = cols(nx - 0.0028, nx + 0.0028, 5)
        fb.band('Liner', 0.0010, {'Basis': (lambda x: -0.0305 + 0.0009 * math.sqrt(max(0, 1 - ((x - nx) / 0.0028) ** 2)),
                                            lambda x: -0.0305 - 0.0004)}, nxs, 1)

    # ---- gura ----
    L = 0.0168
    xs = cols(-L, L, 24)
    ml = lambda x, k=1.0: -0.0612 - 0.0011 * (x / L) ** 2

    def mouth(key):
        sx, open_, up_, teeth, smile = {
            'Basis': (1.0, 0.0, 0.0, 0.0, 0.0),
            'mouth_open': (1.0, 0.0115, 0.0008, 0.0032, 0.0),
            'mouth_O': (0.64, 0.0095, 0.0018, 0.0, 0.0),
            'mouth_E': (1.12, 0.0052, 0.0004, 0.0030, 0.0005),
            'smile': (1.08, 0.0, 0.0002, 0.0, 0.0042),
        }[key]
        X = lambda x: x / sx  # coordonata in forma de baza
        m = lambda x: ml(X(x)) + smile * (X(x) / L) ** 2
        e = lambda x: max(0.0, 1 - (X(x) / L) ** 2)
        upper_top = lambda x: m(x) + up_ * e(x) ** 0.5 + 0.0056 * e(x) ** 0.6 - 0.0013 * math.exp(-(X(x) / 0.003) ** 2)
        upper_bot = lambda x: m(x) + up_ * e(x) ** 0.5
        lower_top = lambda x: m(x) - open_ * e(x) ** 0.5
        lower_bot = lambda x: lower_top(x) - 0.0082 * max(0, 1 - (X(x) / (L * 0.93)) ** 2) ** 0.7
        teeth_b = lambda x: upper_bot(x) - min(teeth * e(x) ** 0.4, open_ * e(x) ** 0.5 * 0.6 + 1e-6)
        return upper_top, upper_bot, lower_top, lower_bot, teeth_b
    keys = ['Basis', 'mouth_open', 'mouth_O', 'mouth_E', 'smile']
    M = {k: mouth(k) for k in keys}
    scale = {'Basis': 1.0, 'mouth_open': 1.0, 'mouth_O': 0.64, 'mouth_E': 1.12, 'smile': 1.08}

    def scaled(k, fn):
        return lambda x: fn(x * scale[k])  # xs ale bazei mapate pe forma cheii

    # Pentru shape keys, mutam si x: folosim band separat pe "coordonata de baza" u, cu x = u*scale
    def band_mouth(mat, off, sel, rows):
        kd = {}
        for k in keys:
            fns = M[k]
            t, b = sel(fns)
            sc = scale[k]
            kd[k] = [[(u * sc, lerp(t(u * sc), b(u * sc), r / rows)) for u in xs] for r in range(rows + 1)]
        fb.parts.append((mat, kd, off))
    band_mouth('MouthIn', 0.0009, lambda f: (f[1], f[2]), 3)
    band_mouth('Teeth', 0.0012, lambda f: (f[1], f[4]), 2)
    band_mouth('Lips', 0.0015, lambda f: (f[0], f[1]), 3)
    band_mouth('Lips', 0.0015, lambda f: (f[2], f[3]), 3)
    band_mouth('Liner', 0.0018, lambda f: (lambda x: f[1](x) + 0.00035, lambda x: f[1](x) - 0.00035), 1)
    return fb.build('Alecsia_Face', mats, collection)


# ---------------- PAR ----------------
def build_hair(mb, head_bvh):
    def head_pt(x, y, z, off):
        p = head_shape(x, y, z)
        n = (p - HEAD_C).normalized()
        return p + n * off

    # calota
    rows = head_grid(48, 32)
    nu = len(rows[0])
    zlim_tab = [(0.0, 0.33), (0.7, 0.31), (1.15, 0.29), (1.45, 0.27), (1.75, 0.10), (2.2, -0.45), (3.15, -0.62)]

    def keep(x, y, z):
        ph = abs(math.atan2(x, -y))
        return z > interp_table(zlim_tab, ph)
    outer, inner = [], []
    for row in rows[1:-1]:
        outer.append([head_pt(x, y, z, 0.010 + 0.004 * max(0, z)) for x, y, z in row])
        inner.append([head_pt(x, y, z, 0.0015) for x, y, z in row])
    # fete doar unde "keep"
    nr = len(outer)
    verts = [p for r in outer for p in r] + [p for r in inner for p in r]
    off = nr * nu
    faces = []
    mask = [[keep(*rows[1 + j][i]) for i in range(nu)] for j in range(nr)]
    for j in range(nr - 1):
        for i in range(nu):
            i2 = (i + 1) % nu
            if mask[j][i] and mask[j][i2] and mask[j + 1][i] and mask[j + 1][i2]:
                a, b, c, d = j * nu + i, j * nu + i2, (j + 1) * nu + i2, (j + 1) * nu + i
                faces.append([a, b, c, d])
                faces.append([off + d, off + c, off + b, off + a])
    # capac sus
    topo = head_pt(0, 0, 1, 0.014)
    topi = head_pt(0, 0, 1, 0.0015)
    verts += [topo, topi]
    for i in range(nu):
        i2 = (i + 1) % nu
        a, b = (nr - 1) * nu + i, (nr - 1) * nu + i2
        faces.append([a, b, len(verts) - 2])
        faces.append([off + b, off + a, len(verts) - 1])
    # pereti pe toate muchiile de margine ale calotei
    from collections import Counter
    outer_faces = [fc for fc in faces if all(i < off for i in fc) and len(fc) == 4]
    cnt = Counter()
    for fc in outer_faces:
        for k in range(4):
            a, b = fc[k], fc[(k + 1) % 4]
            cnt[(min(a, b), max(a, b))] += 1
    for fc in outer_faces:
        for k in range(4):
            a, b = fc[k], fc[(k + 1) % 4]
            if cnt[(min(a, b), max(a, b))] == 1:
                faces.append([b, a, off + a, off + b])
    mb.add(verts, faces, 'Hair', {'Head': 1.0})

    # breton franjurat
    xs = [lerp(-0.066, 0.066, i / 36) for i in range(37)]
    ntips = 11

    def bot(x):
        u = (x + 0.066) / 0.132 * ntips
        saw = abs((u % 1) - 0.5) * 2  # 0 la varf
        return 0.028 + 0.009 * saw + 0.012 * (abs(x) / 0.066) ** 3
    g = grid_band(xs, lambda x: 0.085 - 0.02 * (abs(x) / 0.066) ** 2, bot, 9)
    outer, inner = [], []
    for row in g:
        o, i_ = [], []
        for x, z in row:
            hit = head_bvh.ray_cast(V((x, -1, HEAD_C.z + z)), V((0, 1, 0)))
            p, n = (hit[0], hit[1]) if hit[0] else (V((x, -0.08, HEAD_C.z + z)), V((0, -1, 0)))
            n = (n + V((0, -0.6, 0))).normalized()
            o.append(p + n * (0.0115 + 0.002 * (z - 0.03) / 0.06))
            i_.append(p + n * 0.0045)
        outer.append(o)
        inner.append(i_)
    v, f = shell_from_grid(outer, inner)
    mb.add(v, f, 'Hair', {'Head': 1.0})

    def hair_w(p):
        t = smooth((p.z - 1.38) / (1.47 - 1.38))
        if t >= 1:
            return {'Head': 1.0}
        return {'Head': t, 'Chest': 1 - t} if t > 0 else {'Chest': 1.0}

    # suvite laterale (in spatele urechii, cad peste umeri in fata)
    for s in (1, -1):
        path = [V((0.082, 0.032, 1.625)), V((0.095, 0.038, 1.57)), V((0.101, 0.042, 1.51)), V((0.106, 0.048, 1.45)),
                V((0.118, 0.062, 1.40)), V((0.132, 0.082, 1.35)), V((0.138, 0.10, 1.30)), V((0.136, 0.115, 1.25)), V((0.13, 0.12, 1.19))]
        path = [V((p.x * s, p.y, p.z)) for p in path]
        widths = [0.03, 0.036, 0.04, 0.043, 0.046, 0.048, 0.046, 0.04, 0.02]
        thick = [0.01, 0.012, 0.013, 0.013, 0.012, 0.011, 0.01, 0.009, 0.008]
        cols_n = 9
        outer, inner = [], []
        for k, p in enumerate(path):
            tan = (path[min(k + 1, len(path) - 1)] - path[max(k - 1, 0)]).normalized()
            radial = V((p.x, p.y - 0.01, 0)).normalized()
            wdir = tan.cross(radial).normalized()
            o, i_ = [], []
            for c in range(cols_n):
                u = c / (cols_n - 1) * 2 - 1
                q = p + wdir * (u * widths[k]) + radial * (-0.006 * u * u)
                if k == len(path) - 1:
                    q = q + V((0, 0, 0.02 * abs(u)))
                lens = (1 - u * u) ** 0.5 * 0.8 + 0.2
                qo = push_out(q + radial * thick[k] * 0.5 * lens, margin=0.006, head=k < 4)
                qi = push_out(q - radial * thick[k] * 0.5 * lens, margin=0.002, head=k < 4)
                if (qo - qi).dot(radial) < 0.004:
                    qo = qi + radial * 0.006
                o.append(qo)
                i_.append(qi)
            outer.append(o)
            inner.append(i_)
        v, f = shell_from_grid(outer, inner)
        mb.add(v, f, 'Hair', hair_w)

    # masa de par din spate
    path = [V((0, 0.075, 1.64)), V((0, 0.105, 1.58)), V((0, 0.115, 1.51)), V((0, 0.115, 1.44)), V((0, 0.13, 1.38)),
            V((0, 0.148, 1.31)), V((0, 0.152, 1.23)), V((0, 0.152, 1.16)), V((0, 0.15, 1.11))]
    hw = [0.075, 0.092, 0.096, 0.098, 0.104, 0.112, 0.118, 0.12, 0.12]
    thick = [0.02, 0.026, 0.026, 0.024, 0.022, 0.02, 0.018, 0.016, 0.012]
    cols_n = 15
    outer, inner = [], []
    for k, p in enumerate(path):
        o, i_ = [], []
        for c in range(cols_n):
            u = c / (cols_n - 1) * 2 - 1
            q = V((u * hw[k], p.y - 0.05 * u * u, p.z))
            if k == len(path) - 1:
                q.z += 0.03 * abs(math.sin(u * math.pi * 2.5)) ** 0.7
            radial = V((q.x * 0.6, q.y - 0.0, 0)).normalized()
            qo = push_out(q + radial * thick[k] * 0.5, margin=0.01)
            qi = push_out(q - radial * thick[k] * 0.5, margin=0.003)
            if (qo - qi).dot(radial) < 0.006:
                qo = qi + radial * 0.008
            o.append(qo)
            i_.append(qi)
        outer.append(o)
        inner.append(i_)
    v, f = shell_from_grid(outer, inner)

    def back_w(p):
        if p.z > 1.53:
            return {'Head': 1.0}
        return auto_weights(['Head', 'HairBack1', 'HairBack2'], k=4)(p)
    mb.add(v, f, 'Hair', back_w)


# ---------------- CASTI ----------------
def build_headphones(mb):
    w = {'Chest': 0.75, 'Neck': 0.25}
    for s in (1, -1):
        c = push_out(V((0.078 * s, -0.05, 1.392)), margin=0.03, head=False)
        ax = V((0.5 * s, -0.78, 0.38)).normalized()
        fx, fy, fz = frame_for(ax, V((0, 0, 1)))
        rings = [ring(c + ax * d, fx, fy, r, r * 1.08, n=28) for d, r in [(-0.016, .028), (-0.013, .035), (0.004, .038), (0.012, .036), (0.016, .030)]]
        v, f = loft(rings)
        mb.add(v, f, 'Phones', w)
        # placa exterioara
        rings = [ring(c + ax * d, fx, fy, r, r * 1.08, n=24) for d, r in [(0.0155, .022), (0.0185, .021), (0.0195, .016)]]
        v, f = loft(rings)
        mb.add(v, f, 'PhonesLight', w)
        # perna (spre interior)
        rings = [ring(c + ax * d, fx, fy, r, r * 1.08, n=24) for d, r in [(-0.023, .024), (-0.02, .031), (-0.015, .033)]]
        v, f = loft(rings)
        mb.add(v, f, 'PhonesDark', w)
    # banda in spatele gatului
    path = []
    for i in range(17):
        t = i / 16
        a = lerp(-1, 1, t)
        x = 0.084 * math.sin(a * 1.45)
        y = -0.042 + 0.13 * (1 - abs(a) ** 1.6) ** 0.8 * 1.0
        z = 1.405 + 0.03 * (1 - abs(a) ** 2)
        path.append(push_out(V((x, y, z)), margin=0.004, head=False, hood=False))
    v, f = tube(path, 0.0075, n=10, flat=0.6)
    mb.add(v, f, 'Phones', w)


# ---------------- ANSAMBLARE ----------------
def build_armature(collection):
    arm = bpy.data.armatures.new('Alecsia_Rig')
    ob = bpy.data.objects.new('Alecsia_Rig', arm)
    collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT')
    for name, (h, t, parent) in BONES.items():
        eb = arm.edit_bones.new(name)
        eb.head, eb.tail = h, t
        eb.roll = 0.0
    for name, (h, t, parent) in BONES.items():
        if parent:
            eb = arm.edit_bones[name]
            eb.parent = arm.edit_bones[parent]
            eb.use_connect = (eb.parent.tail - eb.head).length < 1e-4
    for eb in arm.edit_bones:
        eb.align_roll(V((0, -1, 0)) if abs(eb.vector.normalized().y) < 0.9 else V((0, 0, 1)))
    bpy.ops.object.mode_set(mode='OBJECT')
    arm.display_type = 'STICK'
    return ob


def build_character(collection):
    mats = materials()
    rig = build_armature(collection)
    body = MeshBuilder()
    build_torso(body, mats)
    # BVH al torsului pentru buzunar
    tv = [p for p in body.v]
    tf = [f for f, m in zip(body.f, body.fm) if body.mats[m] == 'Hoodie']
    torso_bvh = BVHTree.FromPolygons([tuple(p) for p in tv], tf)
    build_pocket(body, torso_bvh)
    build_hood(body)
    for s in 'LR':
        build_arm(body, s)
        build_leg(body, s)
    build_pelvis(body)
    build_carry_laptop(body)
    head_bvh = build_head(body)
    build_hair(body, head_bvh)
    build_headphones(body)
    body_ob = body.build('Alecsia_Body', mats, collection)
    face_ob = build_face(head_bvh, mats, collection)
    for ob in (body_ob, face_ob):
        ob.parent = rig
        mod = ob.modifiers.new('Armature', 'ARMATURE')
        mod.object = rig
    return rig, body_ob, face_ob, mats
