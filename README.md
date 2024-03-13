# Accessibility Highlighter

The Accessibility Highlighter finds accessibility problems on a website and highlights them on the page to give a visual indication of what the problems are. It also logs errors to console and annotates the DOM.

## Install

This is a browser extension. However, it is not installable via Chrome Webstore. It must be installed as an unpacked extension. See instructions for how to do so: https://webkul.com/blog/how-to-install-the-unpacked-extension-in-chrome/

Download the zip: https://github.com/AFixt/accessibility-highlighter/archive/refs/heads/main.zip

Once the extension is installed, click on the icon in the browser to enable the extension. When the extension is enabled, the highlighting will occur automatically on every page you view. To turn off the highlighting, click the icon again. This will put it into a `disabled` state and turn off the highlighting. Continuing to click the icon will continue to toggle this behavior.

NOTE: Enabling the extension also means that the websites will probably be inaccessible to you, especially because of the way that the highlighting works.  As a result, you'll want to enable & disable the extension according to when you need it.

### Why is this not available in the Chrome Webstore?

I don't want people to think this is an auditing tool and start using it for real testing work. I created it as a "sniff test" and to create presentations with.

## Caveats

This extension's goal is simply to provide a visual demonstration of accessibility problems. It isn't meant as an auditing tool. It doesn't find all accessibility errors, and there ~~might~~ will be false positives. Any discussion related to what this does/ does not do should be viewed in that context.

## How to use

Once it is installed, it will add a button to the browser (the icon is currently hard to see in dark mode). Clicking that button toggles the visualization: a hashed area will appear on top of any areas of the page with accessibility errors. If you do not see any hashed areas, do not congratulate yourself. The extension has such a small set of tests that you shouldn't make any assumptions that the page is error-free.

When the highlighting is active, the browser console will log the actual elements-in-error and also have a table that logs the accessibility issues.

The highlighting `div` will also have an attribute called `data-a11ymessage` which describes the error. Go to the "elements" tab in devtools and search for that attribute to see what the error was. *Pay close attention:* This `div` is the highlight `div`. The element with the error will be the preceding element in the DOM.

## Contribute

PRs are welcome.

Find something wrong? Have something you'd like to change? Feel free to log an issue. However, please understand that we regard this mostly as a toy. As a result, issues are likely to rot unless the necessary changes are fast and easy or until someone else comes along to create a PR.
