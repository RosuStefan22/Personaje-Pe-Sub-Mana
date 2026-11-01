import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
import alecsia_model as am
col = bpy.context.scene.collection
rig, body, face, mats = am.build_character(col)
print('verts body', len(body.data.vertices), 'face', len(face.data.vertices))
bpy.ops.export_scene.gltf(filepath='/home/user/Personaje-Pe-Sub-Mana/alecsia/3d/models/alecsia.glb', export_format='GLB', export_animations=False, export_morph=True)
