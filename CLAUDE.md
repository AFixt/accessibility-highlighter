# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Accessibility Highlighter is a Chrome extension that identifies accessibility issues on webpages and visually highlights them. It uses a content script for DOM manipulation and a background service worker for extension state management.

## Git Flow Branching Strategy

This project follows Git Flow branching strategy. All development work must adhere to the following:

### Branch Structure
- **main**: Production-ready code only. Never commit directly to main.
- **develop**: Integration branch for features. All feature branches merge here first.
- **feature/**: Create feature branches from develop (e.g., feature/add-keyboard-nav)
- **release/**: For preparing production releases from develop
- **hotfix/**: Emergency fixes from main that bypass develop

### Workflow Rules
1. Always create feature branches from develop: `git checkout -b feature/feature-name develop`
2. Merge feature branches back to develop via pull request
3. Create release branches from develop when ready for production
4. Merge release branches to both main and develop
5. Create hotfix branches from main for critical production issues
6. Merge hotfix branches to both main and develop

### Commit Messages
- Use conventional commit format when applicable
- Include ticket/issue numbers if available
- Keep messages clear and descriptive

## Project Todo List

The project todo list is maintained in todo.md. Always refer to todo.md for the current list of tasks and their priorities. Tasks should be completed in priority order (Critical, High, Medium, Low) and marked as complete as they are finished.

## Build/Development Commands

- No build process required - load as an unpacked extension in Chrome
- Test: `npm test` - Runs Jest tests
- Test with watch mode: `npm run test:watch`
- Test with coverage: `npm run test:coverage`
- Install as unpacked extension: chrome://extensions > Developer mode > Load unpacked
- Manual testing: Open /tests/manual-test-runner.html in browser

## Keyboard Shortcuts

- `Ctrl+Shift+A` (Windows/Linux) or `Cmd+Shift+A` (Mac): Toggle accessibility highlighting
- `Alt+Shift+N`: Start keyboard navigation through accessibility issues
- `Arrow Keys`: Navigate between issues (when keyboard navigation is active)
- `Home/End`: Jump to first/last issue
- `Enter/Space`: Get detailed information about current issue
- `Escape`: Exit keyboard navigation mode

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
