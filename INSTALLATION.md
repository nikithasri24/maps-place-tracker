# Installation Guide - Maps Place Tracker 🗺️

## Quick Installation (5 minutes)

### Step 1: Download the Extension
```bash
# If you have the files in /tmp/mapsEnhancement
cd /tmp/mapsEnhancement
```

### Step 2: Open Chrome Extensions Page
1. Open Google Chrome
2. Type `chrome://extensions/` in the address bar and press Enter
3. You should see the Chrome Extensions management page

### Step 3: Enable Developer Mode
1. Look for the "Developer mode" toggle in the top-right corner
2. Click to enable it (it should turn blue)
3. You'll see new buttons appear: "Load unpacked", "Pack extension", "Update"

### Step 4: Load the Extension
1. Click the "Load unpacked" button
2. Navigate to the `/tmp/mapsEnhancement` folder (or wherever you saved the files)
3. Select the folder and click "Select Folder" or "Open"
4. The extension should now appear in your extensions list

### Step 5: Verify Installation
1. You should see "Maps Place Tracker" in your extensions list
2. The extension icon should appear in your Chrome toolbar
3. Make sure the extension is enabled (toggle should be blue)

## Using the Extension

### First Time Setup
1. Navigate to [Google Maps](https://maps.google.com)
2. Look for the floating controls that appear (top-right corner)
3. The extension is now ready to use!

### Basic Usage
1. **Search for a place** on Google Maps
2. **Add to todo**: Click the "Add to Todo" button in the floating controls
3. **Mark as visited**: When you visit a place, click "Yes, I've visited" in the prompt
4. **Manage lists**: Click the extension icon in your toolbar to open the popup

## Troubleshooting

### Extension Not Loading
- **Check folder**: Make sure you selected the correct folder containing `manifest.json`
- **Refresh**: Try clicking the refresh icon on the extension in chrome://extensions/
- **Developer mode**: Ensure Developer mode is enabled

### Extension Not Working on Google Maps
- **Refresh Google Maps**: Reload the Google Maps page
- **Check permissions**: The extension needs access to Google Maps
- **Console errors**: Open Developer Tools (F12) and check for errors

### Data Not Saving
- **Storage permissions**: The extension needs storage permissions (should be automatic)
- **Clear cache**: Try clearing browser cache and reloading
- **Reinstall**: Remove and reinstall the extension

### Floating Controls Not Appearing
- **Page load**: Wait a few seconds for Google Maps to fully load
- **Zoom level**: Try zooming in/out on the map
- **Refresh**: Reload the Google Maps page

## Advanced Configuration

### Custom Settings
1. Click the extension icon in your toolbar
2. Go to the "Settings" tab
3. Adjust preferences:
   - Auto-prompt timing
   - Show/hide visited places
   - Prompt delay

### Data Management
- **Export**: Settings → Export Data (saves as JSON file)
- **Import**: Settings → Import Data (restore from JSON file)
- **Clear**: Settings → Clear All Data (removes everything)

## Development Mode

### Making Changes
1. Edit the source files in your folder
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension
4. Test your changes on Google Maps

### Debugging
1. Right-click the extension icon → "Inspect popup" (for popup debugging)
2. On Google Maps, open Developer Tools (F12) for content script debugging
3. Go to `chrome://extensions/` → Details → "Inspect views: background page" (for background script debugging)

## File Permissions

The extension needs these permissions:
- **Storage**: To save your todo and visited places
- **Active Tab**: To detect which Google Maps page you're on
- **Host Permissions**: To inject the interface into Google Maps

These are automatically granted when you install the extension.

## Next Steps

Once installed:
1. ✅ Visit Google Maps and test adding a place to your todo list
2. ✅ Try the auto-prompt feature by visiting a todo place
3. ✅ Explore the popup interface for managing your lists
4. ✅ Configure settings to your preference
5. ✅ Export your data as a backup

## Need Help?

- Check the main [README.md](README.md) for detailed usage instructions
- Look for error messages in the Chrome Developer Tools console
- Ensure you're using a recent version of Google Chrome
- Try disabling other extensions temporarily to check for conflicts

**Happy map exploring! 🗺️✨**