# Installing the Accessibility Highlighter Extension

The Accessibility Highlighter is a Chrome extension that helps identify accessibility problems on websites by providing visual highlighting and console logging of issues. This guide provides instructions for installing the extension in different ways.

## Method 1: Install from Zip File (Recommended for Most Users)

1. Download the latest release zip file (`a11y-highlighter.zip`) from the [releases page](https://github.com/AFixt/a11y-highlighter/releases)
2. Extract the zip file to a folder on your computer
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" by toggling the switch in the top-right corner
5. Click the "Load unpacked" button
6. Browse to the folder where you extracted the zip file and select it
7. The extension should now be installed and visible in your Chrome toolbar

## Method 2: Install from Source Code (for Developers)

If you want to install directly from the source code:

1. Clone the repository:

   ```
   git clone https://github.com/AFixt/a11y-highlighter.git
   cd a11y-highlighter
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Build the extension:

   ```
   npm run build
   ```

4. Open Chrome and navigate to `chrome://extensions/`
5. Enable "Developer mode" by toggling the switch in the top-right corner
6. Click the "Load unpacked" button
7. Browse to the `dist` folder in the project directory and select it
8. The extension should now be installed and visible in your Chrome toolbar

## Usage

Once installed, the extension can be toggled on and off by clicking its icon in the Chrome toolbar:

- When enabled (colored icon): Accessibility issues will be highlighted on the page with red or orange overlays, and details will be logged to the console
- When disabled (gray icon): No highlighting or logging will occur

## Troubleshooting

If the extension doesn't appear to be working:

1. Make sure it's enabled by checking for the colored icon
2. Try refreshing the page after enabling the extension
3. Check the browser console (F12 > Console) for any error messages
4. Ensure you have the necessary permissions for the website you're testing

## Updating

To update the extension when a new version is released:

1. Download the latest zip file or pull the latest code
2. Go to `chrome://extensions/`
3. Find the Accessibility Highlighter and click "Remove"
4. Follow the installation steps above to install the new version

## Support

If you encounter any issues or have questions, please [file an issue](https://github.com/AFixt/a11y-highlighter/issues) on the GitHub repository.
