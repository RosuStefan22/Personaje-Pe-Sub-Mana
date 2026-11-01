"""Recuzita 3D: masina (hatchback stilizat, cu usa/roti/volan animabile), birou + scaun + laptop deschis,
si laptopul inchis cu stickere (folosit de personaj)."""
import math
import bpy
from mathutils import Vector as V, Matrix, Euler
from common import *

PCOL = {
    'CarPaint': '3E7C86', 'CarPaintDark': '2D5F68', 'CarTrim': '23252B', 'CarGlass': 'A9D2E0', 'Chrome': 'C9CED6',
    'Tire': '1D1D22', 'Rim': '9EA4AE', 'HeadLight': 'F3E6B5', 'TailLight': 'C8343A', 'Seat': '3A3640', 'Dash': '2B2A31',
    'Wood': '6B4F3A', 'WoodDark': '4E392A', 'ChairDark': '2F2E38', 'ChairMetal': '77767F',
    'Laptop': '3B3C42', 'LaptopDark': '26272C', 'Screen': '9FD3FF',
    'StickRed': 'E0484C', 'StickBlue': '4FA3D9', 'StickGreen': '9CC94A', 'StickPurple': '7A5CC4', 'StickOrange': 'F08A2A', 'StickTeal': '3DBE9A', 'StickBone': 'E9E6E0',
}

# geometria masinii (coordonate locale; botul spre -Y, partea soferului = +X)
CAR = dict(
    half_w=0.86, hinge=V((0.865, -0.55, 0.0)), door_len=1.05, door_max=65.0,
    seat=V((0.36, 0.14, 0.50)), steer=V((0.36, -0.33, 0.96)), steer_r=0.18,
    pedal=V((0.36, -0.80, 0.30)), wheels=[(0.79, -1.25), (-0.79, -1.25), (0.79, 1.25), (-0.79, 1.25)], wheel_r=0.30,
    handle_out=V((0.885, 0.36, 0.90)), handle_in=V((0.80, -0.18, 0.84)),
)
CAR_POS = V((-1.25, 0.0, 0.0))  # pozitia masinii in scena (fata de originea personajului)
DESK = dict(front_y=-0.20, top_z=0.74, chair=V((0.0, 0.10, 0.0)), seat_z=0.47, laptop=V((0.0, -0.36, 0.75)))


def mats_for(names):
    out = {}
    for n in names:
        h = PCOL[n]
        if n == 'CarGlass':
            out[n] = make_material('PRP_' + n, h, rough=0.1, alpha=0.32, double=True)
        elif n == 'Screen':
            out[n] = make_material('PRP_' + n, h, rough=0.3, emission=h)
        else:
            out[n] = make_material('PRP_' + n, h, rough=0.5 if n in ('CarPaint', 'CarPaintDark', 'Chrome') else 0.8)
    return out


def obj(name, parts, mats, parent=None, collection=None, origin=V((0, 0, 0)), basis=None):
    """Creeaza un obiect; varfurile sunt date in sistemul parintelui, originea obiectului = origin."""
    mb = MeshBuilder()
    for v, f, m in parts:
        mb.add([V(p) - origin for p in v], f, m, None, smooth=True)
    ob = mb.build(name, mats, collection)
    if parent:
        ob.parent = parent
    ob.matrix_basis = basis if basis is not None else Matrix.Translation(origin)
    return ob


def P(gen, mat):
    v, f = gen
    return (v, f, mat)


def slant_box(y0, z0, y1, z1, x0, x1, t):
    """Placa inclinata (stalp / geam) de la (y0,z0) la (y1,z1), intre x0..x1, grosime t (perpendicular in planul YZ)."""
    a, b = V((0, y0, z0)), V((0, y1, z1))
    d = (b - a)
    n = V((0, -d.z, d.y)).normalized() * (t / 2)
    vs = []
    for x in (x0, x1):
        for p in (a - n, a + n, b + n, b - n):
            vs.append(V((x, p.y, p.z)))
    faces = [[0, 1, 2, 3], [7, 6, 5, 4], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]]
    return vs, faces


def build_car(collection):
    names = ['CarPaint', 'CarPaintDark', 'CarTrim', 'CarGlass', 'Chrome', 'Tire', 'Rim', 'HeadLight', 'TailLight', 'Seat', 'Dash']
    M = mats_for(names)
    root = bpy.data.objects.new('Car', None)
    collection.objects.link(root)
    root.location = CAR_POS
    W = CAR['half_w']
    parts = []
    # bot (capota) si spate
    parts.append(P(rbox(V((0, -1.45, 0.60)), (2 * W, 1.0, 0.60), n=6), 'CarPaint'))
    parts.append(P(rbox(V((0, -1.86, 0.48)), (2 * W - 0.06, 0.2, 0.30), n=6), 'CarTrim'))      # bara fata
    parts.append(P(rbox(V((0, 1.22, 0.62)), (2 * W, 1.46, 0.66), n=6), 'CarPaint'))
    parts.append(P(rbox(V((0, 1.88, 0.46)), (2 * W - 0.06, 0.18, 0.30), n=6), 'CarTrim'))      # bara spate
    # aripi fata (intre capota si usa) + bord
    for s in (1, -1):
        parts.append(P(box(V((s * (W - 0.03), -0.75, 0.62)), (0.06, 0.42, 0.66)), 'CarPaint'))
        parts.append(P(box(V((s * (W - 0.03), 0.02, 0.62)), (0.06, 1.1, 0.66)), 'CarPaint') if s < 0 else P(box(V((s * (W - 0.06), -0.02, 0.31)), (0.12, 1.08, 0.18)), 'CarPaint'))
    parts.append(P(box(V((0, -0.78, 0.86)), (2 * W - 0.12, 0.36, 0.16)), 'Dash'))
    parts.append(P(box(V((0, -0.2, 0.26)), (2 * W - 0.04, 1.6, 0.08)), 'Dash'))              # podea
    # stalpi, acoperis, geamuri
    parts.append(P(box(V((0, 0.58, 1.43)), (2 * W - 0.2, 1.46, 0.07)), 'CarPaint'))          # acoperis
    for s in (1, -1):
        parts.append(P(slant_box(-0.95, 0.95, -0.15, 1.42, s * (W - 0.07) - 0.035, s * (W - 0.07) + 0.035, 0.06), 'CarPaint'))  # stalp A
        parts.append(P(box(V((s * (W - 0.07), 0.53, 1.18)), (0.07, 0.09, 0.5)), 'CarPaint'))   # stalp B
        parts.append(P(slant_box(1.30, 1.42, 1.86, 0.96, s * (W - 0.07) - 0.04, s * (W - 0.07) + 0.04, 0.08), 'CarPaint'))   # stalp C
        parts.append(P(box(V((s * (W - 0.05), 1.06, 1.18)), (0.02, 0.98, 0.42)), 'CarGlass'))  # geam lateral spate
    parts.append(P(slant_box(-0.95, 0.95, -0.15, 1.42, -(W - 0.1), W - 0.1, 0.012), 'CarGlass'))   # parbriz
    parts.append(P(slant_box(1.30, 1.42, 1.86, 0.96, -(W - 0.1), W - 0.1, 0.012), 'CarGlass'))     # luneta
    parts.append(P(box(V((-(W - 0.05), 0.0, 1.17)), (0.02, 1.0, 0.42)), 'CarGlass'))            # geam pasager
    # lumini, oglinzi
    for s in (1, -1):
        parts.append(P(rbox(V((s * 0.62, -1.93, 0.72)), (0.32, 0.06, 0.12), n=4), 'HeadLight'))
        parts.append(P(rbox(V((s * 0.66, 1.94, 0.80)), (0.22, 0.05, 0.16), n=4), 'TailLight'))
        parts.append(P(rbox(V((s * (W + 0.07), -0.62, 1.0)), (0.12, 0.06, 0.08), n=4), 'CarPaint'))
    # scaune
    for s in (1, -1):
        sx = s * CAR['seat'].x
        parts.append(P(rbox(V((sx, 0.16, 0.44)), (0.48, 0.52, 0.12), n=4), 'Seat'))
        parts.append(P(slant_box(0.40, 0.48, 0.50, 1.10, sx - 0.24, sx + 0.24, 0.11), 'Seat'))
        parts.append(P(rbox(V((sx, 0.52, 1.20)), (0.26, 0.09, 0.15), n=4), 'Seat'))
        parts.append(P(box(V((sx, 0.16, 0.34)), (0.3, 0.3, 0.1)), 'Dash'))
    parts.append(P(rbox(V((0, 1.05, 0.48)), (1.5, 0.5, 0.14), n=4), 'Seat'))
    parts.append(P(slant_box(1.30, 0.5, 1.40, 1.05, -0.75, 0.75, 0.1), 'Seat'))
    # coloana volanului
    st = CAR['steer']
    parts.append(P(tube([st + V((0, -0.02, -0.02)), st + V((0, -0.32, -0.16))], 0.025, n=10), 'Dash'))
    body = obj('CarBody', parts, M, parent=root, collection=collection)
    # volan (obiect separat, roteste in jurul axei sale locale Z)
    sw_parts = []
    n_ax = V((0, 0.85, 0.53)).normalized()
    fx, fy, fz = frame_for(n_ax, V((1, 0, 0)))
    ring_pts = [V((math.cos(a) * CAR['steer_r'], math.sin(a) * CAR['steer_r'], 0)) for a in [2 * math.pi * i / 32 for i in range(33)]]
    v, f = tube(ring_pts, 0.022, n=10)
    sw_parts.append((v, f, 'CarTrim'))
    for a in (90, 210, 330):
        r = math.radians(a)
        v, f = tube([V((0, 0, 0)), V((math.cos(r) * CAR['steer_r'], math.sin(r) * CAR['steer_r'], 0))], 0.014, n=6)
        sw_parts.append((v, f, 'Dash'))
    v, f = ellipsoid(V((0, 0, 0)), (V((0.05, 0, 0)), V((0, 0.05, 0)), V((0, 0, 0.025))), 12, 6)
    sw_parts.append((v, f, 'Dash'))
    mb = MeshBuilder()
    for v, f, m in sw_parts:
        mb.add(v, f, m, None)
    sw = mb.build('SteeringWheel', M, collection)
    sw.parent = body
    sw.matrix_basis = Matrix.Translation(st) @ Matrix((fx, fy, fz)).transposed().to_4x4()
    # usa soferului (pivot in balama)
    h = CAR['hinge']
    L_ = CAR['door_len']
    dparts = []
    dparts.append(P(rbox(V((h.x - 0.03, h.y + L_ / 2, 0.64)), (0.07, L_, 0.66), n=5), 'CarPaint'))
    dparts.append(P(box(V((h.x - 0.075, h.y + L_ / 2, 0.64)), (0.02, L_ - 0.06, 0.6)), 'CarPaintDark'))   # interior usa
    dparts.append(P(slant_box(-0.55, 0.97, -0.15, 1.40, h.x - 0.07, h.x - 0.01, 0.055), 'CarPaint'))       # rama fata
    dparts.append(P(box(V((h.x - 0.04, 0.03, 1.405)), (0.06, 0.38, 0.05)), 'CarPaint'))                   # rama sus
    dparts.append(P(box(V((h.x - 0.04, h.y + L_ - 0.03, 1.18)), (0.06, 0.05, 0.48)), 'CarPaint'))         # rama spate
    dparts.append(P(box(V((h.x - 0.04, 0.0, 1.18)), (0.015, 0.95, 0.42)), 'CarGlass'))
    dparts.append(P(rbox(CAR['handle_out'], (0.03, 0.12, 0.03), n=4), 'Chrome'))
    dparts.append(P(rbox(CAR['handle_in'], (0.03, 0.10, 0.03), n=4), 'Chrome'))
    door = obj('CarDoor', dparts, M, parent=body, collection=collection, origin=h)
    # rotile
    wheels = []
    for i, (x, y) in enumerate(CAR['wheels']):
        wp = []
        rings = [ring(V((0, 0, 0)) + V((1, 0, 0)) * dx, V((0, 1, 0)), V((0, 0, 1)), r, r, n=28) for dx, r in [(-0.1, .27), (-0.09, .30), (0.09, .30), (0.1, .27)]]
        v, f = loft(rings)
        wp.append((v, f, 'Tire'))
        sx = 1 if x > 0 else -1
        v, f = loft([ring(V((sx * dx, 0, 0)), V((0, 1, 0)), V((0, 0, 1)), r, r, n=20) for dx, r in [(0.095, .19), (0.105, .17), (0.105, .05)]])
        wp.append((v, f, 'Rim'))
        for k in range(5):
            a = 2 * math.pi * k / 5
            v, f = box(V((sx * 0.106, math.cos(a) * 0.1, math.sin(a) * 0.1)), (0.01, 0.04, 0.16),
                       frame=(V((1, 0, 0)), V((0, math.cos(a + math.pi / 2), math.sin(a + math.pi / 2))), V((0, math.cos(a), math.sin(a)))))
            wp.append((v, f, 'Dash'))
        mb = MeshBuilder()
        for v, f, m in wp:
            mb.add(v, f, m, None)
        w = mb.build(f'Wheel_{"FL FR RL RR".split()[i]}', M, collection)
        w.parent = root
        w.location = V((x, y, CAR['wheel_r']))
        wheels.append(w)
    return root, body, door, sw, wheels


def laptop_parts(center, fw, fh, fn, w=0.32, h=0.22, t=0.018):
    """Laptop inchis: fw = axa latimii, fh = axa inaltimii, fn = normala capacului (spre stickere)."""
    parts = []
    c = V(center)
    parts.append(P(rbox(c, (w, h, t), n=4, frame=(fw, fh, fn)), 'Laptop'))
    parts.append(P(box(c - fn * (t * 0.25), (w * 1.002, h * 1.002, t * 0.22), frame=(fw, fh, fn)), 'LaptopDark'))
    # stickere pe capac
    stick = [(-0.10, 0.05, 'StickBone', 'skull'), (-0.03, 0.06, 'StickRed', 'tri'), (0.06, 0.055, 'StickBlue', 'dia'),
             (-0.10, -0.05, 'StickGreen', 'circ'), (0.01, -0.01, 'StickPurple', 'tri'), (0.10, -0.05, 'StickOrange', 'rect'),
             (-0.035, -0.065, 'StickTeal', 'dia'), (0.11, 0.06, 'StickRed', 'circ')]
    top = c + fn * (t / 2 + 0.0012)
    for x, y, m, kind in stick:
        o = top + fw * x + fh * y
        if kind == 'circ':
            pts = [ring(o, fw, fh, 0.018, 0.018, n=16), ring(o + fn * 0.0015, fw, fh, 0.018, 0.018, n=16)]
        elif kind == 'rect':
            pts = [ring(o, fw, fh, 0.026, 0.016, n=16, p=6), ring(o + fn * 0.0015, fw, fh, 0.026, 0.016, n=16, p=6)]
        elif kind == 'dia':
            pts = [ring(o, fw, fh, 0.018, 0.024, n=4, p=2, phase=0), ring(o + fn * 0.0015, fw, fh, 0.018, 0.024, n=4, p=2, phase=0)]
        elif kind == 'skull':
            pts = [ring(o, fw, fh, 0.02, 0.022, n=16, p=2.6), ring(o + fn * 0.0015, fw, fh, 0.02, 0.022, n=16, p=2.6)]
        else:
            pts = [ring(o, fw, fh, 0.022, 0.022, n=3, p=2, phase=math.pi / 2), ring(o + fn * 0.0015, fw, fh, 0.022, 0.022, n=3, p=2, phase=math.pi / 2)]
        v, f = loft(pts)
        parts.append((v, f, m))
        if kind == 'skull':
            for ex in (-0.007, 0.007):
                e = o + fn * 0.0025 + fw * ex + fh * 0.002
                v, f = loft([ring(e, fw, fh, 0.0045, 0.005, n=10), ring(e + fn * 0.001, fw, fh, 0.0045, 0.005, n=10)])
                parts.append((v, f, 'LaptopDark'))
    return parts


def build_desk(collection):
    names = ['Wood', 'WoodDark', 'ChairDark', 'ChairMetal', 'Laptop', 'LaptopDark', 'Screen',
             'StickRed', 'StickBlue', 'StickGreen', 'StickPurple', 'StickOrange', 'StickTeal', 'StickBone']
    M = mats_for(names)
    root = bpy.data.objects.new('DeskSet', None)
    collection.objects.link(root)
    fy, tz = DESK['front_y'], DESK['top_z']
    parts = []
    parts.append(P(box(V((0, fy - 0.33, tz - 0.02)), (1.3, 0.66, 0.04)), 'Wood'))
    for x in (-0.6, 0.6):
        for y in (fy - 0.05, fy - 0.61):
            parts.append(P(box(V((x, y, (tz - 0.04) / 2)), (0.05, 0.05, tz - 0.04)), 'WoodDark'))
    parts.append(P(box(V((0.42, fy - 0.33, tz - 0.12)), (0.36, 0.6, 0.14)), 'Wood'))
    parts.append(P(box(V((0.42, fy - 0.025, tz - 0.12)), (0.12, 0.012, 0.02)), 'WoodDark'))
    # scaun de birou
    c = DESK['chair']
    sz = DESK['seat_z']
    parts.append(P(rbox(V((c.x, c.y, sz - 0.04)), (0.48, 0.48, 0.08), n=5), 'ChairDark'))
    parts.append(P(slant_box(c.y + 0.24, sz + 0.02, c.y + 0.32, sz + 0.62, c.x - 0.22, c.x + 0.22, 0.07), 'ChairDark'))
    parts.append(P(tube([V((c.x, c.y, 0.08)), V((c.x, c.y, sz - 0.08))], 0.025, n=10), 'ChairMetal'))
    for k in range(5):
        a = 2 * math.pi * k / 5
        e = V((c.x + math.cos(a) * 0.28, c.y + math.sin(a) * 0.28, 0.06))
        parts.append(P(tube([V((c.x, c.y, 0.08)), e], 0.018, n=8), 'ChairMetal'))
        parts.append(P(ellipsoid(e - V((0, 0, 0.03)), (V((0.03, 0, 0)), V((0, 0.03, 0)), V((0, 0, 0.03))), 10, 6), 'ChairDark'))
    # laptop deschis
    L = DESK['laptop']
    parts.append(P(rbox(L + V((0, 0, 0.009)), (0.32, 0.22, 0.018), n=4), 'Laptop'))
    parts.append(P(box(L + V((0, 0.02, 0.0185)), (0.27, 0.11, 0.002)), 'LaptopDark'))
    hinge = L + V((0, -0.11, 0.018))
    fh = V((0, -0.26, 0.966)).normalized()   # capacul deschis ~105 grade, inclinat spre spate (-Y)
    fn = V((0, -0.966, -0.26)).normalized()  # normala capacului (spatele cu stickere, spre -Y)
    lid_c = hinge + fh * 0.11
    parts += laptop_parts(lid_c, V((1, 0, 0)), fh, fn)
    parts.append(P(box(lid_c - fn * 0.0102, (0.29, 0.19, 0.002), frame=(V((1, 0, 0)), fh, fn)), 'Screen'))
    ob = obj('Desk', parts, M, parent=root, collection=collection)
    return root

