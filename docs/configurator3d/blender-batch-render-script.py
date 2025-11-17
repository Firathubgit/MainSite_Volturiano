"""
Blender Batch Render Script for 2D Configurator Images
=======================================================
This script automates rendering all combinations of body paint and rim colors
for the Volturiano 2D configurator.

SETUP INSTRUCTIONS:
1. Open your Blender file with the Volturiano car model
2. Make sure you have cameras set up for the 4 angles (or the script will create them)
3. Go to Scripting workspace
4. Open this script
5. Update the configuration section below with your colors and output path
6. Run the script (Alt+P or click Run Script)

OUTPUT:
- Renders all combinations: 5 body colors × 3 rim colors × 4 angles = 60 images
- Saves as: {body_color}_{rim_color}_{angle}.webp
- Example: orange-fury_black_front-3q.webp
"""

import bpy
import os
import math
import time
from mathutils import Vector

# ============================================================================
# CONFIGURATION - UPDATE THESE VALUES
# ============================================================================

# Define your body paint colors (5 colors)
BODY_COLORS = {
    "orange-fury": "#FF4520",      # Default orange
    "nero-black": "#111111",        # Black
    "bianco-white": "#FFFFFF",      # White
    "rosso-red": "#E10600",         # Red
    "blu-blue": "#060FE7",          # Blue (removed extra FF)
}

# Define your rim colors (3 colors)
RIM_COLORS = {
    "black": "#111111",             # Default black
    "silver": "#F7FAFF",            # Silver (removed extra FF)
    "bronze": "#900678",            # Bronze (fixed double ##)
}

# Camera angles and their positions/rotations
# NOTE: Rotation values are in RADIANS (Blender UI shows degrees, but Python API uses radians)
# To convert: radians = degrees * (π / 180)
CAMERA_ANGLES = {
    "front-3q": {
        "location": (-2.59659, -5.77096, 0.27289),
        "rotation": (math.radians(92.7615), math.radians(0.000482), math.radians(-386.107)),  # Converted from degrees
    },
    "side": {
        "location": (-5.96375, -2.56057, 0.89588),
        "rotation": (math.radians(86.7615), math.radians(0.000495), math.radians(-427.707)),  # Converted from degrees
    },
    "rear-3q": {
        "location": (-2.27668, 3.19271, 0.610324),
        "rotation": (math.radians(86.7604), math.radians(0.000352), math.radians(-132.106)),  # Converted from degrees
    },
    "rim": {
        "location": (-3.1476, 0.956629, 0.469518),
        "rotation": (math.radians(88.161), math.radians(0.000528), math.radians(-89.7064)),  # Converted from degrees
    },
}

# Output directory (will be created if it doesn't exist)
OUTPUT_DIR = "C:/Users/Firat/Documents/Projects/MainSite_Volturiano/web/src/assets/Configurator/volturiano"

# Material names (must match your Blender materials)
BODY_MATERIAL_NAME = "Mat_BodyPaint"
RIM_MATERIAL_NAME = "Mat_RimPaint"

# Render settings
RENDER_RESOLUTION_X = 1920
RENDER_RESOLUTION_Y = 1080
RENDER_FORMAT = "WEBP"
RENDER_QUALITY = 90  # 0-100 for WEBP

# Speed vs Quality settings
# Set to 'CYCLES' for realistic lighting (slower) or 'BLENDER_EEVEE' for faster renders
RENDER_ENGINE = 'CYCLES'  # Options: 'CYCLES' or 'BLENDER_EEVEE'
CYCLES_SAMPLES = 128  # Lower = faster but noisier (try 64 for faster, 256 for better quality)
USE_GPU = True  # Set to True to use GPU if available (much faster than CPU)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def hex_to_rgb(hex_color):
    """Convert hex color (#RRGGBB) to RGB tuple (0-1 range)."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def find_material_by_name(name):
    """Find a material by name in the scene."""
    for mat in bpy.data.materials:
        if mat.name == name:
            return mat
    return None

def setup_camera(angle_name, angle_config):
    """Create or update a camera for the given angle."""
    cam_name = f"Camera_{angle_name}"
    
    # Check if camera already exists
    if cam_name in bpy.data.objects:
        cam = bpy.data.objects[cam_name]
    else:
        # Create new camera
        bpy.ops.object.camera_add()
        cam = bpy.context.active_object
        cam.name = cam_name
    
    # Set camera properties
    cam.location = angle_config["location"]
    cam.rotation_euler = angle_config["rotation"]
    
    # Set as active camera
    bpy.context.scene.camera = cam
    
    return cam

def set_material_color(material, hex_color):
    """Set the base color of a material."""
    if material.use_nodes:
        # Find the Principled BSDF node
        bsdf = material.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            rgb = hex_to_rgb(hex_color)
            bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    else:
        # Fallback for non-node materials
        rgb = hex_to_rgb(hex_color)
        material.diffuse_color = (*rgb, 1.0)
    
    material.use_nodes = True  # Ensure nodes are enabled

def setup_render_settings():
    """Configure Blender render settings."""
    scene = bpy.context.scene
    
    # Set render engine
    scene.render.engine = RENDER_ENGINE
    
    # Resolution
    scene.render.resolution_x = RENDER_RESOLUTION_X
    scene.render.resolution_y = RENDER_RESOLUTION_Y
    scene.render.resolution_percentage = 100
    
    # Output format
    scene.render.image_settings.file_format = RENDER_FORMAT
    if RENDER_FORMAT == "WEBP":
        scene.render.image_settings.quality = RENDER_QUALITY
        scene.render.image_settings.color_mode = 'RGB'
    
    # Cycles settings (if using Cycles)
    if scene.render.engine == 'CYCLES':
        scene.cycles.samples = CYCLES_SAMPLES
        scene.cycles.use_denoising = True
        
        # GPU rendering (much faster if available)
        if USE_GPU:
            # Try to use GPU
            prefs = bpy.context.preferences
            cycles_prefs = prefs.addons['cycles'].preferences
            cycles_prefs.refresh_devices()
            
            # Enable GPU compute if available
            for device in cycles_prefs.devices:
                if device.type == 'CUDA' or device.type == 'OPTIX' or device.type == 'HIP':
                    device.use = True
                    print(f"  GPU device enabled: {device.name} ({device.type})")
                elif device.type == 'OPENCL':
                    device.use = True
                    print(f"  GPU device enabled: {device.name} ({device.type})")
            
            # Set device type
            if cycles_prefs.has_active_device():
                scene.cycles.device = 'GPU'
                print("  Using GPU rendering")
            else:
                scene.cycles.device = 'CPU'
                print("  No GPU found, using CPU rendering")
        else:
            scene.cycles.device = 'CPU'
            print("  Using CPU rendering (USE_GPU = False)")
    
    # Eevee settings (if using Eevee - much faster)
    elif scene.render.engine == 'BLENDER_EEVEE':
        scene.eevee.taa_render_samples = 64  # Lower = faster
        print("  Using Eevee engine (faster but less realistic)")

def render_and_save(body_color_name, rim_color_name, angle_name):
    """Render the current scene and save with proper naming."""
    # Create output directory if it doesn't exist
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Set output file path
    filename = f"{body_color_name}_{rim_color_name}_{angle_name}.webp"
    filepath = os.path.join(OUTPUT_DIR, filename)
    
    # Set render output path
    bpy.context.scene.render.filepath = filepath
    
    # Render with progress feedback
    print(f"  → Rendering: {filename}")
    start_time = time.time()
    bpy.ops.render.render(write_still=True)
    render_time = time.time() - start_time
    
    print(f"  ✓ Saved ({render_time:.1f}s): {filepath}")
    
    return render_time

# ============================================================================
# MAIN RENDERING LOOP
# ============================================================================

def main():
    """Main function to execute batch rendering."""
    print("=" * 60)
    print("Volturiano Batch Render Script")
    print("=" * 60)
    
    # Find materials
    body_mat = find_material_by_name(BODY_MATERIAL_NAME)
    rim_mat = find_material_by_name(RIM_MATERIAL_NAME)
    
    if not body_mat:
        print(f"ERROR: Material '{BODY_MATERIAL_NAME}' not found!")
        return
    
    if not rim_mat:
        print(f"ERROR: Material '{RIM_MATERIAL_NAME}' not found!")
        return
    
    print(f"Found body material: {body_mat.name}")
    print(f"Found rim material: {rim_mat.name}")
    
    # Setup render settings
    setup_render_settings()
    print(f"Render settings: {RENDER_RESOLUTION_X}x{RENDER_RESOLUTION_Y}, {RENDER_FORMAT}")
    
    # Calculate total renders
    total_renders = len(BODY_COLORS) * len(RIM_COLORS) * len(CAMERA_ANGLES)
    print(f"Total renders: {total_renders}")
    print(f"Output directory: {OUTPUT_DIR}")
    print("-" * 60)
    
    # Render all combinations
    render_count = 0
    start_time = time.time()
    render_times = []
    
    print("\n" + "=" * 60)
    print("STARTING BATCH RENDER")
    print("=" * 60)
    
    for body_name, body_hex in BODY_COLORS.items():
        # Set body color
        set_material_color(body_mat, body_hex)
        print(f"\n{'='*60}")
        print(f"BODY COLOR: {body_name.upper()} ({body_hex})")
        print(f"{'='*60}")
        
        for rim_name, rim_hex in RIM_COLORS.items():
            # Set rim color
            set_material_color(rim_mat, rim_hex)
            print(f"\n  Rim: {rim_name} ({rim_hex})")
            
            for angle_name, angle_config in CAMERA_ANGLES.items():
                # Setup camera for this angle
                setup_camera(angle_name, angle_config)
                
                # Calculate progress
                render_count += 1
                progress_pct = (render_count / total_renders) * 100
                elapsed_time = time.time() - start_time
                
                # Estimate remaining time
                if render_count > 0:
                    avg_time = elapsed_time / render_count
                    remaining = avg_time * (total_renders - render_count)
                    eta_min = int(remaining // 60)
                    eta_sec = int(remaining % 60)
                else:
                    eta_min = 0
                    eta_sec = 0
                
                # Progress bar
                bar_length = 30
                filled = int(bar_length * progress_pct / 100)
                bar = "█" * filled + "░" * (bar_length - filled)
                
                print(f"\n  [{render_count}/{total_renders}] {progress_pct:.1f}% |{bar}| ETA: {eta_min}m {eta_sec}s")
                
                # Render and save
                render_time = render_and_save(body_name, rim_name, angle_name)
                render_times.append(render_time)
                
                # Update Blender window (forces UI refresh)
                bpy.context.view_layer.update()
    
    total_time = time.time() - start_time
    avg_render_time = sum(render_times) / len(render_times) if render_times else 0
    
    print("\n" + "=" * 60)
    print("BATCH RENDER COMPLETE!")
    print("=" * 60)
    print(f"Total images rendered: {render_count}")
    print(f"Total time: {int(total_time // 60)}m {int(total_time % 60)}s")
    print(f"Average render time: {avg_render_time:.1f}s per image")
    print(f"Output directory: {OUTPUT_DIR}")
    print("=" * 60)
    
    # Show completion message in Blender's UI
    bpy.context.window_manager.popup_menu(
        lambda self, context: (self.layout.label(text=f"✓ Batch render complete!"),
                               self.layout.label(text=f"{render_count} images rendered"),
                               self.layout.label(text=f"Time: {int(total_time // 60)}m {int(total_time % 60)}s")),
        title="Render Complete",
        icon='CHECKMARK'
    )

# Run the script
if __name__ == "__main__":
    main()

