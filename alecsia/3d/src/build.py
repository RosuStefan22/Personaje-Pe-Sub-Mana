"""Construieste tot: model + rig + animatii + recuzita, apoi exporta .blend, .glb, .fbx si datele viewer-ului.
Rulare:  python3 alecsia/3d/src/build.py      (necesita modulul 'bpy' — pip install bpy)
"""
import os, sys, json, math, base64
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bpy
from mathutils import Vector as V, Quaternion as Q, Matrix

OUT = os.path.abspath(os.path.join(HERE, '..', 'models'))
os.makedirs(OUT, exist_ok=True)
ONLY = [a for a in sys.argv[1:] if not a.startswith('-')]

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30
import alecsia_model as AM
import props_model as PM
import alecsia_anims as AN

col_char = bpy.data.collections.new('Alecsia'); scene.collection.children.link(col_char)
col_car = bpy.data.collections.new('Masina'); scene.collection.children.link(col_car)
col_desk = bpy.data.collections.new('Birou'); scene.collection.children.link(col_desk)

rig, body, face, mats = AM.build_character(col_char)
car_root, car_body, car_door, car_steer, car_wheels = PM.build_car(col_car)
desk_root = PM.build_desk(col_desk)

# ---------------- animatii personaj ----------------
REST_Q = {b.name: b.matrix_local.to_quaternion() for b in rig.data.bones}
for pb in rig.pose.bones:
    pb.rotation_mode = 'QUATERNION'
keyblocks = face.data.shape_keys.key_blocks
MORPHS = [k.name for k in keyblocks if k.name != 'Basis']
clips = [c for c in AN.CLIPS if not ONLY or c['name'] in ONLY]
info = []


def push_nla(idb, action, name):
    ad = idb.animation_data
    tr = ad.nla_tracks.new()
    tr.name = name
    tr.strips.new(name, 0, action)
    ad.action = None


for c in clips:
    name, T = c['name'], c['T']
    n = int(round(T * AN.FPS))
    rig.animation_data_create()
    act = bpy.data.actions.new('ALX_' + name)
    act.use_fake_user = True
    rig.animation_data.action = act
    key = face.data.shape_keys
    key.animation_data_create()
    fact = bpy.data.actions.new('ALX_' + name + '_face')
    fact.use_fake_user = True
    key.animation_data.action = fact
    prevq = {}
    for i in range(n + 1):
        t = min(T, i / AN.FPS)
        p = c['fn'](t)
        for b in AN.ORDER:
            pb = rig.pose.bones[b]
            q = REST_Q[b].inverted() @ p.D[b] @ REST_Q[b]
            q.normalize()
            if b in prevq and prevq[b].dot(q) < 0:
                q = -q
            prevq[b] = q
            pb.rotation_quaternion = q
            pb.keyframe_insert('rotation_quaternion', frame=i)
        hips = rig.pose.bones['Hips']
        hips.location = REST_Q['Hips'].inverted() @ p.loc
        hips.keyframe_insert('location', frame=i)
        lap = rig.pose.bones['Laptop.R']
        lap.scale = (1, 1, 1) if p.laptop else (0.001, 0.001, 0.001)
        lap.keyframe_insert('scale', frame=i)
        for m in MORPHS:
            keyblocks[m].value = max(0.0, min(1.0, p.face.get(m, 0.0)))
            keyblocks[m].keyframe_insert('value', frame=i)
    push_nla(rig, act, name)
    push_nla(key, fact, name)
    speed = c['speed']
    if name in ('Walk', 'WalkLaptop', 'Run'):
        fn = c['fn']
        tab = AN.stride_table(fn, T, steps=180)
        speed = abs(tab['total']) / T
    info.append(dict(name=name, label=c['label'], group=c['group'], loop=c['loop'], env=c['env'], props=c['props'],
                     cam=c['cam'], speed=round(speed, 4), duration=T))
    print(f'  animatie {name}: {n + 1} cadre, viteza {speed:.2f} m/s', flush=True)

# ---------------- animatii masina (sincron cu personajul) ----------------
car_objs = [car_body, car_door, car_steer] + car_wheels
q0 = car_steer.matrix_basis.to_quaternion()
st_loc = car_steer.matrix_basis.to_translation()
for ob in car_objs:
    ob.rotation_mode = 'QUATERNION'
for name, T, fn in (('CarEnter', 6.6, lambda t: (AN.door_enter(t), 0.0, 0.0, 0.0)),
                    ('Drive', AN.DRIVE_T, lambda t: (0.0, AN.drive_steer(t), AN.drive_bob(t), AN.DRIVE_SPEED * t)),
                    ('CarExit', 7.2, lambda t: (AN.door_exit(t), 0.0, 0.0, 0.0))):
    if ONLY and name not in ONLY:
        continue
    n = int(round(T * AN.FPS))
    acts = {}
    for ob in car_objs:
        ob.animation_data_create()
        a = bpy.data.actions.new('CAR_' + name + '_' + ob.name)
        a.use_fake_user = True
        ob.animation_data.action = a
        acts[ob] = a
    for i in range(n + 1):
        t = min(T, i / AN.FPS)
        door, steer, bob, dist = fn(t)
        car_body.location = (0, 0, bob)
        car_body.keyframe_insert('location', frame=i)
        car_door.rotation_quaternion = AN.Rz(-door)
        car_door.keyframe_insert('rotation_quaternion', frame=i)
        car_steer.rotation_quaternion = q0 @ AN.Rz(steer)
        car_steer.keyframe_insert('rotation_quaternion', frame=i)
        for w in car_wheels:
            w.rotation_quaternion = Q((1, 0, 0), dist / PM.CAR['wheel_r'])
            w.keyframe_insert('rotation_quaternion', frame=i)
    for ob, a in acts.items():
        push_nla(ob, a, name)

# ---------------- export ----------------
def select_only(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]


def export_glb(path, objs, anim=True):
    select_only(objs)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_animations=anim,
                              export_animation_mode='NLA_TRACKS', export_morph=True, export_morph_animation=True,
                              export_optimize_animation_size=False, export_force_sampling=True, export_yup=True,
                              export_apply=False, export_skins=True, export_def_bones=False)


char_objs = [rig, body, face]
export_glb(os.path.join(OUT, 'alecsia.glb'), char_objs)
export_glb(os.path.join(OUT, 'car.glb'), [car_root] + list(car_root.children_recursive))
export_glb(os.path.join(OUT, 'desk.glb'), [desk_root] + list(desk_root.children_recursive), anim=False)
with open(os.path.join(OUT, 'clips.json'), 'w') as f:
    json.dump({'character': 'Alecsia', 'project': 'Pe Sub Mana', 'fps': AN.FPS, 'car_position': list(PM.CAR_POS), 'clips': info}, f, indent=1, ensure_ascii=False)

# FBX (Unity / Unreal): fiecare clip devine un 'take'
select_only(char_objs)
try:
    bpy.ops.export_scene.fbx(filepath=os.path.join(OUT, 'alecsia.fbx'), use_selection=True, object_types={'ARMATURE', 'MESH'},
                             add_leaf_bones=False, bake_anim=True, bake_anim_use_all_actions=False, bake_anim_use_nla_strips=True,
                             bake_anim_force_startend_keying=True, apply_scale_options='FBX_SCALE_ALL', axis_forward='-Z', axis_up='Y',
                             mesh_smooth_type='FACE', use_armature_deform_only=False)
except Exception as e:
    print('FBX esuat:', e)

# .blend: pistele NLA dezactivate, clipul 'Idle' activ (alegi alt clip din Action Editor)
for idb in [rig, face.data.shape_keys] + car_objs:
    ad = idb.animation_data
    if not ad:
        continue
    for tr in ad.nla_tracks:
        tr.mute = True
rig.animation_data.action = bpy.data.actions.get('ALX_Idle')
face.data.shape_keys.animation_data.action = bpy.data.actions.get('ALX_Idle_face')
scene.frame_start, scene.frame_end = 0, 120
# lumini + camera pentru randare
sun = bpy.data.objects.new('Soare', bpy.data.lights.new('Soare', 'SUN'))
sun.data.energy = 3.0
sun.rotation_euler = (math.radians(50), 0, math.radians(30))
scene.collection.objects.link(sun)
cam = bpy.data.objects.new('Camera', bpy.data.cameras.new('Camera'))
cam.location = (2.2, -4.2, 1.35)
cam.rotation_euler = (math.radians(84), 0, math.radians(28))
scene.collection.objects.link(cam)
scene.camera = cam
col_car.hide_viewport = col_car.hide_render = True
col_desk.hide_viewport = col_desk.hide_render = True
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'alecsia.blend'), compress=True)

# date incorporate pentru viewer (merge si din file://)
data = {}
for fn in ('alecsia.glb', 'car.glb', 'desk.glb', 'clips.json'):
    with open(os.path.join(OUT, fn), 'rb') as f:
        data[fn] = base64.b64encode(f.read()).decode()
with open(os.path.join(OUT, 'data.js'), 'w') as f:
    f.write('window.ALX_DATA=' + json.dumps(data) + ';\n')
print('GATA ->', OUT)
