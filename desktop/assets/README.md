# App Icons

This directory should contain the application icons in various formats:

- **icon.png** - PNG icon for Linux (512x512 pixels recommended)
- **icon.icns** - macOS icon bundle (can be generated from PNG)
- **icon.ico** - Windows icon (can be generated from PNG)

## How to Create Icons

### Option 1: Use an online converter

1. Create or obtain a 512x512 PNG image
2. Use a service like:
   - https://www.icoconverter.com/ (for .ico)
   - https://iconverticons.com/ (for .icns)
   - https://cloudconvert.com/

### Option 2: Use command-line tools

**For macOS (.icns):**
```bash
# Install imagemagick
brew install imagemagick

# Convert PNG to iconset
mkdir icon.iconset
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png

# Create .icns
iconutil -c icns icon.iconset
```

**For Windows (.ico):**
```bash
# Install imagemagick
# Windows: Download from https://imagemagick.org/script/download.php
# Linux: apt-get install imagemagick

convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico
```

**For Linux (.png):**
Just use a high-resolution PNG (512x512 or 1024x1024)

## Using electron-icon-builder

The easiest way is to use a package:

```bash
npm install -g electron-icon-builder

# Place your base icon as icon.png (1024x1024) in this directory
# Then run:
electron-icon-builder --input=./icon.png --output=./
```

## Default Icon

If you don't provide custom icons, Electron will use the default Electron icon.
For a production app, you should replace these with your own branded icons.

## Recommended Base Image

Create a 1024x1024 PNG with:
- Transparent background
- Simple, recognizable design
- Clear at small sizes
- Brand colors

## Current Status

⚠️ This directory contains placeholder information.
Add your actual icon files before building for production.
