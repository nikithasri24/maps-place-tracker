# Maps Place Tracker 🗺️

A Chrome browser extension that enhances Google Maps with todo and visited places tracking. Never forget where you wanted to go or lose track of places you've already explored!

## Features ✨

### 🎯 Smart Place Detection
- Automatically detects when you're viewing a place on Google Maps
- Extracts place information including name, address, and coordinates
- Works with Google Maps search results and place details

### 📝 Todo List Management
- Add places to your todo list directly from Google Maps
- Visual indicators show which places are on your todo list
- Easy management through the extension popup

### ✅ Visited Places Tracking
- Mark places as visited with a simple prompt
- Automatic prompts when viewing todo places
- Toggle visibility of visited places on the map

### 🎨 Beautiful UI Integration
- Non-intrusive floating controls on Google Maps
- Clean, modern popup interface for managing lists
- Smooth animations and Google-style design

### ⚙️ Customizable Settings
- Auto-prompt when visiting todo places (configurable delay)
- Show/hide visited places on the map
- Export and import your data
- Clear all data option

## Installation 📦

### Method 1: Load Unpacked (Development)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension should now appear in your Chrome toolbar

### Method 2: Chrome Web Store (Coming Soon)
*This extension will be available on the Chrome Web Store soon!*

## Usage Guide 📋

### Getting Started
1. Install the extension following the instructions above
2. Navigate to [Google Maps](https://maps.google.com)
3. The extension will automatically initialize and add floating controls

### Adding Places to Todo List
1. Search for or navigate to a place on Google Maps
2. Click the floating "Add to Todo" button, or
3. Use the "📝" button in the floating controls panel

### Marking Places as Visited
1. When you visit a place that's on your todo list, you'll see an automatic prompt
2. Click "Yes, I've visited" to move it to your visited list
3. Alternatively, use the "Mark Visited" button in the controls

### Managing Your Lists
1. Click the extension icon in your Chrome toolbar
2. Switch between "Todo List", "Visited", and "Settings" tabs
3. View, manage, and organize all your places

### Exporting/Importing Data
1. Open the extension popup
2. Go to the "Settings" tab
3. Use "Export Data" to save your lists as a JSON file
4. Use "Import Data" to restore from a backup file

## File Structure 📁

```
mapsEnhancement/
├── manifest.json          # Extension manifest (V3)
├── background.js          # Background service worker
├── content.js            # Content script for Google Maps
├── styles.css            # Styles for injected UI elements
├── popup.html            # Extension popup interface
├── popup.css             # Popup styling
├── popup.js              # Popup functionality
├── icons/                # Extension icons (16, 32, 48, 128px)
└── README.md             # This file
```

## Technical Details 🔧

### Architecture
- **Manifest V3**: Modern Chrome extension architecture
- **Content Script**: Injects into Google Maps pages for place detection
- **Background Service Worker**: Handles data management and storage
- **Popup Interface**: Provides management UI for lists and settings

### Data Storage
- Uses Chrome's `chrome.storage.local` API for persistence
- Data is stored locally on your device (not synced to cloud)
- Includes export/import functionality for backup and migration

### Place Detection Algorithm
- Monitors URL changes and DOM mutations on Google Maps
- Extracts place information from multiple selectors for reliability
- Uses fuzzy matching to prevent duplicate entries
- Calculates similarity based on name and coordinates

### Privacy & Security
- **No data collection**: All data stays on your device
- **No external requests**: Extension works entirely offline
- **Minimal permissions**: Only requests access to Google Maps and local storage
- **Open source**: Code is fully auditable

## Browser Compatibility 🌐

- **Chrome**: ✅ Fully supported (V3 manifest)
- **Edge**: ✅ Should work (Chromium-based)
- **Firefox**: ❌ Not supported (requires Manifest V2 adaptation)
- **Safari**: ❌ Not supported

## Development 🛠️

### Prerequisites
- Chrome browser (for testing)
- Basic knowledge of JavaScript, HTML, CSS
- Familiarity with Chrome Extension APIs

### Local Development
1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test changes on Google Maps

### Building for Production
The extension is ready to use as-is. For distribution:
1. Zip the entire folder (excluding .git, node_modules, etc.)
2. Upload to Chrome Web Store Developer Dashboard
3. Follow Chrome Web Store review process

## Contributing 🤝

Contributions are welcome! Please feel free to:
- Report bugs or issues
- Suggest new features
- Submit pull requests
- Improve documentation

### Development Guidelines
- Follow existing code style and patterns
- Test thoroughly on different Google Maps views
- Ensure backward compatibility with stored data
- Update README for new features

## License 📄

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Changelog 📈

### Version 1.0.0 (Initial Release)
- ✅ Basic place detection on Google Maps
- ✅ Todo list functionality
- ✅ Visited places tracking
- ✅ Auto-prompt system
- ✅ Popup management interface
- ✅ Data export/import
- ✅ Settings configuration

## Roadmap 🚀

### Planned Features
- 🔄 Cloud sync between devices
- 📊 Statistics and analytics
- 🏷️ Custom tags and categories
- 📍 Custom markers and icons
- 🗓️ Visit date planning
- 📱 Mobile app companion
- 🌍 Support for other map services

## Support 💬

Having issues or questions?
- Check the [Issues](https://github.com/yourusername/maps-place-tracker/issues) page
- Create a new issue for bug reports or feature requests
- Star the repository if you find it useful!

## Acknowledgments 🙏

- Google Maps team for the excellent mapping platform
- Chrome Extensions team for the powerful API
- Open source community for inspiration and tools

---

**Built with ❤️ for better map exploration**