"""Animatiile Alecsiei 3D. Pozele se descriu cu rotatii 'delta' in axele personajului
(X = stanga ei, Y = spate, Z = sus), compuse ierarhic; IK analitic pe 2 oase pentru brate/picioare.
"""
import math
from mathutils import Vector as V, Quaternion as Q, Matrix
from alecsia_model import BONES
import props_model as PM

FPS = 30
ORDER = list(BONES.keys())
sin, cos, pi = math.sin, math.cos, math.pi


def Rx(d): return Q((1, 0, 0), math.radians(d))
def Ry(d): return Q((0, 1, 0), math.radians(d))
def Rz(d): return Q((0, 0, 1), math.radians(d))
def AA(ax, d): return Q(V(ax).normalized(), math.radians(d))


def lerp(a, b, t): return a + (b - a) * t
def clamp(x, a, b): return max(a, min(b, x))
def ease(t): t = clamp(t, 0, 1); return t * t * (3 - 2 * t)
def ease_out(t): t = clamp(t, 0, 1); return 1 - (1 - t) ** 2
def ease_in(t): t = clamp(t, 0, 1); return t * t
def seg(t, a, b, fn=ease): return fn((t - a) / (b - a)) if b > a else float(t >= b)


def keys(tab, t, fn=ease):
    """tab: [(t, valoare|tuplu)], interpolare cu easing."""
    if t <= tab[0][0]:
        return tab[0][1]
    for (t0, a), (t1, b) in zip(tab, tab[1:]):
        if t0 <= t <= t1:
            u = fn((t - t0) / (t1 - t0))
            if isinstance(a, (tuple, list)):
                return tuple(lerp(x, y, u) for x, y in zip(a, b))
            return lerp(a, b, u)
    return tab[-1][1]


REST_DIR = {b: (BONES[b][1] - BONES[b][0]).normalized() for b in BONES}
SIDES = {'L': 1, 'R': -1}
ELBOW_AX, CURL_AX, PALM_IN = {}, {}, {}
for s, sg in SIDES.items():
    fd = REST_DIR['ForeArm.' + s]
    ELBOW_AX[s] = fd.cross(V((0, -1, 0))).normalized()
    hd = REST_DIR['Hand.' + s]
    n_out = hd.cross(V((0, 1, 0))).normalized() if sg > 0 else V((0, 1, 0)).cross(hd).normalized()
    PALM_IN[s] = -n_out
    CURL_AX[s] = hd.cross(PALM_IN[s]).normalized()
KNEE_AX = V((1, 0, 0))


class Pose:
    def __init__(self):
        self.D = {b: Q() for b in BONES}
        self.loc = V((0, 0, 0))
        self.face = {}
        self.laptop = False

    def pre(self, b, q):
        self.D[b] = q @ self.D[b]
        return self

    def post(self, b, q):
        self.D[b] = self.D[b] @ q
        return self


def fk(p):
    W, H = {}, {}
    for b in ORDER:
        h0, t0, par = BONES[b]
        if par is None:
            W[b] = p.D[b].copy()
            H[b] = h0.copy()
        else:
            W[b] = W[par] @ p.D[b]
            H[b] = H[par] + W[par] @ (h0 - BONES[par][0])
            if b == 'Hips':
                H[b] = H[b] + p.loc
    return W, H


def world_pt(W, H, b, rest_pt):
    return H[b] + W[b] @ (V(rest_pt) - BONES[b][0])


def sole_points(W, H):
    pts = []
    for s, sg in SIDES.items():
        x = 0.10 * sg
        pts.append(world_pt(W, H, 'Foot.' + s, (x, 0.07, 0.0)))
        pts.append(world_pt(W, H, 'Foot.' + s, (x, -0.07, 0.0)))
        pts.append(world_pt(W, H, 'Toe.' + s, (x, -0.185, 0.003)))
    return pts


def ground(p, lift=0.0, z=0.0):
    W, H = fk(p)
    zmin = min(q.z for q in sole_points(W, H))
    p.loc.z += z + lift - zmin
    return p


def _frame(u, a):
    a = (a - u * a.dot(u)).normalized()
    return Matrix((u, a, u.cross(a))).transposed()


def ik(p, limb, target, pole, extra=0.0):
    """limb: 'arm.L' / 'arm.R' / 'leg.L' / 'leg.R'. target = pozitia capatului bratului/gleznei."""
    kind, s = limb.split('.')
    up, lo = ('UpperArm.' + s, 'ForeArm.' + s) if kind == 'arm' else ('UpLeg.' + s, 'Leg.' + s)
    ax0 = ELBOW_AX[s] if kind == 'arm' else KNEE_AX
    W, H = fk(p)
    par = BONES[up][2]
    S = H[up]
    L1 = (BONES[up][1] - BONES[up][0]).length
    L2 = (BONES[lo][1] - BONES[lo][0]).length + extra
    d = V(target) - S
    D = clamp(d.length, abs(L1 - L2) + 1e-4, L1 + L2 - 1e-4)
    dn = d.normalized()
    a = (L1 * L1 - L2 * L2 + D * D) / (2 * D)
    h = math.sqrt(max(0.0, L1 * L1 - a * a))
    pv = V(pole) - dn * V(pole).dot(dn)
    if pv.length < 1e-6:
        pv = V((0, 1, 0)) - dn * dn.y
    pv.normalize()
    J = S + dn * a + pv * h
    u1 = (J - S).normalized()
    l1 = (S + dn * D - J).normalized()
    a1 = u1.cross(l1)
    if a1.length < 1e-5:
        a1 = W[par] @ ax0
    a1.normalize()
    u0, l0 = REST_DIR[up], REST_DIR[lo]
    Wu = (_frame(u1, a1) @ _frame(u0, ax0).transposed()).to_quaternion()
    Wl = (_frame(l1, a1) @ _frame(l0, ax0).transposed()).to_quaternion()
    p.D[up] = W[par].inverted() @ Wu
    p.D[lo] = Wu.inverted() @ Wl
    return p


def orient(p, bone, dir_w, normal_w, rest_dir, rest_normal):
    """Seteaza osul astfel incat directia/normala lui sa ajunga pe dir_w/normal_w (in lume)."""
    W, H = fk(p)
    par = BONES[bone][2]
    Wd = (_frame(V(dir_w).normalized(), V(normal_w)) @ _frame(rest_dir, rest_normal).transposed()).to_quaternion()
    p.D[bone] = W[par].inverted() @ Wd


def hand_orient(p, s, dir_w, palm_w):
    orient(p, 'Hand.' + s, dir_w, palm_w, REST_DIR['Hand.' + s], PALM_IN[s])


def foot_flat(p, s, yaw=0.0, pitch=0.0):
    """Talpa paralela cu solul, orientata dupa 'yaw' (grade, 0 = spre -Y)."""
    W, H = fk(p)
    target = Rz(yaw) @ Rx(-pitch)
    p.D['Foot.' + s] = W['Leg.' + s].inverted() @ target


def ankle_rest(s):
    return BONES['Foot.' + s][0].copy()


# ---------------- elemente comune ----------------
def elbow(s, d): return AA(ELBOW_AX[s], d)
def curl(s, d): return AA(CURL_AX[s], d)


def arms_relaxed(p, add=26.0, el=10.0, fingers=18.0):
    for s, sg in SIDES.items():
        p.pre('UpperArm.' + s, Ry(sg * add))
        p.pre('ForeArm.' + s, elbow(s, el))
        p.pre('Hand.' + s, curl(s, 6))
        p.pre('Fingers.' + s, curl(s, fingers))


def arm_swing(p, s, fwd):
    p.pre('UpperArm.' + s, Rx(-fwd))


def blink(t, period=3.4, off=0.0):
    ph = (t + off) % period
    if ph < 0.06:
        return ph / 0.06
    if ph < 0.16:
        return 1.0 - (ph - 0.06) / 0.10
    return 0.0


MOUTH_SEQ = ['closed', 'small', 'wide', 'o', 'small', 'e', 'wide', 'closed', 'small', 'e', 'o', 'small']
MOUTH_W = {'closed': {}, 'small': {'mouth_open': 0.35}, 'wide': {'mouth_open': 0.85}, 'o': {'mouth_O': 0.85},
           'e': {'mouth_E': 0.85, 'mouth_open': 0.15}}


def talk_mouth(t, rate=9.0):
    def shape(i):
        pause = (int(i / rate / 1.7) % 3 == 2) and ((i / rate) % 1.7 > 1.25)
        return 'closed' if pause else MOUTH_SEQ[(i * 7) % len(MOUTH_SEQ)]
    x = t * rate
    i = int(math.floor(x))
    u = ease(min(1.0, (x - i) * 2.2))
    a, b = MOUTH_W[shape(i - 1)], MOUTH_W[shape(i)]
    out = {}
    for k in set(a) | set(b):
        out[k] = lerp(a.get(k, 0.0), b.get(k, 0.0), u)
    return out


def hair_follow(p, amount=0.0, side=0.0):
    p.pre('HairBack1', Rx(amount * 0.6) @ Ry(side * 0.5))
    p.pre('HairBack2', Rx(amount * 0.4) @ Ry(side * 0.5))


def stand_pose():
    p = Pose()
    arms_relaxed(p)
    p.pre('Spine', Rx(1.0))
    p.pre('Neck', Rx(-1.0))
    return p


def plant(p, feet=None, yaw=0.0):
    """Picioarele la glezne fixe (IK) si talpi pe sol."""
    for s in 'LR':
        tgt = feet[s] if feet else ankle_rest(s)
        ik(p, 'leg.' + s, tgt, pole=Rz(yaw) @ V((0.08 * SIDES[s], -1, 0)))
        foot_flat(p, s, yaw)


# ---------------- ciclu de mers / alergat (pe loc) ----------------
def walk_pose(t, T=1.1, laptop=False, yaw=0.0):
    f = 2 * pi * t / T
    p = Pose()
    p.pre('Hips', Rz(yaw))
    for s, ph in (('L', f), ('R', f + pi)):
        sw = max(0.0, cos(ph + 0.75)) ** 1.6
        load = max(0.0, cos(ph - 2.1))
        p.pre('UpLeg.' + s, Rx(-(3 + 24 * sin(ph))))
        p.pre('Leg.' + s, Rx(5 + 52 * sw + 8 * load))
        p.pre('Foot.' + s, Rx(-(9 * sin(ph) - 2 + 10 * sw)))
        p.pre('Toe.' + s, Rx(-(14 * max(0.0, -sin(ph)) * (1 - sw))))
    arms_relaxed(p, add=24)
    swL = -20 * sin(f) - 2
    arm_swing(p, 'L', swL)
    p.pre('ForeArm.L', elbow('L', 20 * max(0.0, -sin(f))))
    if laptop:
        p.D['UpperArm.R'] = Ry(-24) @ Rx(-(3 + 2 * sin(f)))
        p.D['ForeArm.R'] = elbow('R', 16)
        p.D['Hand.R'] = elbow('R', -16)
        p.D['Fingers.R'] = curl('R', 70)
        p.laptop = True
    else:
        arm_swing(p, 'R', -swL - 4)
        p.pre('ForeArm.R', elbow('R', 20 * max(0.0, sin(f))))
    p.pre('Hips', Rz(-5 * sin(f)) @ Ry(2.0 * cos(2 * f)))
    p.pre('Spine', Rx(3) @ Rz(3 * sin(f)))
    p.pre('Chest', Rx(1.5 + 1.2 * cos(2 * f)) @ Rz(4 * sin(f)))
    p.pre('Neck', Rx(-2))
    p.pre('Head', Rx(-2 + 1.0 * cos(2 * f + 0.4)) @ Rz(-1.5 * sin(f)))
    hair_follow(p, 6 + 4 * sin(2 * f + 1), 3 * sin(f))
    ground(p)
    return p


def run_pose(t, T=0.66):
    f = 2 * pi * t / T
    p = Pose()
    for s, ph in (('L', f), ('R', f + pi)):
        sw = max(0.0, cos(ph + 0.55)) ** 1.1
        p.pre('UpLeg.' + s, Rx(-(16 + 44 * sin(ph))))
        p.pre('Leg.' + s, Rx(16 + 100 * sw))
        p.pre('Foot.' + s, Rx(-(14 * sin(ph) - 8 + 12 * sw)))
    arms_relaxed(p, add=30, el=0, fingers=95)
    for s, ph in (('L', f), ('R', f + pi)):
        arm_swing(p, s, -40 * sin(ph) + 6)
        p.pre('ForeArm.' + s, elbow(s, 85 + 12 * sin(ph)))
        p.pre('Hand.' + s, curl(s, 15))
    p.pre('Hips', Rz(-8 * sin(f)))
    p.pre('Spine', Rx(9) @ Rz(6 * sin(f)))
    p.pre('Chest', Rx(5 + 2 * cos(2 * f)) @ Rz(7 * sin(f)))
    p.pre('Neck', Rx(-8))
    p.pre('Head', Rx(-4 - 2 * cos(2 * f)))
    hair_follow(p, 24 + 8 * sin(2 * f + 0.5), 4 * sin(f))
    ground(p, lift=0.06 * max(0.0, sin(2 * f + 0.9)) ** 1.4)
    p.face = {'mouth_open': 0.25}
    return p


def stride_table(fn, T, steps=240, axis=1):
    """Deplasarea cumulata (de-a lungul -Y) ca talpa de sprijin sa nu alunece."""
    cum = [0.0]
    W, H = fk(fn(0.0))
    prev = sole_points(W, H)
    for i in range(1, steps + 1):
        W, H = fk(fn(T * i / steps))
        cur = sole_points(W, H)
        k = min(range(len(cur)), key=lambda j: cur[j].z)
        cum.append(cum[-1] + (cur[k][axis] - prev[k][axis]))
        prev = cur
    return {'cum': cum, 'T': T, 'steps': steps, 'total': cum[-1]}


def stride_at(tab, t):
    T, n = tab['T'], tab['steps']
    c = math.floor(t / T)
    u = (t - c * T) / T * n
    i = min(int(u), n - 1)
    return c * tab['total'] + lerp(tab['cum'][i], tab['cum'][i + 1], u - i)


# ============================ CLIPURI ============================
CLIPS = []


def clip(name, label, group, T, loop=True, env='studio', props=(), cam='three', speed=0.0):
    def deco(fn):
        CLIPS.append(dict(name=name, label=label, group=group, T=T, loop=loop, env=env, props=list(props), cam=cam, speed=speed, fn=fn))
        return fn
    return deco


@clip('Idle', 'Stă (idle)', 'De bază', 4.0)
def idle(t):
    p = stand_pose()
    b = sin(2 * pi * t / 2)
    sway = sin(2 * pi * t / 4)
    p.loc = V((0.008 * sway, 0, -0.012))
    p.pre('Hips', Ry(1.5 * sway))
    p.pre('Spine', Ry(-1.0 * sway))
    p.pre('Chest', Rx(-0.8 * b))
    p.pre('Shoulder.L', Ry(-1.0 * b)).pre('Shoulder.R', Ry(1.0 * b))
    p.pre('Head', Rz(7 * sin(2 * pi * t / 4 + 1)) @ Rx(1.5 * sin(2 * pi * t / 4)))
    hair_follow(p, 1.5 * b, -2 * sway)
    plant(p)
    p.face = {'blink': blink(t, 3.4, 0.5)}
    return p


@clip('Talk', 'Vorbește (cu gesturi)', 'Vorbit', 6.0, cam='three')
def talk(t):
    p = stand_pose()
    b = sin(2 * pi * t / 2)
    p.loc = V((0, 0, -0.012))
    p.pre('Chest', Rx(-0.8 * b) @ Rz(3 * sin(2 * pi * t / 6)))
    g = keys([(0, (0, 0, 0, 0)), (0.7, (35, 18, 80, 1)), (1.2, (30, 14, 70, 1)), (1.6, (38, 20, 86, 1)), (2.3, (32, 16, 76, 1)),
              (3.1, (4, 0, 10, 0)), (3.9, (0, 0, 0, 0)), (4.5, (40, 10, 62, 1)), (5.2, (34, 8, 70, 1)), (6.0, (0, 0, 0, 0))], t)
    p.pre('UpperArm.R', Rx(-g[0]) @ Ry(-g[1] * 0.4))
    p.pre('ForeArm.R', elbow('R', g[2]))
    p.pre('ForeArm.R', AA(REST_DIR['ForeArm.R'], 70 * g[3]))
    p.pre('Fingers.R', curl('R', -14 * g[3]))
    beat = 6 * sin(t * 9) * g[3]
    p.pre('Hand.R', curl('R', beat))
    g2 = keys([(0, 0), (1.4, 0), (2.0, 1), (2.8, 0), (6, 0)], t)
    p.pre('UpperArm.L', Rx(-18 * g2)).pre('ForeArm.L', elbow('L', 45 * g2))
    p.pre('Head', Rx(3 * sin(t * 2.6) * (1 if t % 3 < 2 else 0.4)) @ Rz(5 * sin(t * 0.9)) @ Ry(3 * sin(t * 1.3)))
    hair_follow(p, 1.5 * b, 0)
    plant(p)
    p.face = talk_mouth(t)
    br = keys([(0, 0), (1.4, 0), (1.6, 1), (2.0, 0), (4.6, 0), (4.8, 0.8), (5.1, 0), (6, 0)], t)
    p.face['brow_up'] = br
    p.face['blink'] = blink(t, 2.9, 0.3)
    return p


@clip('Wave', 'Salută cu mâna', 'Vorbit', 2.4, cam='front')
def wave(t):
    p = stand_pose()
    p.loc = V((0, 0, -0.012))
    up = keys([(0, 0), (0.45, 1), (1.95, 1), (2.4, 0)], t)
    w = sin(2 * pi * t / 0.6) * up
    p.pre('UpperArm.R', Ry(-(-110 * up)) @ Rx(-15 * up))
    p.pre('ForeArm.R', elbow('R', 15 + 60 * up + 18 * w))
    p.pre('ForeArm.R', AA(REST_DIR['ForeArm.R'], 75 * up))
    p.pre('Hand.R', curl('R', 12 * w))
    p.pre('Fingers.R', curl('R', -15 * up))
    p.pre('Chest', Ry(-3 * up))
    p.pre('Head', Ry(4 * up) @ Rx(-2 * up))
    plant(p)
    p.face = {'smile': 0.9 * up, 'brow_up': 0.4 * up, 'blink': blink(t, 2.4, 1.0)}
    return p


WALK_T, RUN_T = 1.1, 0.66


@clip('Walk', 'Merge', 'Deplasare', WALK_T, env='street', cam='side')
def walk(t):
    p = walk_pose(t, WALK_T)
    p.face = {'blink': blink(t, 3.3)}
    return p


@clip('WalkLaptop', 'Merge cu laptopul', 'Deplasare', 1.15, env='street', cam='three')
def walk_laptop(t):
    p = walk_pose(t, 1.15, laptop=True)
    p.face = {'blink': blink(t, 3.45, 1.0)}
    return p


@clip('Run', 'Aleargă', 'Deplasare', RUN_T, env='street', cam='side')
def run(t):
    return run_pose(t, RUN_T)


@clip('Jump', 'Sare', 'Deplasare', 1.8)
def jump(t):
    k = [(0.0, (0, 0, 0, 0, 0, 0, 0, 0)),
         (0.38, (48, 92, 0, 26, -40, 14, 0, 6)),
         (0.52, (-4, 4, -34, 4, 150, 16, 0.10, -10)),
         (0.82, (40, 70, -10, 8, 110, 30, 0.40, -16)),
         (1.10, (20, 18, 14, 10, 60, 20, 0.08, 12)),
         (1.24, (48, 92, 0, 22, 24, 14, 0, 14)),
         (1.8, (0, 0, 0, 0, 0, 0, 0, 0))]
    th, kn, ft, lean, arm, el, lift, hair = keys(k, t)
    p = stand_pose()
    for s in 'LR':
        p.pre('UpLeg.' + s, Rx(-th)).pre('Leg.' + s, Rx(kn)).pre('Foot.' + s, Rx(-(ft + kn - th)))
        arm_swing(p, s, arm)
        p.pre('ForeArm.' + s, elbow(s, el))
    p.pre('Hips', Rx(lean * 0.4)).pre('Spine', Rx(lean * 0.4)).pre('Chest', Rx(lean * 0.2)).pre('Head', Rx(-lean * 0.5))
    hair_follow(p, hair, 0)
    ground(p, lift=lift)
    p.face = {'mouth_O': 0.6 if 0.45 < t < 1.0 else 0.0, 'blink': blink(t, 3, 2.0), 'brow_up': 0.6 if 0.45 < t < 1.0 else 0}
    return p


# ---------------- birou ----------------
SIT_LOC = V((0, 0.035, -0.335))
KEYB = {'L': V((0.075, -0.33, 0.776)), 'R': V((-0.075, -0.33, 0.776))}
DESK_FEET = {'L': V((0.11, -0.24, 0.085)), 'R': V((-0.11, -0.21, 0.085))}


def type_hands(p, t, active=1.0, tap=True):
    for s, sg in SIDES.items():
        jit = V((0.012 * sin(t * 3.1 + sg), 0.008 * sin(t * 2.3 + 1 + sg), 0))
        tz = (max(0.0, sin(t * (26 if sg > 0 else 23) + (0 if sg > 0 else 1.7))) * 0.012) if tap else 0.0
        tgt = KEYB[s] + jit + V((0, 0, 0.018 + tz))
        a = Pose()
        a.D = dict(p.D)
        a.loc = p.loc.copy()
        ik(a, 'arm.' + s, tgt, pole=V((0.6 * sg, 0.6, -0.5)), extra=0.035)
        hand_orient(a, s, V((-0.12 * sg, -1, -0.25)), V((0, 0, -1)))
        a.D['Fingers.' + s] = curl(s, 35 + (tz * 1500 if tap else 0))
        for b in ('UpperArm.' + s, 'ForeArm.' + s, 'Hand.' + s, 'Fingers.' + s):
            p.D[b] = p.D[b].slerp(a.D[b], active)


def seated(p, lean=8.0, head=10.0):
    p.loc = SIT_LOC.copy()
    p.pre('Hips', Rx(-4)).pre('Spine', Rx(lean * 0.6)).pre('Chest', Rx(lean * 0.4)).pre('Head', Rx(head))
    plant(p, DESK_FEET)


@clip('SitDown', 'Se așază la birou', 'Laptop', 2.6, loop=False, env='room', props=['desk'], cam='desk')
def sit_down(t):
    p = stand_pose()
    loc = keys([(0, (0, 0.0, -0.012)), (0.4, (0, 0.0, -0.02)), (1.3, (0, 0.05, -0.2)), (1.8, tuple(SIT_LOC)), (2.6, tuple(SIT_LOC))], t)
    lean = keys([(0, 1), (0.4, 6), (1.3, 34), (1.8, 20), (2.6, 8)], t)
    p.loc = V(loc)
    p.pre('Hips', Rx(lean * 0.5 - 4 * seg(t, 1.3, 1.8))).pre('Spine', Rx(lean * 0.3)).pre('Chest', Rx(lean * 0.2)).pre('Head', Rx(-lean * 0.35 + 10 * seg(t, 1.8, 2.6)))
    u = seg(t, 1.5, 2.4)
    fl = DESK_FEET['L'].lerp(ankle_rest('L'), 1 - u) + V((0, 0, 0.05 * sin(pi * u)))
    fr = DESK_FEET['R'].lerp(ankle_rest('R'), 1 - seg(t, 1.8, 2.6)) + V((0, 0, 0.05 * sin(pi * seg(t, 1.8, 2.6))))
    plant(p, {'L': fl, 'R': fr})
    r = seg(t, 1.9, 2.6)
    p.pre('UpperArm.L', Rx(-12 * seg(t, 0.5, 1.3))).pre('UpperArm.R', Rx(-12 * seg(t, 0.5, 1.3)))
    if r > 0:
        type_hands(p, t, active=r, tap=False)
    hair_follow(p, lean * 0.2, 0)
    p.face = {'blink': blink(t, 3.8, 2.0)}
    return p


@clip('Type', 'Tastează la laptop', 'Laptop', 4.0, env='room', props=['desk'], cam='desk')
def type_(t):
    p = stand_pose()
    pause = 2.8 < t < 3.4
    look = sin(pi * seg(t, 2.8, 3.4, lambda x: x)) if pause else 0.0
    seated(p, lean=8 + 0.6 * sin(2 * pi * t / 2), head=10 + 1.5 * sin(2 * pi * t / 4) - 6 * look)
    p.pre('Head', Rz(10 * look))
    type_hands(p, t, active=1.0, tap=not pause)
    hair_follow(p, 2, 0)
    p.face = {'blink': blink(t, 3.6, 1.1), 'mouth_open': 0.2 if 1.2 < t < 1.6 else 0.0, 'brow_up': 0.6 * look}
    return p


# ---------------- masina ----------------
CW = lambda v: PM.CAR_POS + V(v)        # coordonate masina -> lume
HINGE_W = CW(PM.CAR['hinge'])
SEAT_LOC = V((CW(PM.CAR['seat']).x - BONES['Hips'][0].x, PM.CAR['seat'].y - 0.04, 0.59 - BONES['Hips'][0].z))
PEDALS = {'L': CW((PM.CAR['seat'].x + 0.10, -0.62, 0.28)), 'R': CW((PM.CAR['seat'].x - 0.10, -0.62, 0.28))}
STEER_N = V((0, 0.85, 0.53)).normalized()


def door_pt(local, ang):
    """Punct de pe usa (coordonate masina) cand usa e deschisa cu 'ang' grade."""
    rel = V(local) - PM.CAR['hinge']
    q = Rz(-ang)
    return HINGE_W + q @ rel


def steer_frame():
    from common import frame_for
    fx, fy, fz = frame_for(STEER_N, V((1, 0, 0)))
    return fx, fy


def wheel_grip(s, steer, bob=0.0):
    fx, fy = steer_frame()
    a = math.radians((62 if s == 'L' else -62) + steer)
    c = CW(PM.CAR['steer']) + V((0, 0, bob))
    return c + (fx * cos(a) + fy * sin(a)) * PM.CAR['steer_r']


def on_wheel(p, steer=0.0, bob=0.0):
    fx, fy = steer_frame()
    for s, sg in SIDES.items():
        g = wheel_grip(s, steer, bob)
        ik(p, 'arm.' + s, g + STEER_N * 0.02, pole=V((0.7 * sg, 0.3, -0.6)), extra=0.04)
        tang = (CW(PM.CAR['steer']) + V((0, 0, bob)) - g).normalized()
        hand_orient(p, s, (-STEER_N * 0.6 + V((0, 0, 0.6)) + tang * 0.3), tang)
        p.D['Fingers.' + s] = curl(s, 85)


def car_seated(p, bob=0.0, lean=-8.0):
    p.loc = SEAT_LOC + V((0, 0, bob))
    p.pre('Spine', Rx(lean * 0.6)).pre('Chest', Rx(lean * 0.4)).pre('Neck', Rx(-lean * 0.5)).pre('Head', Rx(-lean * 0.3))
    for s in 'LR':
        ik(p, 'leg.' + s, PEDALS[s] + V((0, 0, bob)), pole=V((0.1 * SIDES[s], -1, 0.6)))
        foot_flat(p, s, 0, pitch=20)


def door_enter(t):
    return keys([(0, 0), (2.1, 0), (2.75, 35), (3.05, PM.CAR['door_max']), (4.9, PM.CAR['door_max']), (5.4, 0), (6.6, 0)],
                t, fn=lambda u: ease(u))


def door_exit(t):
    return keys([(0, 0), (0.8, 0), (1.4, PM.CAR['door_max']), (3.6, PM.CAR['door_max']), (4.1, 22), (4.45, 0), (7.2, 0)], t)


STOP = V((-0.12, 0.70, 0))
_walk_tab = {}


def walk_tab():
    if 'w' not in _walk_tab:
        _walk_tab['w'] = stride_table(lambda tt: walk_pose(tt, WALK_T), WALK_T)
    return _walk_tab['w']


def blend_pose(a, b, u):
    out = Pose()
    for k in BONES:
        out.D[k] = a.D[k].slerp(b.D[k], u)
    out.loc = a.loc.lerp(b.loc, u)
    out.face = {k: lerp(a.face.get(k, 0), b.face.get(k, 0), u) for k in set(a.face) | set(b.face)}
    out.laptop = b.laptop if u > 0.5 else a.laptop
    return out


def walking_to(t, end, t_end, yaw=0.0):
    """Mers spre -Y, ajungand cu soldul in 'end' la momentul t_end (fara alunecarea talpilor)."""
    tab = walk_tab()
    p = walk_pose(t, WALK_T, yaw=yaw)
    p.loc.x = end.x
    p.loc.y = end.y + (stride_at(tab, t_end) - stride_at(tab, t))
    return p


def standing_at(pos, yaw=0.0):
    p = stand_pose()
    p.pre('Hips', Rz(yaw))
    p.loc = V((pos.x, pos.y, -0.012))
    plant(p, {s: V(pos) + Rz(yaw) @ (ankle_rest(s) - V((0, 0, 0))) for s in 'LR'}, yaw)
    return p


@clip('CarEnter', 'Urcă în mașină', 'Mașină', 6.6, loop=False, env='street', props=['car'], cam='car')
def car_enter(t):
    door = door_enter(t)
    stand = standing_at(STOP)
    if t < 1.65:
        p = walking_to(t, STOP, 1.65)
        if t > 1.3:
            p = blend_pose(p, stand, ease((t - 1.3) / 0.35))
    elif t < 2.85:
        p = standing_at(STOP + V((0.0, 0.04 * seg(t, 2.1, 2.75), 0)))
        reach = seg(t, 1.65, 2.1) * (1 - seg(t, 2.6, 2.85))
        h = door_pt(PM.CAR['handle_out'], min(door, 35))
        a = Pose(); a.D = dict(p.D); a.loc = p.loc.copy()
        a.pre('Chest', Rz(-12) @ Rx(6))
        ik(a, 'arm.R', h + V((0.03, 0, 0)), pole=V((-0.5, 0.8, -0.3)), extra=0.05)
        hand_orient(a, 'R', V((-0.2, -0.3, -1)), V((-1, 0, 0)))
        a.D['Fingers.R'] = curl('R', 70)
        p = blend_pose(p, a, reach)
    else:
        # intra: pasi laterali in deschidere, se intoarce cu spatele, se aseaza, baga picioarele
        yaw = keys([(2.85, 0), (3.3, 90), (3.95, 90), (4.65, 0)], t)
        hx = keys([(2.85, STOP.x), (3.3, -0.36), (3.95, SEAT_LOC.x + 0.06), (4.65, SEAT_LOC.x)], t)
        hy = keys([(2.85, STOP.y), (3.3, 0.22), (3.95, SEAT_LOC.y + 0.02), (4.65, SEAT_LOC.y)], t)
        hz = keys([(2.85, -0.012), (3.3, -0.03), (3.95, SEAT_LOC.z + 0.03), (4.65, SEAT_LOC.z)], t)
        lean = keys([(2.85, 2), (3.3, 10), (3.95, 28), (4.3, 12), (4.65, -8)], t)
        p = stand_pose()
        p.pre('Hips', Rz(yaw))
        p.loc = V((hx, hy, hz))
        p.pre('Spine', Rx(lean * 0.6)).pre('Chest', Rx(lean * 0.4)).pre('Neck', Rx(max(0, lean) * 0.4)).pre('Head', Rx(-lean * 0.2))
        # picioarele: pe sol afara, apoi peste prag spre pedale
        out_l, out_r = V((-0.24, 0.30, 0.085)), V((-0.24, 0.08, 0.085))
        st_l = STOP + ankle_rest('L')
        st_r = STOP + ankle_rest('R')
        u1 = seg(t, 2.85, 3.3)
        swing = seg(t, 3.95, 4.65)
        fl = st_l.lerp(out_l, u1) + V((0, 0, 0.06 * sin(pi * u1)))
        fr = st_r.lerp(out_r, seg(t, 2.95, 3.35)) + V((0, 0, 0.06 * sin(pi * seg(t, 2.95, 3.35))))
        fl = fl.lerp(PEDALS['L'], swing) + V((0, 0, 0.42 * sin(pi * swing)))
        fr = fr.lerp(PEDALS['R'], seg(t, 4.05, 4.65)) + V((0, 0, 0.42 * sin(pi * seg(t, 4.05, 4.65))))
        fyaw = yaw
        for s, tgt in (('L', fl), ('R', fr)):
            ik(p, 'leg.' + s, tgt, pole=Rz(yaw) @ V((0.1 * SIDES[s], -1, 0.3)))
            foot_flat(p, s, fyaw, pitch=20 * swing)
        p.pre('UpperArm.L', Rx(-10)).pre('UpperArm.R', Rx(-10))
        if t >= 4.65:
            c = Pose(); c.D = dict(p.D); c.loc = p.loc.copy()
            seated = Pose()
            arms_relaxed(seated)
            car_seated(seated)
            seated.pre('UpperArm.L', Rx(-25)).pre('UpperArm.R', Rx(-25)).pre('ForeArm.L', elbow('L', 40)).pre('ForeArm.R', elbow('R', 40))
            p = seated
            # inchide usa cu mana stanga
            reach = seg(t, 4.65, 4.95) * (1 - seg(t, 5.45, 5.75))
            h = door_pt(PM.CAR['handle_in'], door)
            a = Pose(); a.D = dict(p.D); a.loc = p.loc.copy()
            a.pre('Chest', Rz(14) @ Ry(-6))
            ik(a, 'arm.L', h, pole=V((0.6, 0.6, -0.4)), extra=0.05)
            hand_orient(a, 'L', V((0.3, -0.5, -0.6)), V((1, 0, 0)))
            a.D['Fingers.L'] = curl('L', 75)
            p = blend_pose(p, a, reach)
            w = Pose(); w.D = dict(seated.D); w.loc = seated.loc.copy()
            on_wheel(w)
            p = blend_pose(p, w, seg(t, 5.6, 6.2))
    p.face = {'blink': blink(t, 3.2, 0.4)}
    if 3.4 < t < 4.2:
        p.face['blink'] = 0.4
    return p


DRIVE_T = 6.0


def drive_steer(t):
    return 14 * sin(2 * pi * t / 6) + 5 * sin(2 * pi * t / 2)


def drive_bob(t):
    b = 0.004 * sin(2 * pi * t * 2) + 0.002 * sin(2 * pi * t * 5)
    for tb in (2.0, 5.0):
        if tb < t < tb + 0.25:
            b += 0.014 * sin(pi * (t - tb) / 0.25)
    return b


DRIVE_SPEED = 25 * 2 * pi * PM.CAR['wheel_r'] / DRIVE_T


@clip('Drive', 'Conduce', 'Mașină', DRIVE_T, env='road', props=['car'], cam='car', speed=DRIVE_SPEED)
def drive(t):
    st, bob = drive_steer(t), drive_bob(t)
    p = Pose()
    arms_relaxed(p)
    car_seated(p, bob)
    p.pre('Chest', Ry(st * 0.15))
    look = keys([(0, 0), (3.5, 0), (3.8, 1), (4.3, 1), (4.6, 0), (6, 0)], t)
    p.pre('Head', Rz(28 * look) @ Ry(-st * 0.2))
    on_wheel(p, st, bob)
    hair_follow(p, 1 + 1.2 * sin(t * 7), 0)
    p.face = {'blink': blink(t, 3.1, 0.2)}
    if 1.4 < t < 2.6:
        p.face.update(talk_mouth(t, 5.0))
        p.face = {k: v * 0.5 for k, v in p.face.items()}
        p.face['blink'] = blink(t, 3.1, 0.2)
    return p


EXIT_OUT = V((-0.12, 0.30, 0))
EXIT_STAND = V((0.30, 0.47, 0))


@clip('CarExit', 'Coboară din mașină', 'Mașină', 7.2, loop=False, env='street', props=['car'], cam='car')
def car_exit(t):
    door = door_exit(t)
    if t < 1.4:
        p = Pose()
        arms_relaxed(p)
        car_seated(p)
        w = Pose(); w.D = dict(p.D); w.loc = p.loc.copy()
        on_wheel(w)
        p.pre('UpperArm.L', Rx(-25)).pre('UpperArm.R', Rx(-25)).pre('ForeArm.L', elbow('L', 40)).pre('ForeArm.R', elbow('R', 40))
        reach = seg(t, 0.35, 0.75) * (1 - seg(t, 1.3, 1.5))
        h = door_pt(PM.CAR['handle_in'], min(door, 40))
        a = Pose(); a.D = dict(p.D); a.loc = p.loc.copy()
        a.pre('Chest', Rz(14) @ Ry(-6))
        ik(a, 'arm.L', h, pole=V((0.6, 0.6, -0.4)), extra=0.05)
        hand_orient(a, 'L', V((0.3, -0.5, -0.6)), V((1, 0, 0)))
        a.D['Fingers.L'] = curl('L', 75)
        q = blend_pose(p, a, reach)
        p = blend_pose(w, q, seg(t, 0.0, 0.35))
    elif t < 3.3:
        yaw = keys([(1.4, 0), (2.1, 90), (2.75, 90), (3.3, 0)], t)
        hx = keys([(1.4, SEAT_LOC.x), (2.1, SEAT_LOC.x + 0.06), (2.75, -0.36), (3.3, EXIT_OUT.x)], t)
        hy = keys([(1.4, SEAT_LOC.y), (2.1, SEAT_LOC.y + 0.02), (2.75, 0.22), (3.3, EXIT_OUT.y)], t)
        hz = keys([(1.4, SEAT_LOC.z), (2.1, SEAT_LOC.z + 0.03), (2.75, -0.03), (3.3, -0.012)], t)
        lean = keys([(1.4, -8), (1.8, 12), (2.3, 30), (2.75, 10), (3.3, 2)], t)
        p = stand_pose()
        p.pre('Hips', Rz(yaw))
        p.loc = V((hx, hy, hz))
        p.pre('Spine', Rx(lean * 0.6)).pre('Chest', Rx(lean * 0.4)).pre('Neck', Rx(max(0, lean) * 0.4)).pre('Head', Rx(-lean * 0.2))
        out_l, out_r = V((-0.24, 0.30, 0.085)), V((-0.24, 0.08, 0.085))
        sw_l, sw_r = seg(t, 1.4, 2.1), seg(t, 1.5, 2.15)
        fl = PEDALS['L'].lerp(out_l, sw_l) + V((0, 0, 0.42 * sin(pi * sw_l)))
        fr = PEDALS['R'].lerp(out_r, sw_r) + V((0, 0, 0.42 * sin(pi * sw_r)))
        u2, u3 = seg(t, 2.75, 3.15), seg(t, 2.85, 3.3)
        fl = fl.lerp(EXIT_OUT + ankle_rest('L'), u2) + V((0, 0, 0.05 * sin(pi * u2)))
        fr = fr.lerp(EXIT_OUT + ankle_rest('R'), u3) + V((0, 0, 0.05 * sin(pi * u3)))
        for s, tgt in (('L', fl), ('R', fr)):
            ik(p, 'leg.' + s, tgt, pole=Rz(yaw) @ V((0.1 * SIDES[s], -1, 0.3)))
            foot_flat(p, s, yaw * (1 - seg(t, 2.75, 3.3)), pitch=20 * (1 - max(sw_l, 0)))
        p.pre('UpperArm.L', Rx(-10)).pre('UpperArm.R', Rx(-10))
    elif t < 4.7:
        # pas inapoi si inchide usa (impinge rama usii)
        pos = EXIT_OUT.lerp(EXIT_STAND, seg(t, 3.3, 3.65))
        p = standing_at(pos)
        reach = seg(t, 3.55, 3.85) * (1 - seg(t, 4.2, 4.5))
        h = door_pt(V((PM.CAR['hinge'].x + 0.01, PM.CAR['hinge'].y + 1.0, 1.15)), max(door, 22))
        a = Pose(); a.D = dict(p.D); a.loc = p.loc.copy()
        a.pre('Chest', Rx(8))
        ik(a, 'arm.L', h + V((0.05, 0, 0)), pole=V((0.8, 0.5, -0.3)), extra=0.04)
        hand_orient(a, 'L', V((0, -1, 0.2)), V((-1, 0, 0)))
        a.D['Fingers.L'] = curl('L', -10)
        p = blend_pose(p, a, reach)
    else:
        # se intoarce si pleaca (spre +Y)
        tw = t - 4.95
        turn = Pose()
        turn = standing_at(EXIT_STAND, yaw=180 * seg(t, 4.7, 4.95))
        if tw < 0:
            p = turn
        else:
            tab = walk_tab()
            p = walk_pose(tw, WALK_T, yaw=180)
            p.loc.x += EXIT_STAND.x
            p.loc.y += EXIT_STAND.y + stride_at(tab, tw)
            if tw < 0.3:
                p = blend_pose(standing_at(EXIT_STAND, 180), p, ease(tw / 0.3))
    p.face = {'blink': blink(t, 3.3, 1.2)}
    return p


SWIM_T = 1.6


@clip('Swim', 'Înoată (craul)', 'Apă', SWIM_T, env='pool', cam='pool', speed=1.1)
def swim(t):
    u = t / SWIM_T
    f = 2 * pi * u
    p = Pose()
    roll = 32 * sin(f)
    p.pre('Hips', Rx(88 + 2 * sin(2 * f)) @ Rz(roll))
    p.loc = V((0, 0.35, -0.985 + 0.012 * sin(2 * f)))
    for s, sg, ph in (('L', 1, 0.0), ('R', -1, 0.5)):
        a = 180 - 360 * ((u + ph) % 1.0)
        p.pre('UpperArm.' + s, Ry(sg * 38))
        p.pre('UpperArm.' + s, Rx(-a))
        rec = max(0.0, sin(math.radians(-a)))
        pull = max(0.0, sin(math.radians(a)))
        p.pre('ForeArm.' + s, elbow(s, 15 + 75 * rec + 50 * pull))
        p.pre('Hand.' + s, curl(s, 10))
        p.pre('Fingers.' + s, curl(s, 5))
    kick = 2 * pi * u * 3
    for s, off in (('L', 0), ('R', pi)):
        p.pre('UpLeg.' + s, Rx(-(8 * sin(kick + off) + 10)) @ Ry(SIDES[s] * -3))
        p.pre('Leg.' + s, Rx(4 + 6 * sin(kick + off + 1.2)))
        p.pre('Foot.' + s, Rx(55))
    p.pre('Spine', Rz(-roll * 0.25))
    breath = max(0.0, sin(f - 0.6)) ** 3
    p.pre('Neck', Rx(-22))
    p.pre('Head', Rz(-roll * 0.6 - 45 * breath))
    hair_follow(p, -20 + 6 * sin(2 * f), 6 * sin(f))
    p.face = {'mouth_O': 0.7 * breath, 'blink': 0.55 if breath < 0.3 else 0.0}
    return p
