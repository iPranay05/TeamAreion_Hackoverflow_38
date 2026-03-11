export default {
  "expo": {
    "name": "SafeStree",
    "slug": "SafeStree",
    "scheme": "safestree",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#0D0D1A"
    },
    "ios": {
      "supportsTablet": false,
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "WomenSafe needs your location to send it to emergency contacts during SOS.",
        "NSLocationAlwaysUsageDescription": "WomenSafe needs your location to send it to emergency contacts during SOS, even in the background.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "WomenSafe needs your location to send it to emergency contacts during SOS.",
        "NSMotionUsageDescription": "WomenSafe uses motion sensors to detect a shake gesture for SOS."
      },
      "bundleIdentifier": "com.prana.womensafe",
      "config": {
        "googleMapsApiKey": process.env.GOOGLE_MAPS_API_KEY
      }
    },
    "android": {
      "package": "com.prana.womensafe",
      "adaptiveIcon": {
        "foregroundImage": "./assets/icon.png",
        "backgroundColor": "#0D0D1A"
      },
      "config": {
        "googleMaps": {
          "apiKey": process.env.GOOGLE_MAPS_API_KEY
        }
      },
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "WAKE_LOCK",
        "SEND_SMS",
        "VIBRATE"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow WomenSafe to use your location always.",
          "locationWhenInUsePermission": "WomenSafe needs your location to send it to emergency contacts during SOS."
        }
      ],
      "expo-router",
      "expo-task-manager",
      "expo-notifications"
    ]
  }
};
