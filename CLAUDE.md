# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
The Accessibility Highlighter is a Chrome extension that identifies accessibility issues on webpages and visually highlights them. It uses a content script for DOM manipulation and a background service worker for extension state management.

## Build/Development Commands
- No build process required - load as an unpacked extension in Chrome
- Test: `npm test` - Runs Jest tests
- Test with watch mode: `npm run test:watch`
- Test with coverage: `npm run test:coverage`
- Install as unpacked extension: chrome://extensions > Developer mode > Load unpacked
- Manual testing: Open /tests/manual-test-runner.html in browser

## Code Style Guidelines
- Indentation: 2 spaces
- Naming: camelCase for variables and functions (e.g., `runAccessibilityChecks`)
- Documentation: JSDoc-style comments for functions
- DOM manipulation: Use standard DOM APIs
- State management: Use Chrome storage API
- Error handling: Log to console for debugging
- Logging: Use console.table for accessibility issues
- Extension architecture: Background service worker + content script
- Visual highlighting: CSS overlays with data-a11ymessage attributes

## Repository Structure
- manifest.json - Extension configuration (Manifest V3)
- background.js - Service worker for extension state
- contentScript.js - Main functionality for a11y checks
- README.md - Installation and usage instructions
- Icon files for enabled/disabled states
- tests/ - Test fixtures and Jest tests