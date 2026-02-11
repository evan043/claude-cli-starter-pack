# Device Frame Catalog

Reference catalog of device bezels for the screenshot pipeline. These frames are used to composite screenshots into realistic device mockups.

## Laptop Frames

### MacBook Pro 16" (2024)
- **ID:** `macbook-pro-16`
- **Output Size:** 2144 x 1388
- **Screen Region:** `{ x: 112, y: 80, width: 1920, height: 1200 }`
- **Bezel Color:** Space Black / Silver
- **Best For:** Desktop screenshots at 1440x900 or 1920x1200

### MacBook Air 15" (2024)
- **ID:** `macbook-air-15`
- **Output Size:** 2064 x 1340
- **Screen Region:** `{ x: 102, y: 76, width: 1860, height: 1162 }`
- **Bezel Color:** Midnight / Starlight / Silver
- **Best For:** Desktop screenshots at 1440x900

### Generic Laptop
- **ID:** `generic-laptop`
- **Output Size:** 2000 x 1300
- **Screen Region:** `{ x: 100, y: 70, width: 1800, height: 1125 }`
- **Bezel Color:** Dark Gray
- **Best For:** When brand-agnostic mockups are needed

## Phone Frames

### iPhone 15 Pro
- **ID:** `iphone-15-pro`
- **Output Size:** 478 x 976
- **Screen Region:** `{ x: 19, y: 18, width: 440, height: 940 }`
- **Bezel Color:** Natural Titanium / Blue Titanium / White Titanium / Black Titanium
- **Best For:** Mobile screenshots at 390x844

### iPhone 15
- **ID:** `iphone-15`
- **Output Size:** 472 x 966
- **Screen Region:** `{ x: 16, y: 16, width: 440, height: 934 }`
- **Bezel Color:** Pink / Yellow / Green / Blue / Black
- **Best For:** Mobile screenshots at 390x844

### Samsung Galaxy S24 Ultra
- **ID:** `galaxy-s24-ultra`
- **Output Size:** 480 x 1004
- **Screen Region:** `{ x: 14, y: 14, width: 452, height: 976 }`
- **Bezel Color:** Titanium Gray / Titanium Black / Titanium Violet / Titanium Yellow
- **Best For:** Android mobile screenshots at 412x915

### Google Pixel 8
- **ID:** `pixel-8`
- **Output Size:** 464 x 980
- **Screen Region:** `{ x: 16, y: 18, width: 432, height: 944 }`
- **Bezel Color:** Obsidian / Hazel / Rose
- **Best For:** Android mobile screenshots at 412x915

### Generic Phone
- **ID:** `generic-phone`
- **Output Size:** 460 x 960
- **Screen Region:** `{ x: 15, y: 15, width: 430, height: 930 }`
- **Bezel Color:** Black
- **Best For:** When brand-agnostic mockups are needed

## Tablet Frames

### iPad Pro 12.9"
- **ID:** `ipad-pro-12`
- **Output Size:** 1148 x 1548
- **Screen Region:** `{ x: 40, y: 40, width: 1068, height: 1468 }`
- **Bezel Color:** Space Gray / Silver
- **Best For:** Tablet screenshots at 1024x1366

### iPad Air
- **ID:** `ipad-air`
- **Output Size:** 900 x 1228
- **Screen Region:** `{ x: 32, y: 36, width: 836, height: 1156 }`
- **Bezel Color:** Space Gray / Starlight / Purple / Blue
- **Best For:** Tablet screenshots at 820x1180

### Samsung Galaxy Tab S9
- **ID:** `galaxy-tab-s9`
- **Output Size:** 920 x 1260
- **Screen Region:** `{ x: 34, y: 38, width: 852, height: 1184 }`
- **Bezel Color:** Graphite / Beige
- **Best For:** Android tablet screenshots at 800x1200

### Generic Tablet
- **ID:** `generic-tablet`
- **Output Size:** 900 x 1240
- **Screen Region:** `{ x: 30, y: 35, width: 840, height: 1170 }`
- **Bezel Color:** Black
- **Best For:** When brand-agnostic mockups are needed

## Custom Frames

You can add custom device frames by adding entries to the config:

```json
{
  "devices": [
    {
      "name": "my-custom-device",
      "bezelPath": "assets/device-frames/my-device.png",
      "screenRegion": { "x": 50, "y": 50, "width": 800, "height": 600 },
      "outputSize": { "width": 900, "height": 700 }
    }
  ]
}
```

### Creating Custom Bezel Images

1. Design the device frame as a PNG with transparent screen area
2. Note the exact pixel coordinates of the screen area (x, y, width, height)
3. Set `outputSize` to the full dimensions of the bezel image
4. Add the entry to your pipeline config

## Viewport-to-Device Mapping

The pipeline automatically maps viewport sizes to device frames:

| Viewport Width | Category | Default Device |
|---------------|----------|---------------|
| < 768px | Phone | `iphone-15-pro` |
| 768px - 1023px | Tablet | `ipad-air` |
| >= 1024px | Laptop | `macbook-pro-16` |

Override the default mapping in your config:
```json
{
  "viewportDeviceMap": {
    "mobile": "galaxy-s24-ultra",
    "tablet": "ipad-pro-12",
    "desktop": "macbook-air-15"
  }
}
```
