-- Comprehensive Tornado GT Manifest Seed
-- This manifest maps to existing assets in web/src/assets/Configurator/volturiano/
-- Asset naming pattern: {bodyColor}_{rimColor}_{angle}.webp

insert into config_2d_manifests (id, slug, version, status, data, metadata)
values (
  'aaaa1111-0000-4000-8000-000000000001',
  'tornado-gt-launch',
  1,
  'published',
  '{
    "schemaVersion": 1,
    "id": "tornado-gt-launch",
    "vehicleModel": "tornado-gt",
    "localeBundle": "configurator.tornadoGT",
    "angles": ["front-3q", "side", "rear-3q", "rim"],
    "layers": [
      {
        "id": "background",
        "type": "image",
        "zIndex": 0,
        "dependencies": [],
        "assets": {
          "default": "/assets/Configurator/volturiano/blu-blue_black_front-3q.webp"
        },
        "parallaxDepth": 0,
        "blendMode": "normal"
      },
      {
        "id": "body",
        "type": "image",
        "zIndex": 10,
        "dependencies": [],
        "assets": {
          "blu-blue": {
            "front-3q": "/assets/Configurator/volturiano/blu-blue_black_front-3q.webp",
            "side": "/assets/Configurator/volturiano/blu-blue_black_side.webp",
            "rear-3q": "/assets/Configurator/volturiano/blu-blue_black_rear-3q.webp",
            "rim": "/assets/Configurator/volturiano/blu-blue_black_rim.webp"
          },
          "nero-black": {
            "front-3q": "/assets/Configurator/volturiano/nero-black_black_front-3q.webp",
            "side": "/assets/Configurator/volturiano/nero-black_black_side.webp",
            "rear-3q": "/assets/Configurator/volturiano/nero-black_black_rear-3q.webp",
            "rim": "/assets/Configurator/volturiano/nero-black_black_rim.webp"
          },
          "bianco-white": {
            "front-3q": "/assets/Configurator/volturiano/bianco-white_black_front-3q.webp",
            "side": "/assets/Configurator/volturiano/bianco-white_black_side.webp",
            "rear-3q": "/assets/Configurator/volturiano/bianco-white_black_rear-3q.webp",
            "rim": "/assets/Configurator/volturiano/bianco-white_black_rim.webp"
          },
          "rosso-red": {
            "front-3q": "/assets/Configurator/volturiano/rosso-red_black_front-3q.webp",
            "side": "/assets/Configurator/volturiano/rosso-red_black_side.webp",
            "rear-3q": "/assets/Configurator/volturiano/rosso-red_black_rear-3q.webp",
            "rim": "/assets/Configurator/volturiano/rosso-red_black_rim.webp"
          },
          "orange-fury": {
            "front-3q": "/assets/Configurator/volturiano/orange-fury_black_front-3q.webp",
            "side": "/assets/Configurator/volturiano/orange-fury_black_side.webp",
            "rear-3q": "/assets/Configurator/volturiano/orange-fury_black_rear-3q.webp",
            "rim": "/assets/Configurator/volturiano/orange-fury_black_rim.webp"
          }
        },
        "parallaxDepth": 0.2,
        "blendMode": "normal"
      },
      {
        "id": "wheels",
        "type": "image",
        "zIndex": 20,
        "dependencies": ["body"],
        "assets": {
          "blu-blue_black": {
            "front-3q": "/assets/Configurator/volturiano/blu-blue_black_front-3q.webp",
            "side": "/assets/Configurator/volturiano/blu-blue_black_side.webp",
            "rear-3q": "/assets/Configurator/volturiano/blu-blue_black_rear-3q.webp",
            "rim": "/assets/Configurator/volturiano/blu-blue_black_rim.webp"
          },
          "blu-blue_silver": {
            "front-3q": "/assets/Configurator/volturiano/blu-blue_silver_front-3q.webp",
            "side": "/assets/Configurator/volturiano/blu-blue_silver_side.webp",
            "rear-3q": "/assets/Configurator/volturiano/blu-blue_silver_rear-3q.webp",
            "rim": "/assets/Configurator/volturiano/blu-blue_silver_rim.webp"
          },
          "blu-blue_bronze": {
            "front-3q": "/assets/Configurator/volturiano/blu-blue_bronze_front-3q.webp",
            "side": "/assets/Configurator/volturiano/blu-blue_bronze_side.webp",
            "rear-3q": "/assets/Configurator/volturiano/blu-blue_bronze_rear-3q.webp",
            "rim": "/assets/Configurator/volturiano/blu-blue_bronze_rim.webp"
          },
          "nero-black_black": {
            "front-3q": "/assets/Configurator/volturiano/nero-black_black_front-3q.webp",
            "side": "/assets/Configurator/volturiano/nero-black_black_side.webp",
            "rear-3q": "/assets/Configurator/volturiano/nero-black_black_rear-3q.webp",
            "rim": "/assets/Configurator/volturiano/nero-black_black_rim.webp"
          },
          "nero-black_silver": {
            "front-3q": "/assets/Configurator/volturiano/nero-black_silver_front-3q.webp",
            "side": "/assets/Configurator/volturiano/nero-black_silver_side.webp",
            "rear-3q": "/assets/Configurator/volturiano/nero-black_silver_rear-3q.webp",
            "rim": "/assets/Configurator/volturiano/nero-black_silver_rim.webp"
          },
          "nero-black_bronze": {
            "front-3q": "/assets/Configurator/volturiano/nero-black_bronze_front-3q.webp",
            "side": "/assets/Configurator/volturiano/nero-black_bronze_side.webp",
            "rear-3q": "/assets/Configurator/volturiano/nero-black_bronze_rear-3q.webp",
            "rim": "/assets/Configurator/volturiano/nero-black_bronze_rim.webp"
          },
          "bianco-white_black": {
            "front-3q": "/assets/Configurator/volturiano/bianco-white_black_front-3q.webp",
            "side": "/assets/Configurator/volturiano/bianco-white_black_side.webp",
            "rear-3q": "/assets/Configurator/volturiano/bianco-white_black_rear-3q.webp",
            "rim": "/assets/Configurator/volturiano/bianco-white_black_rim.webp"
          },
          "bianco-white_silver": {
            "front-3q": "/assets/Configurator/volturiano/bianco-white_silver_front-3q.webp",
            "side": "/assets/Configurator/volturiano/bianco-white_silver_side.webp",
            "rear-3q": "/assets/Configurator/volturiano/bianco-white_silver_rear-3q.webp",
            "rim": "/assets/Configurator/volturiano/bianco-white_silver_rim.webp"
          },
          "bianco-white_bronze": {
            "front-3q": "/assets/Configurator/volturiano/bianco-white_bronze_front-3q.webp",
            "side": "/assets/Configurator/volturiano/bianco-white_bronze_side.webp",
            "rear-3q": "/assets/Configurator/volturiano/bianco-white_bronze_rear-3q.webp",
            "rim": "/assets/Configurator/volturiano/bianco-white_bronze_rim.webp"
          },
          "rosso-red_black": {
            "front-3q": "/assets/Configurator/volturiano/rosso-red_black_front-3q.webp",
            "side": "/assets/Configurator/volturiano/rosso-red_black_side.webp",
            "rear-3q": "/assets/Configurator/volturiano/rosso-red_black_rear-3q.webp",
            "rim": "/assets/Configurator/volturiano/rosso-red_black_rim.webp"
          },
          "rosso-red_silver": {
            "front-3q": "/assets/Configurator/volturiano/rosso-red_silver_front-3q.webp",
            "side": "/assets/Configurator/volturiano/rosso-red_silver_side.webp",
            "rear-3q": "/assets/Configurator/volturiano/rosso-red_silver_rear-3q.webp",
            "rim": "/assets/Configurator/volturiano/rosso-red_silver_rim.webp"
          },
          "rosso-red_bronze": {
            "front-3q": "/assets/Configurator/volturiano/rosso-red_bronze_front-3q.webp",
            "side": "/assets/Configurator/volturiano/rosso-red_bronze_side.webp",
            "rear-3q": "/assets/Configurator/volturiano/rosso-red_bronze_rear-3q.webp",
            "rim": "/assets/Configurator/volturiano/rosso-red_bronze_rim.webp"
          },
          "orange-fury_black": {
            "front-3q": "/assets/Configurator/volturiano/orange-fury_black_front-3q.webp",
            "side": "/assets/Configurator/volturiano/orange-fury_black_side.webp",
            "rear-3q": "/assets/Configurator/volturiano/orange-fury_black_rear-3q.webp",
            "rim": "/assets/Configurator/volturiano/orange-fury_black_rim.webp"
          },
          "orange-fury_silver": {
            "front-3q": "/assets/Configurator/volturiano/orange-fury_silver_front-3q.webp",
            "side": "/assets/Configurator/volturiano/orange-fury_silver_side.webp",
            "rear-3q": "/assets/Configurator/volturiano/orange-fury_silver_rear-3q.webp",
            "rim": "/assets/Configurator/volturiano/orange-fury_silver_rim.webp"
          },
          "orange-fury_bronze": {
            "front-3q": "/assets/Configurator/volturiano/orange-fury_bronze_front-3q.webp",
            "side": "/assets/Configurator/volturiano/orange-fury_bronze_side.webp",
            "rear-3q": "/assets/Configurator/volturiano/orange-fury_bronze_rear-3q.webp",
            "rim": "/assets/Configurator/volturiano/orange-fury_bronze_rim.webp"
          }
        },
        "parallaxDepth": 0.3,
        "blendMode": "normal"
      }
    ],
    "variants": [
      {
        "key": "paint_blu-blue",
        "label": "configurator.paint.bluBlue",
        "category": "exterior",
        "optionMapping": {
          "optionId": "paint",
          "valueId": "blu-blue"
        },
        "default": true
      },
      {
        "key": "paint_nero-black",
        "label": "configurator.paint.neroBlack",
        "category": "exterior",
        "optionMapping": {
          "optionId": "paint",
          "valueId": "nero-black"
        }
      },
      {
        "key": "paint_bianco-white",
        "label": "configurator.paint.biancoWhite",
        "category": "exterior",
        "optionMapping": {
          "optionId": "paint",
          "valueId": "bianco-white"
        }
      },
      {
        "key": "paint_rosso-red",
        "label": "configurator.paint.rossoRed",
        "category": "exterior",
        "optionMapping": {
          "optionId": "paint",
          "valueId": "rosso-red"
        }
      },
      {
        "key": "paint_orange-fury",
        "label": "configurator.paint.orangeFury",
        "category": "exterior",
        "optionMapping": {
          "optionId": "paint",
          "valueId": "orange-fury"
        }
      },
      {
        "key": "rim_black",
        "label": "configurator.rims.black",
        "category": "exterior",
        "optionMapping": {
          "optionId": "rims",
          "valueId": "black"
        },
        "default": true
      },
      {
        "key": "rim_silver",
        "label": "configurator.rims.silver",
        "category": "exterior",
        "optionMapping": {
          "optionId": "rims",
          "valueId": "silver"
        }
      },
      {
        "key": "rim_bronze",
        "label": "configurator.rims.bronze",
        "category": "exterior",
        "optionMapping": {
          "optionId": "rims",
          "valueId": "bronze"
        }
      }
    ],
    "metadata": {
      "defaultAngle": "front-3q",
      "defaultOptions": {
        "paint": "blu-blue",
        "rims": "black"
      },
      "lightingPresets": ["studio", "track", "gallery", "sunset"],
      "environmentFilters": {
        "studio": "none",
        "track": "brightness(1.1) contrast(1.05)",
        "gallery": "brightness(0.95) contrast(1.1)",
        "sunset": "sepia(20%) brightness(1.05)"
      }
    }
  }'::jsonb,
  '{
    "createdBy": "system",
    "description": "Tornado GT Launch Edition manifest with all paint and rim combinations",
    "assetBasePath": "/assets/Configurator/volturiano/"
  }'::jsonb
)
on conflict (slug) do update
  set data = excluded.data,
      metadata = excluded.metadata,
      version = config_2d_manifests.version + 1,
      updated_at = now();

