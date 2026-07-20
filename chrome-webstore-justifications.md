# Chrome Web Store Permission Justifications

## activeTab Permission

The `activeTab` permission is required to allow the extension to access and analyze the currently active web page for accessibility issues. This permission enables the extension to:

- Read the DOM structure of the current page to identify accessibility violations
- Inject visual overlays to highlight problematic elements
- Access page content only when the user explicitly activates the extension via the browser action button

This permission is essential for the core functionality of detecting and highlighting accessibility issues on web pages.

## Host Permissions (_://_/\*)

The host permission for all URLs is required because accessibility issues can occur on any website. The extension needs to:

- Analyze web pages across all domains to identify accessibility violations
- Inject content scripts that perform DOM analysis on any website the user visits
- Provide consistent accessibility checking functionality regardless of the website

The extension only activates when users explicitly toggle it on, ensuring it doesn't interfere with normal browsing unless requested.

## Remote Code Use

**The extension does not use remote code.** All functionality is contained within the extension package:

- No external JavaScript libraries are loaded from CDNs
- No code is fetched from remote servers
- All accessibility checking logic is implemented locally within the extension
- The Content Security Policy explicitly blocks external connections with `connect-src 'none'`

If this justification is still required, it may be a false positive in the automated review system.

## Scripting Permission

The `scripting` permission is required to dynamically inject the content script into web pages. This enables the extension to:

- Execute accessibility analysis code on web pages when activated
- Programmatically inject and remove visual overlays that highlight accessibility issues
- Dynamically manage the extension's presence on pages based on user preferences

This permission is essential for the extension's core functionality of analyzing and highlighting accessibility issues.

## Storage Permission

The `storage` permission is required to maintain user preferences and extension state. This enables the extension to:

- Remember whether accessibility highlighting is enabled or disabled across browser sessions
- Store user configuration settings for customizing which types of accessibility issues to highlight
- Persist the extension's state when users navigate between pages or restart their browser

This ensures a consistent user experience and allows users to maintain their preferred settings.

## Single Purpose Description

This extension has a single, narrow purpose: **to identify and visually highlight accessibility issues on web pages**.

The extension performs automated accessibility audits of web page content and provides visual indicators (colored overlays) to show developers and content creators exactly where accessibility problems exist. It focuses exclusively on accessibility compliance checking and does not perform any other functions such as content blocking, data collection, or page modification beyond the temporary visual highlighting overlays.
