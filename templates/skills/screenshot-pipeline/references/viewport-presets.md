# Viewport Presets

Standard viewport configurations for the screenshot pipeline. These presets cover common device sizes used in marketing materials.

## Standard Presets

### Phone Viewports

| Preset | Width | Height | Matches |
|--------|-------|--------|---------|
| `iphone-15-pro` | 393 | 852 | iPhone 15 Pro, iPhone 14 Pro |
| `iphone-15` | 390 | 844 | iPhone 15, iPhone 14, iPhone 13 |
| `iphone-se` | 375 | 667 | iPhone SE, iPhone 8, iPhone 7 |
| `galaxy-s24` | 412 | 915 | Samsung Galaxy S24, S23, S22 |
| `pixel-8` | 412 | 915 | Google Pixel 8, Pixel 7 |
| `mobile-sm` | 360 | 800 | Small Android phones |
| `mobile-lg` | 428 | 926 | iPhone 15 Plus, iPhone 14 Plus |

### Tablet Viewports

| Preset | Width | Height | Matches |
|--------|-------|--------|---------|
| `ipad-pro-12` | 1024 | 1366 | iPad Pro 12.9" |
| `ipad-pro-11` | 834 | 1194 | iPad Pro 11" |
| `ipad-air` | 820 | 1180 | iPad Air, iPad 10th gen |
| `ipad-mini` | 768 | 1024 | iPad Mini |
| `galaxy-tab` | 800 | 1280 | Samsung Galaxy Tab S series |
| `tablet-landscape` | 1180 | 820 | Any tablet in landscape |

### Desktop Viewports

| Preset | Width | Height | Matches |
|--------|-------|--------|---------|
| `desktop-hd` | 1440 | 900 | Standard HD desktop |
| `desktop-fhd` | 1920 | 1080 | Full HD (1080p) |
| `desktop-qhd` | 2560 | 1440 | QHD (1440p) |
| `desktop-4k` | 3840 | 2160 | 4K UHD |
| `laptop-13` | 1280 | 800 | 13" laptop displays |
| `laptop-15` | 1440 | 900 | 15" laptop displays |
| `laptop-16` | 1728 | 1117 | 16" laptop displays (Retina) |
| `ultrawide` | 3440 | 1440 | Ultrawide monitors |

## Recommended Combinations

### Minimal Set (2 viewports)
Best for simple landing pages with desktop + mobile comparison:
```json
{
  "viewports": [
    { "name": "desktop", "width": 1440, "height": 900 },
    { "name": "mobile", "width": 390, "height": 844 }
  ]
}
```

### Standard Set (3 viewports)
Covers all major device categories:
```json
{
  "viewports": [
    { "name": "desktop", "width": 1440, "height": 900 },
    { "name": "tablet", "width": 820, "height": 1180 },
    { "name": "mobile", "width": 390, "height": 844 }
  ]
}
```

### Comprehensive Set (5 viewports)
For maximum device coverage in marketing materials:
```json
{
  "viewports": [
    { "name": "desktop-fhd", "width": 1920, "height": 1080 },
    { "name": "laptop", "width": 1440, "height": 900 },
    { "name": "tablet", "width": 820, "height": 1180 },
    { "name": "mobile-large", "width": 428, "height": 926 },
    { "name": "mobile", "width": 390, "height": 844 }
  ]
}
```

### Cross-Platform Set (4 viewports)
For showcasing both iOS and Android compatibility:
```json
{
  "viewports": [
    { "name": "desktop", "width": 1440, "height": 900 },
    { "name": "iphone", "width": 393, "height": 852 },
    { "name": "android", "width": 412, "height": 915 },
    { "name": "ipad", "width": 820, "height": 1180 }
  ]
}
```

## Custom Viewports

Add any custom viewport by specifying width and height:

```json
{
  "viewports": [
    { "name": "my-custom", "width": 1600, "height": 1000, "deviceScaleFactor": 2 }
  ]
}
```

### Optional Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | string | required | Identifier used in output filenames |
| `width` | number | required | Viewport width in CSS pixels |
| `height` | number | required | Viewport height in CSS pixels |
| `deviceScaleFactor` | number | 1 | Pixel density multiplier (2 for Retina) |
| `isMobile` | boolean | auto | Set mobile user agent (auto-detected from width < 768) |
| `hasTouch` | boolean | auto | Enable touch events (auto-detected from isMobile) |
| `isLandscape` | boolean | false | Use landscape orientation |

## Viewport Selection Tips

- **For GIF hero sections**: Use 2-3 viewports max (more viewports = larger GIF file size)
- **For feature gallery**: Desktop-only is usually sufficient
- **For app store screenshots**: Match exact device viewport (e.g., iPhone 15 Pro = 393x852)
- **For responsive showcase**: Use the Standard Set (desktop + tablet + mobile)
- **For email marketing**: Desktop (600px width for email clients) + mobile
