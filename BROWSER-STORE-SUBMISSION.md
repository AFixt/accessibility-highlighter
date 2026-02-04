# Browser Store Submission Guide

This guide covers how to submit the Accessibility Highlighter extension to Chrome Web Store, Firefox Add-ons, and Microsoft Edge Add-ons.

## Building for Release

Run the build script to generate packages for all browsers:

```bash
npm run build:all
```

This creates three zip files:

- `accessibility-highlighter-v{VERSION}-chrome.zip` - Chrome Web Store
- `accessibility-highlighter-v{VERSION}-firefox.zip` - Firefox Add-ons
- `accessibility-highlighter-v{VERSION}-edge.zip` - Microsoft Edge Add-ons

---

## Chrome Web Store

### Prerequisites

- Google Developer account ($5 one-time registration fee)
- Developer dashboard access: <https://chrome.google.com/webstore/devconsole>

### Submission Steps

1. **Log in** to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

2. **Upload Package**
   - Click "New Item" (for first submission) or select existing extension
   - Upload `accessibility-highlighter-v{VERSION}-chrome.zip`

3. **Store Listing** (required fields)
   - Description (see `chrome-webstore-description.md`)
   - Category: Accessibility
   - Language: English
   - Screenshots (1280x800 or 640x400)
   - Promotional images (optional but recommended)

4. **Privacy Practices**
   - Single purpose description: "Identifies and highlights accessibility issues on web pages"
   - Data usage disclosure: Extension uses `storage` for user preferences only
   - No data collected or transmitted to external servers

5. **Distribution**
   - Visibility: Public
   - Geographic regions: All regions (or select specific)

6. **Submit for Review**
   - Review typically takes 1-3 business days
   - You'll receive email notification when approved/rejected

### Updating Existing Extension

1. Go to Developer Dashboard
2. Select the extension
3. Click "Package" tab
4. Upload new zip file
5. Update version notes
6. Submit for review

---

## Firefox Add-ons (AMO)

### Prerequisites

- Firefox Account (free)
- Developer hub access: <https://addons.mozilla.org/developers/>

### Submission Steps

1. **Log in** to [Firefox Add-ons Developer Hub](https://addons.mozilla.org/developers/)

2. **Submit New Add-on**
   - Click "Submit a New Add-on"
   - Select "On this site" for distribution

3. **Upload Package**
   - Upload `accessibility-highlighter-v{VERSION}-firefox.zip`
   - Firefox will validate the manifest automatically

4. **Source Code Submission**
   - Firefox requires source code for review
   - Upload a zip of the entire repository (excluding `node_modules`)
   - Or provide a link to the public GitHub repository

5. **Add-on Details**
   - Name: Accessibility Highlighter
   - Add-on URL: `accessibility-highlighter` (or similar)
   - Summary: Brief description (up to 250 characters)
   - Description: Full description with features
   - Categories: Web Development, Accessibility
   - Support email/website
   - License: MIT

6. **Version Notes**
   - Describe changes in this version
   - Note any permission changes

7. **Submit for Review**
   - Human review required (can take days to weeks)
   - Respond promptly to any reviewer questions

### Firefox-Specific Notes

- Extension ID is set in manifest: `accessibility-highlighter@afixt.com`
- Minimum Firefox version: 109.0
- Uses `background.scripts` instead of `service_worker`
- `chrome.*` APIs work in Firefox (compatibility layer)

### Updating Existing Extension

1. Go to "Manage My Submissions"
2. Select the extension
3. Click "Upload a New Version"
4. Upload new zip and source code
5. Add version notes
6. Submit for review

---

## Microsoft Edge Add-ons

### Prerequisites

- Microsoft Partner Center account ($19 one-time registration fee)
- Dashboard access: <https://partner.microsoft.com/dashboard/microsoftedge>

### Submission Steps

1. **Log in** to [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge)

2. **Create New Extension** (first time)
   - Click "Create new extension"
   - Choose "Upload a package"

3. **Upload Package**
   - Upload `accessibility-highlighter-v{VERSION}-edge.zip`
   - Edge uses the same Manifest V3 format as Chrome

4. **Properties**
   - Category: Accessibility
   - Privacy policy URL (if applicable)
   - Support contact information

5. **Store Listing**
   - Description (can reuse Chrome description)
   - Screenshots (1280x800 recommended)
   - Search terms/keywords

6. **Availability**
   - Markets: All markets or select specific
   - Visibility: Public

7. **Submit for Certification**
   - Review typically takes 1-7 business days
   - Email notification on approval/rejection

### Edge-Specific Notes

- Edge is Chromium-based, uses same package as Chrome
- No manifest modifications needed
- `chrome.*` APIs work natively

### Updating Existing Extension

1. Go to Partner Center dashboard
2. Select the extension
3. Click "Update"
4. Upload new package
5. Update listing if needed
6. Submit for certification

---

## Required Assets

### Screenshots (all stores)

- Minimum: 1 screenshot
- Recommended: 3-5 screenshots showing key features
- Dimensions: 1280x800 or 640x400
- Show the extension highlighting accessibility issues
- Include captions/annotations if helpful

### Promotional Images

| Store | Size | Required |
|-------|------|----------|
| Chrome | 440x280 (small tile) | Optional |
| Chrome | 920x680 (large tile) | Optional |
| Chrome | 1400x560 (marquee) | Optional |
| Firefox | Any reasonable size | Optional |
| Edge | 300x300 (logo) | Recommended |

### Store Description

Use the content from `chrome-webstore-description.md` as a base. Adapt as needed for each store's formatting requirements.

---

## Review Tips

### Common Rejection Reasons

1. **Unclear permissions** - Justify why `host_permissions: *://*/*` is needed
2. **Missing privacy policy** - May be required if collecting any data
3. **Incomplete listing** - Fill all required fields
4. **Poor screenshots** - Show actual functionality

### Permission Justifications

See `chrome-webstore-justifications.md` for detailed justifications:

| Permission | Justification |
|------------|---------------|
| `storage` | Store user preference for enabled/disabled state |
| `activeTab` | Access current tab to inject accessibility checks |
| `host_permissions: *://*/*` | Run accessibility checks on any website |

---

## Post-Submission Checklist

- [ ] Chrome Web Store submission
- [ ] Firefox Add-ons submission
- [ ] Edge Add-ons submission
- [ ] Verify installation from each store
- [ ] Test basic functionality on each browser
- [ ] Update GitHub release notes with store links
- [ ] Announce release (if applicable)

---

## Support Links

- **Chrome**: <https://developer.chrome.com/docs/webstore/>
- **Firefox**: <https://extensionworkshop.com/documentation/publish/>
- **Edge**: <https://docs.microsoft.com/microsoft-edge/extensions-chromium/publish/>

## Troubleshooting

### Firefox: "Add-on ID not found"

Ensure `browser_specific_settings.gecko.id` is in manifest.json

### Chrome: "Manifest version not supported"

Ensure using Manifest V3 (`"manifest_version": 3`)

### Edge: "Package validation failed"

Check that manifest.json is valid JSON with no trailing commas
