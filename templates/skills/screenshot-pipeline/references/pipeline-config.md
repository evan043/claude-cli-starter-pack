# Pipeline Configuration Reference

Complete configuration schema for the screenshot pipeline.

## Configuration File

The pipeline reads from a JSON config file (path is configurable per project, commonly `src/config/landingPage.json`).

## Full Schema

```json
{
  "enabled": true,
  "routes": [],
  "viewports": [],
  "devices": [],
  "viewportDeviceMap": {},
  "gif": {},
  "outputDir": "public/landing-assets",
  "baseUrl": "http://localhost:5173",
  "lastModified": "2026-01-01T00:00:00.000Z",
  "modifiedBy": "Claude Code CLI"
}
```

## Field Reference

### `enabled` (boolean)
Whether the landing page is active in production routing.
- `true` — Root URL shows landing page
- `false` — Root URL shows main application

### `routes` (array)
Application routes to capture screenshots from.

```json
{
  "routes": [
    {
      "path": "/dashboard",
      "name": "Dashboard",
      "waitFor": "[data-testid='dashboard-loaded']",
      "delay": 1000,
      "hideSelectors": [".cookie-banner", ".notification-toast"],
      "clickBefore": "[data-testid='show-features-btn']",
      "auth": false
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | yes | URL path relative to baseUrl |
| `name` | string | yes | Human-readable name (used in filenames) |
| `waitFor` | string | no | CSS selector to wait for before capture |
| `delay` | number | no | Additional delay in ms after page load |
| `hideSelectors` | string[] | no | CSS selectors to hide before capture |
| `clickBefore` | string | no | CSS selector to click before capture |
| `auth` | boolean | no | Whether route requires authentication |
| `fullPage` | boolean | no | Capture full scrollable page (default: false) |
| `clip` | object | no | Capture specific region: `{ x, y, width, height }` |

### `viewports` (array)
Screen sizes to capture each route at.

```json
{
  "viewports": [
    {
      "name": "desktop",
      "width": 1440,
      "height": 900,
      "deviceScaleFactor": 1,
      "isMobile": false,
      "hasTouch": false,
      "isLandscape": false
    }
  ]
}
```

See `viewport-presets.md` for standard configurations and all available fields.

### `devices` (array)
Device frames to apply to captured screenshots.

```json
{
  "devices": [
    {
      "name": "macbook-pro-16",
      "type": "laptop",
      "bezelPath": "assets/device-frames/macbook-pro-16.png",
      "screenRegion": { "x": 112, "y": 80, "width": 1920, "height": 1200 },
      "outputSize": { "width": 2144, "height": 1388 },
      "shadow": true,
      "backgroundColor": "#f5f5f5"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Device identifier |
| `type` | string | yes | Category: `laptop`, `phone`, `tablet` |
| `bezelPath` | string | no | Path to device bezel PNG (transparent screen) |
| `screenRegion` | object | yes* | `{ x, y, width, height }` of screen area in bezel |
| `outputSize` | object | yes* | `{ width, height }` of final composited image |
| `shadow` | boolean | no | Add drop shadow behind device (default: false) |
| `backgroundColor` | string | no | Background color behind device (default: transparent) |

*Required if `bezelPath` is provided. If no bezel, screenshots are used as-is.

See `device-frames.md` for the full catalog with dimensions.

### `viewportDeviceMap` (object)
Override automatic viewport-to-device mapping.

```json
{
  "viewportDeviceMap": {
    "mobile": "iphone-15-pro",
    "tablet": "ipad-air",
    "desktop": "macbook-pro-16"
  }
}
```

Default mapping:
- `width < 768` → first phone device
- `768 <= width < 1024` → first tablet device
- `width >= 1024` → first laptop device

### `gif` (object)
Animated GIF generation settings.

```json
{
  "gif": {
    "frameDelay": 2000,
    "quality": 10,
    "maxSize": 5242880,
    "repeat": 0,
    "transparent": false,
    "width": null,
    "height": null
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `frameDelay` | number | 2000 | Milliseconds per frame |
| `quality` | number | 10 | GIF quality (1 = best, 30 = worst) |
| `maxSize` | number | 5242880 | Max file size in bytes (5MB) |
| `repeat` | number | 0 | 0 = loop forever, -1 = no repeat, N = repeat N times |
| `transparent` | boolean | false | Enable transparency in GIF |
| `width` | number | null | Override output width (null = use device width) |
| `height` | number | null | Override output height (null = use device height) |

### `outputDir` (string)
Directory for pipeline output. Relative to project root.

Default: `"public/landing-assets"`

**Output structure:**
```
{outputDir}/
  screenshots/           # Raw screenshots
    {route}-{viewport}.png
  framed/                # Device-framed screenshots
    {route}-{viewport}-{device}.png
  gifs/                  # Animated GIFs
    {device}-demo.gif
  manifest.json          # Asset manifest with paths and metadata
```

### `baseUrl` (string)
Base URL for screenshot capture. Usually your local dev server.

Default: `"http://localhost:5173"`

### `lastModified` (string)
ISO 8601 timestamp of last config modification. Updated automatically by `/landing-page-toggle`.

### `modifiedBy` (string)
Who last modified the config. Updated automatically.

## Example Configurations

### Minimal Config
```json
{
  "enabled": false,
  "routes": [
    { "path": "/", "name": "Home" }
  ],
  "viewports": [
    { "name": "desktop", "width": 1440, "height": 900 },
    { "name": "mobile", "width": 390, "height": 844 }
  ],
  "devices": [
    { "name": "macbook-pro-16", "type": "laptop" },
    { "name": "iphone-15-pro", "type": "phone" }
  ],
  "gif": { "frameDelay": 2000, "quality": 10 },
  "outputDir": "public/landing-assets",
  "baseUrl": "http://localhost:5173"
}
```

### Full-Featured Config
```json
{
  "enabled": true,
  "routes": [
    { "path": "/dashboard", "name": "Dashboard", "waitFor": ".dashboard-ready" },
    { "path": "/features", "name": "Features" },
    { "path": "/analytics", "name": "Analytics", "delay": 2000 },
    { "path": "/settings", "name": "Settings" },
    { "path": "/profile", "name": "Profile", "hideSelectors": [".avatar-placeholder"] }
  ],
  "viewports": [
    { "name": "desktop", "width": 1440, "height": 900 },
    { "name": "tablet", "width": 820, "height": 1180 },
    { "name": "mobile", "width": 390, "height": 844 }
  ],
  "devices": [
    { "name": "macbook-pro-16", "type": "laptop" },
    { "name": "ipad-air", "type": "tablet" },
    { "name": "iphone-15-pro", "type": "phone" }
  ],
  "viewportDeviceMap": {
    "desktop": "macbook-pro-16",
    "tablet": "ipad-air",
    "mobile": "iphone-15-pro"
  },
  "gif": {
    "frameDelay": 2500,
    "quality": 8,
    "maxSize": 5242880,
    "repeat": 0
  },
  "outputDir": "public/landing-assets",
  "baseUrl": "http://localhost:5173"
}
```

## Asset Manifest

After running the pipeline, a `manifest.json` is generated in the output directory:

```json
{
  "generatedAt": "2026-02-09T12:00:00.000Z",
  "screenshots": [
    {
      "route": "Dashboard",
      "viewport": "desktop",
      "path": "screenshots/Dashboard-desktop.png",
      "width": 1440,
      "height": 900
    }
  ],
  "framed": [
    {
      "route": "Dashboard",
      "viewport": "desktop",
      "device": "macbook-pro-16",
      "path": "framed/Dashboard-desktop-macbook-pro-16.png",
      "width": 2144,
      "height": 1388
    }
  ],
  "gifs": [
    {
      "device": "macbook-pro-16",
      "path": "gifs/macbook-pro-16-demo.gif",
      "frames": 5,
      "fileSize": 3245678
    }
  ]
}
```

Use this manifest in your React components to reference assets by route/device/viewport.
