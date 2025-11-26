# Favicon Optimization Guide

## Issue
If your favicon appears too small compared to the text in the browser tab, it's likely because the logo has too much transparent padding around it.

## Solution

### Option 1: Use an Online Favicon Generator (Recommended)
1. Go to https://realfavicongenerator.net/ or https://favicon.io/
2. Upload your `TornadoLogo.png`
3. Adjust the padding/margin settings to minimize transparent space
4. Download the generated favicons
5. Replace the files in `/public/` folder

### Option 2: Manual Image Editing
1. Open `TornadoLogo.png` in an image editor (Photoshop, GIMP, Figma, etc.)
2. Create a new canvas: 32x32 pixels (for standard favicon)
3. Place your logo, ensuring it fills **80-90%** of the canvas (minimal padding)
4. Export as PNG
5. Replace `/public/favicon-32x32.png`

### Option 3: Use ImageMagick (Command Line)
```bash
# Install ImageMagick first, then:
magick convert src/assets/Logo/TornadoLogo.png -resize 28x28 -gravity center -extent 32x32 -background transparent public/favicon-32x32.png
```

## Best Practices
- **Logo should fill 80-90% of the favicon canvas**
- **Minimal transparent padding** (2-4 pixels max)
- **Use square canvas** (favicons are always square)
- **Test in browser** after changes (hard refresh: Ctrl+Shift+R)

## Current Setup
- Favicon files are in `/web/public/`
- Multiple sizes: 32x32, 192x192, 512x512
- Referenced in `/web/index.html`

