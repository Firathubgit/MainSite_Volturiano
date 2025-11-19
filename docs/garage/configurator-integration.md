# Configurator Integration Guide

**Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** Complete  
**Feature Owner:** Development Team

---

## Overview

This guide explains how to integrate the 2D and 3D configurators with the garage version history system. The system automatically detects configurator types, handles conversions, and provides comprehensive version tracking.

---

## Quick Start

### Saving from 2D Configurator

```javascript
import { createGarageItem } from '../features/account/api';

const config2D = {
  schemaVersion: 1,
  vehicle: {
    model: "Tornado GT",
    trim: "Launch Edition"
  },
  options: {
    exterior: [
      { id: "paint_blu_blue", label: "Blu Blue", price: 0 }
    ],
    rim: [
      { id: "rim_black", label: "Black", price: 0 }
    ]
  },
  pricing: {
    basePriceCents: 18000000,
    optionsTotalCents: 0,
    currency: "EUR"
  },
  metadata: {
    configurator: {
      type: "2d",
      manifestId: "tornado-gt-launch",
      cameraAngle: "front-3q"
    }
  },
  history: {
    source: "configurator",
    configuratorType: "2d"
  }
};

const { data, error } = await createGarageItem({
  title: "My Configuration",
  vehicle_model: "Tornado GT",
  config_payload: config2D
});
```

### Saving from 3D Configurator

```javascript
const config3D = {
  schemaVersion: 1,
  vehicle: {
    model: "Tornado GT"
  },
  options: {
    exterior: [
      { id: "paint_blu_blue", hex: "#060FE7", label: "Blu Blue" }
    ],
    rim: [
      { id: "rim_black", hex: "#111111", label: "Black" }
    ]
  },
  pricing: {
    basePriceCents: 18000000,
    optionsTotalCents: 0,
    currency: "EUR"
  },
  metadata: {
    configurator: {
      type: "3d",
      materialSettings: {
        metalness: 0.8,
        roughness: 0.2,
        envMapIntensity: 1.5
      },
      environment: "studio_06"
    }
  },
  history: {
    source: "configurator",
    configuratorType: "3d"
  }
};

const { data, error } = await createGarageItem({
  title: "My 3D Configuration",
  vehicle_model: "Tornado GT",
  config_payload: config3D
});
```

---

## Automatic Type Detection

The system automatically detects configurator types even if not explicitly set:

```javascript
import { detectConfiguratorType } from '../features/garage/utils/configuratorType';

const type = detectConfiguratorType(config);
// Returns: "2d" | "3d" | "hybrid" | "unknown"
```

**Detection Logic:**

- **2D**: Checks for `manifestId`, `cameraAngle`, or option IDs (e.g., "paint_blu_blue")
- **3D**: Checks for `materialSettings`, `environment`, or hex colors in options
- **Hybrid**: Contains indicators from both types
- **Unknown**: No clear indicators

---

## Normalization

Configurations are automatically normalized when saved:

```javascript
import { normalizeConfiguratorMetadata } from '../features/garage/utils/configuratorType';

const normalized = normalizeConfiguratorMetadata(config, { detectedType: "2d" });
```

Normalization ensures:
- Configurator type is set in both `history.configuratorType` and `metadata.configurator.type`
- Configurator version is set
- Type-specific fields are properly structured
- Default values are set for missing fields

---

## Conversion Between Types

### Convert 2D to 3D

```javascript
import { convert2DTo3D } from '../features/garage/utils/configuratorAdapters';

const config3D = convert2DTo3D(config2D);
// Option IDs converted to hex colors
// Camera angles converted to 3D positions
// 3D-specific metadata added
```

### Convert 3D to 2D

```javascript
import { convert3DTo2D } from '../features/garage/utils/configuratorAdapters';

const config2D = convert3DTo2D(config3D, {
  manifestId: "tornado-gt-launch",
  cameraAngle: "front-3q"
});
// Hex colors converted to option IDs
// 3D positions converted to camera angles
// 2D-specific metadata added
```

### Using Registry

```javascript
import { convertConfig } from '../features/garage/utils/configuratorRegistry';

const converted = convertConfig(config, "3d", {
  manifestId: "tornado-gt-launch"
});
```

---

## Color Mapping

The system provides bidirectional color mapping:

```javascript
import { getColorHex, getColorOptionId } from '../features/garage/utils/colorMappings';

// Option ID → Hex
const hex = getColorHex("paint_blu_blue"); // "#060FE7"

// Hex → Option ID
const optionId = getColorOptionId("#060FE7", "exterior"); // "paint_blu_blue"
```

**Supported Colors:**

- Body: `paint_blu_blue`, `paint_nero_black`, `paint_bianco_white`, `paint_rosso_red`, `paint_orange_fury`
- Rim: `rim_black`, `rim_silver`, `rim_bronze`

---

## Validation

Validate configurations before saving:

```javascript
import { validateConfig } from '../features/garage/utils/configuratorValidator';

const result = validateConfig(config);
// Returns: { valid: boolean, errors: Array<string>, warnings: Array<string> }

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
if (result.warnings.length > 0) {
  console.warn('Validation warnings:', result.warnings);
}
```

**Validation Checks:**

- **2D Configs**: Validates `manifestId`, `cameraAngle`, option IDs (not hex)
- **3D Configs**: Validates `materialSettings`, `environment`, hex color format
- **Metadata**: Validates configurator metadata structure

---

## Version History Integration

### Viewing Versions

Versions automatically show configurator type:

```javascript
import { useGarageStore } from '../../../stores/garageStore';

const loadVersions = useGarageStore((state) => state.loadVersions);
const { data: versions } = await loadVersions(itemId);

versions.forEach(version => {
  const type = detectConfiguratorType(version.snapshot);
  console.log(`Version ${version.version_number}: ${type}`);
});
```

### Diff Visualization

Diffs automatically highlight configurator changes:

```javascript
import { diffConfig, getConfiguratorTypeChange } from '../utils/diffConfig';

const diffs = diffConfig(oldConfig, newConfig);
const typeChange = getConfiguratorTypeChange(diffs);

if (typeChange) {
  console.log(`Configurator type changed: ${typeChange.from} → ${typeChange.to}`);
  if (typeChange.conversionNote) {
    console.log(`Note: ${typeChange.conversionNote}`);
  }
}
```

---

## Migration from Legacy Configs

Legacy configs (without configurator type) are automatically migrated:

```javascript
import { autoMigrateConfig } from '../utils/migrateConfigs';

const migrated = autoMigrateConfig(legacyConfig);
// Type detected and metadata normalized
```

Migration happens automatically when:
- Loading garage items
- Loading version history
- Updating configurations

---

## Best Practices

### 1. Always Set Configurator Type

```javascript
// Good
const config = {
  metadata: {
    configurator: {
      type: "2d",
      manifestId: "tornado-gt-launch",
      cameraAngle: "front-3q"
    }
  },
  history: {
    configuratorType: "2d"
  }
};

// Better: Let system auto-detect and normalize
const normalized = normalizeConfiguratorMetadata(config);
```

### 2. Use Option IDs for 2D, Hex for 3D

```javascript
// 2D: Use option IDs
options: {
  exterior: [{ id: "paint_blu_blue", label: "Blu Blue" }]
}

// 3D: Include hex colors
options: {
  exterior: [{ id: "paint_blu_blue", hex: "#060FE7", label: "Blu Blue" }]
}
```

### 3. Validate Before Saving

```javascript
const validation = await validateConfig(config);
if (!validation.valid) {
  // Show errors to user
  return;
}
```

### 4. Handle Conversions Carefully

```javascript
// Check compatibility before converting
import { isCompatible } from '../utils/configuratorRegistry';

if (isCompatible("2d", "3d")) {
  const converted = convertConfig(config, "3d");
}
```

---

## Troubleshooting

### Type Detection Fails

**Problem**: Type detected as "unknown"

**Solutions**:
1. Ensure configurator metadata is present
2. Check that options use correct format (IDs for 2D, hex for 3D)
3. Explicitly set `metadata.configurator.type`

### Conversion Errors

**Problem**: Conversion fails or produces incorrect results

**Solutions**:
1. Validate source config before conversion
2. Ensure color mappings are complete
3. Check that required fields are present (e.g., `manifestId` for 2D)

### Validation Errors

**Problem**: Config fails validation

**Solutions**:
1. Check validation error messages
2. Ensure required fields are present
3. Verify field types match schema
4. Check configurator-specific requirements

---

## API Reference

### Type Detection

- `detectConfiguratorType(config)` - Detect type from config
- `normalizeConfiguratorMetadata(config, options)` - Normalize metadata
- `validateConfiguratorCompatibility(config1, config2)` - Check compatibility

### Conversion

- `convert2DTo3D(config2D)` - Convert 2D to 3D
- `convert3DTo2D(config3D, options)` - Convert 3D to 2D
- `normalizeForDiff(config)` - Normalize for diff comparison
- `convertConfig(config, targetType, options)` - Convert via registry

### Validation

- `validate2DConfig(config)` - Validate 2D config
- `validate3DConfig(config)` - Validate 3D config
- `validateConfig(config)` - Comprehensive validation

### Migration

- `autoMigrateConfig(config)` - Auto-migrate legacy config
- `migrateLegacyConfig(config)` - Migrate legacy config
- `checkMigrationNeeded(config)` - Check if migration needed

---

## Examples

See `docs/garage/version-history.md` for complete examples of:
- Loading version history
- Restoring versions
- Calculating diffs
- Handling conversions

---

**End of Configurator Integration Guide**

