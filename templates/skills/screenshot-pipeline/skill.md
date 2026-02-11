# Screenshot Pipeline Skill

Automated pipeline for capturing application screenshots, compositing them into device frames, and generating animated GIFs for marketing materials and landing pages.

## Overview

This skill provides a complete pipeline for generating professional marketing screenshots:

1. **Capture** - Use Playwright to screenshot app routes at multiple viewports
2. **Frame** - Composite screenshots into realistic device bezels (MacBook, iPhone, iPad, etc.)
3. **Generate GIFs** - Stitch framed screenshots into smooth animated GIFs
4. **Output** - Organized asset directory ready for landing pages

## Quick Start

### 1. Configure the pipeline

Create a config file (typically at `src/config/landingPage.json` or similar):

```json
{
  "enabled": true,
  "routes": [
    { "path": "/dashboard", "name": "Dashboard", "waitFor": "[data-testid='dashboard-loaded']" },
    { "path": "/features", "name": "Features" },
    { "path": "/settings", "name": "Settings" }
  ],
  "viewports": [
    { "name": "desktop", "width": 1440, "height": 900 },
    { "name": "mobile", "width": 390, "height": 844 }
  ],
  "devices": [
    { "name": "macbook-pro", "type": "laptop" },
    { "name": "iphone-15-pro", "type": "phone" }
  ],
  "gif": {
    "frameDelay": 2000,
    "quality": 10,
    "maxSize": 5242880
  },
  "outputDir": "public/landing-assets",
  "baseUrl": "http://localhost:5173"
}
```

### 2. Install dependencies

```bash
npm install sharp gifencoder canvas
```

### 3. Run the pipeline

Use the `/landing-page-generator` slash command:
```
/landing-page-generator pipeline
```

Or run individual steps:
```
/landing-page-generator capture
/landing-page-generator frame
/landing-page-generator generate-gifs
```

## Pipeline Steps

### Step 1: Screenshot Capture

Uses Playwright MCP to navigate to each route at each viewport size and capture screenshots.

**Process:**
1. Launch browser via Playwright MCP
2. For each route in config:
   - For each viewport in config:
     - Navigate to `{baseUrl}{route.path}`
     - Wait for `route.waitFor` selector (if specified)
     - Resize viewport to `{viewport.width} x {viewport.height}`
     - Capture full-page screenshot
     - Save to `{outputDir}/screenshots/{route.name}-{viewport.name}.png`

**Output structure:**
```
{outputDir}/screenshots/
  Dashboard-desktop.png
  Dashboard-mobile.png
  Features-desktop.png
  Features-mobile.png
  Settings-desktop.png
  Settings-mobile.png
```

### Step 2: Device Frame Compositing

Uses Sharp to overlay screenshots onto realistic device bezels.

**Process:**
1. Load device frame template (bezel image with transparent screen area)
2. Resize screenshot to match device screen region
3. Composite screenshot behind bezel layer
4. Output final framed image

**Viewport-to-device mapping:**
- `desktop` (width >= 1024) → laptop frames (MacBook Pro, etc.)
- `mobile` (width < 768) → phone frames (iPhone 15, Galaxy, etc.)
- `tablet` (768 <= width < 1024) → tablet frames (iPad, etc.)

**Output structure:**
```
{outputDir}/framed/
  Dashboard-desktop-macbook-pro.png
  Dashboard-mobile-iphone-15-pro.png
  Features-desktop-macbook-pro.png
  ...
```

### Step 3: GIF Generation

Uses gifencoder + canvas to stitch framed screenshots into animated GIFs.

**Process:**
1. Group framed screenshots by device type
2. For each device group:
   - Create GIF encoder with device output dimensions
   - Set frame delay, quality, and repeat settings
   - Add each framed screenshot as a frame
   - Write animated GIF file
3. Verify file sizes against `maxSize` config

**Output structure:**
```
{outputDir}/gifs/
  macbook-pro-demo.gif
  iphone-15-pro-demo.gif
```

## Configuration Reference

See `references/pipeline-config.md` for the complete configuration schema.

## Device Frames

See `references/device-frames.md` for the catalog of available device templates.

## Viewport Presets

See `references/viewport-presets.md` for standard viewport configurations.

## Integration with Landing Page Generator

This skill is used by the `/landing-page-generator` slash command. The command:
1. Reads your pipeline config
2. Orchestrates capture → frame → GIF steps
3. Generates React components that use the output assets
4. Handles deployment

## Troubleshooting

### Sharp installation fails
Sharp requires native dependencies. On some systems:
```bash
npm install --platform=linuxmusl sharp  # Alpine Linux
npm install sharp --ignore-scripts && npx node-gyp rebuild  # Manual rebuild
```

### GIFs are too large
- Reduce `gif.quality` (lower = smaller, range 1-30)
- Reduce number of routes captured
- Increase `gif.frameDelay` (fewer perceived frames needed)
- Reduce viewport dimensions

### Screenshots are blank or incomplete
- Ensure `waitFor` selectors are correct
- Increase navigation timeout
- Verify `baseUrl` points to a running dev server
- Check that routes require no authentication (or handle auth in pipeline)

### Canvas installation fails
Canvas requires system dependencies:
```bash
# macOS
brew install pkg-config cairo pango libpng jpeg giflib librsvg

# Ubuntu/Debian
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# Windows
# canvas includes pre-built binaries for Windows
```
