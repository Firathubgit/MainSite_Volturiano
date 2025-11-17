# Blender Batch Render Guide for 2D Configurator

This guide explains how to use the automated Blender script to render all combinations of body paint and rim colors for the 2D configurator.

## Quick Start

1. **Open your Blender file** with the Volturiano car model
2. **Go to Scripting workspace** (top menu bar)
3. **Open the script**: `docs/configurator3d/blender-batch-render-script.py`
4. **Update the configuration section** at the top:
   - Add your 5 body paint colors (hex codes)
   - Add your 3 rim colors (hex codes)
   - Set your output directory path
   - Verify material names match (`Mat_BodyPaint`, `Mat_RimPaint`)
5. **Run the script**: Press `Alt+P` or click "Run Script" button

## What Gets Rendered

The script renders **45 images total**:
- **5 body colors** × **3 rim colors** × **3 angles** = 45 images

### Angles
- `front-3q` - Front 3/4 view
- `side` - Pure side view  
- `rear-3q` - Rear 3/4 view

### Output Naming
Files are saved as: `{body_color}_{rim_color}_{angle}.webp`

Examples:
- `orange-fury_black_front-3q.webp`
- `nero-black_silver_side.webp`
- `rosso-red_bronze_rear-3q.webp`

## Configuration

### Color Definitions

Update these dictionaries in the script:

```python
BODY_COLORS = {
    "orange-fury": "#FF4520",
    "nero-black": "#111111",
    "bianco-white": "#FFFFFF",
    "rosso-red": "#CC0000",
    "blu-blue": "#0066CC",
}

RIM_COLORS = {
    "black": "#111111",
    "silver": "#CCCCCC",
    "bronze": "#CD7F32",
}
```

**Important**: The keys (like `"orange-fury"`, `"black"`) will be used in filenames, so use URL-friendly names (lowercase, hyphens).

### Camera Setup

The script automatically creates cameras for each angle. You can adjust positions/rotations in:

```python
CAMERA_ANGLES = {
    "front-3q": {
        "location": (6, -4, 1.8),
        "rotation": (1.2, 0, 0.785),
    },
    # ...
}
```

**Tip**: Test one render first, then adjust camera positions if needed.

### Output Directory

Set your output path:

```python
OUTPUT_DIR = "C:/Users/Firat/Documents/Projects/MainSite_Volturiano/web/src/assets/Configurator/volturiano"
```

**Note**: Use forward slashes `/` or double backslashes `\\` in Windows paths.

## Render Settings

### Resolution
Default: `1920x1080` (16:9 aspect ratio)

Change if needed:
```python
RENDER_RESOLUTION_X = 1920
RENDER_RESOLUTION_Y = 1080
```

### Format & Quality
Default: WEBP at 90% quality

For PNG (lossless):
```python
RENDER_FORMAT = "PNG"
```

### Render Engine

The script uses **Cycles** by default. To use Eevee (faster, less realistic):

```python
scene.render.engine = 'BLENDER_EEVEE'
```

**Cycles settings**:
- Samples: 128 (balance between quality and speed)
- Denoising: Enabled

For higher quality, increase samples:
```python
scene.cycles.samples = 256  # or 512 for final renders
```

## Material Setup

### Verify Material Names

The script looks for these materials:
- `Mat_BodyPaint` - Car body material
- `Mat_RimPaint` - Rim material

**To check material names**:
1. Select the car body mesh
2. Go to Material Properties panel
3. Verify the material name matches

**To rename a material**:
1. Select the material in the Material Properties
2. Click the name field and rename it

### Material Node Setup

The script expects materials with **Principled BSDF** nodes. It sets the `Base Color` input.

If your materials use different node setups, you may need to modify the `set_material_color()` function.

## Troubleshooting

### "Material not found" Error

**Solution**: Check that material names exactly match:
- Material names are case-sensitive
- Check for extra spaces
- Verify materials are assigned to meshes

### Camera Not Pointing Correctly

**Solution**: 
1. Run a single test render first
2. Adjust camera positions in `CAMERA_ANGLES`
3. Use Blender's camera view (Numpad 0) to preview

### Colors Look Wrong

**Solution**:
- Verify hex color codes are correct (include `#`)
- Check that materials use Principled BSDF nodes
- Ensure materials aren't using emission or other color overrides

### Slow Rendering

**Solutions**:
- Use Eevee engine instead of Cycles (faster, less realistic)
- Reduce Cycles samples (e.g., 64 instead of 128)
- Lower resolution for test renders
- Use GPU rendering (enable in Preferences > System)

### Output Directory Not Found

**Solution**: 
- Create the directory manually first
- Or update `OUTPUT_DIR` to an existing path
- Use absolute paths (full path from C:\)

## Advanced: Custom Camera Setup

If you already have cameras set up in your scene, you can modify the script to use them:

```python
def setup_camera(angle_name, angle_config):
    # Use existing camera if it exists
    cam_name = f"Camera_{angle_name}"
    if cam_name in bpy.data.objects:
        cam = bpy.data.objects[cam_name]
        bpy.context.scene.camera = cam
        return cam
    # ... rest of function
```

## Next Steps

After rendering:

1. **Verify all 45 images** were created
2. **Check image quality** - adjust render settings if needed
3. **Optimize images** (optional):
   - Use image optimization tools
   - Consider creating @2x versions for retina displays
4. **Update manifest** - Add these images to your 2D configurator manifest
5. **Test in configurator** - Verify images load and composite correctly

## File Structure

After rendering, your output directory should look like:

```
volturiano/
├── orange-fury_black_front-3q.webp
├── orange-fury_black_side.webp
├── orange-fury_black_rear-3q.webp
├── orange-fury_silver_front-3q.webp
├── orange-fury_silver_side.webp
├── orange-fury_silver_rear-3q.webp
├── orange-fury_bronze_front-3q.webp
├── ...
└── blu-blue_bronze_rear-3q.webp
```

Total: 45 files (5 × 3 × 3)

