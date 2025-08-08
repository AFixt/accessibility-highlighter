# TODO - Test Coverage Improvement Plan

## Overview

Current test coverage is 20.74%. This comprehensive plan will systematically improve coverage by testing one function/module at a time, in priority order.

## Critical Priority Tasks (Fix Blocking Issues First)

### 1. Fix Performance Test Mocking Issues

- **File**: `tests/performance-benchmarks.test.js`
- **Issue**: `global.performance.now.mockImplementation is not a function`
- **Action**: Fix Jest mocking setup for performance.now
- **Coverage Impact**: Enable performance tests to run

## High Priority Tasks (Core Functionality - 3.38% → Target 70%+)

### 2. Background Script Tests (`src/background.js` - Currently 3.38%)

#### 2.1 Test getCurrentTab() Function

- **Location**: `src/background.js:49`
- **Tests Needed**:
  - Successful tab retrieval
  - Error handling when chrome.tabs.query fails
  - Proper promise resolution/rejection

#### 2.2 Test toggleExtensionState() Function  

- **Location**: `src/background.js` (find exact line)
- **Tests Needed**:
  - State toggle from enabled to disabled
  - State toggle from disabled to enabled
  - Chrome storage persistence
  - Error handling for storage failures

#### 2.3 Test updateExtensionIcon() Function

- **Location**: `src/background.js` (find exact line)
- **Tests Needed**:
  - Icon update for enabled state
  - Icon update for disabled state
  - Error handling for icon update failures

#### 2.4 Test Message Listener (`chrome.runtime.onMessage`)

- **Location**: `src/background.js` (find exact line)
- **Tests Needed**:
  - Proper message routing
  - Response handling
  - Invalid message handling

#### 2.5 Test Action Listener (`chrome.action.onClicked`)

- **Location**: `src/background.js` (find exact line)
- **Tests Needed**:
  - Extension toggle on icon click
  - Tab communication
  - Error handling

### 3. Content Script Core Tests (`src/contentScript.js` - Currently 26.3%)

#### 3.1 Test Initialization Code

- **Location**: `src/contentScript.js:20-61`
- **Tests Needed**:
  - Variable initialization
  - Event listener setup
  - Message listener registration

#### 3.2 Test runAccessibilityChecks() Main Function

- **Location**: `src/contentScript.js` (find exact line)
- **Tests Needed**:
  - Successful scan execution
  - Error handling during scan
  - Progress indicator management
  - Result logging

#### 3.3 Test Image Accessibility Functions

- **Location**: Various lines in `src/contentScript.js`
- **Tests Needed**:
  - `checkImageAlt()` function
  - `validateAltText()` helper
  - Missing alt attribute detection
  - Uninformative alt text detection

#### 3.4 Test Form Accessibility Functions

- **Location**: Various lines in `src/contentScript.js`
- **Tests Needed**:
  - `checkFormFieldLabels()` function
  - Label association validation
  - Missing label detection
  - Fieldset/legend checks

#### 3.5 Test Link Accessibility Functions

- **Location**: Various lines in `src/contentScript.js`
- **Tests Needed**:
  - `checkLinkText()` function
  - Generic link text detection
  - Invalid href validation
  - Empty link detection

### 4. Overlay Manager Tests (`src/modules/overlayManager.js` - Currently 0%)

#### 4.1 Test overlay() Function

- **Location**: `src/modules/overlayManager.js:26`
- **Tests Needed**:
  - Overlay creation with valid parameters
  - Parameter validation
  - Element positioning
  - CSS class application
  - Message sanitization

## Medium Priority Tasks (Supporting Modules - 0% → Target 60%+)

### 5. Config Module Tests (`src/modules/config.js` - Currently 0%)

#### 5.1 Test Configuration Constants

- **Tests Needed**:
  - A11Y_CONFIG structure validation
  - Default values verification
  - Configuration object integrity

#### 5.2 Test Configuration Functions

- **Tests Needed**:
  - `loadCustomRules()` function
  - `loadFilterSettings()` function  
  - `saveCustomRules()` function
  - Storage integration

### 6. State Module Tests (`src/modules/state.js` - Currently 0%)

#### 6.1 Test LOGS Management

- **Location**: `src/modules/state.js:27`
- **Tests Needed**:
  - `addLogEntry()` function
  - `clearLogs()` function
  - `getLogEntries()` function
  - Log entry validation

#### 6.2 Test Navigation State

- **Tests Needed**:
  - `setKeyboardNavigationActive()` function
  - `getCurrentOverlayIndex()` function
  - Navigation state transitions

#### 6.3 Test Progress Indicator Management

- **Tests Needed**:
  - `showProgressIndicator()` function
  - `hideProgressIndicator()` function
  - Progress element lifecycle

#### 6.4 Test Filter Management

- **Tests Needed**:
  - `getCurrentFilters()` function
  - `updateFilters()` function
  - `resetFilters()` function

### 7. Overlay Manager Extended Tests

#### 7.1 Test removeOverlays() Function

- **Tests Needed**:
  - Complete overlay removal
  - Filtered overlay removal
  - Cleanup verification

#### 7.2 Test updateOverlayVisibility() Function

- **Tests Needed**:
  - Show/hide based on filters
  - Category-based filtering
  - Level-based filtering

#### 7.3 Test Keyboard Navigation Functions

- **Tests Needed**:
  - `highlightCurrentOverlay()` function
  - `navigateToOverlay()` function
  - Navigation state management

### 8. Content Script Extended Tests

#### 8.1 Test Structure Functions

- **Tests Needed**:
  - `checkHeadingHierarchy()` function
  - `checkLandmarks()` function
  - Semantic structure validation

#### 8.2 Test Keyboard Event Handlers

- **Tests Needed**:
  - Arrow key navigation
  - ESC key handling
  - Home/End key functionality
  - Enter/Space key actions

#### 8.3 Test Message Handlers

- **Tests Needed**:
  - Toggle message handling
  - Status request handling
  - Invalid message handling

#### 8.4 Test Error Handling

- **Tests Needed**:
  - Try/catch block coverage
  - Console error logging
  - Graceful degradation

## Low Priority Tasks (Advanced Features)

### 9. Performance and Edge Cases

#### 9.1 Test DOM Observers

- **Tests Needed**:
  - Mutation observer setup
  - Page load handling
  - Dynamic content detection

#### 9.2 Test Throttling Mechanisms

- **Tests Needed**:
  - Rapid call prevention
  - Throttle delay enforcement
  - Performance optimization

### 10. Integration Tests

#### 10.1 Extension Workflow Tests

- **Tests Needed**:
  - Background ↔ content script communication
  - End-to-end user scenarios
  - State synchronization

#### 10.2 Real DOM Scenario Tests

- **Tests Needed**:
  - Complex page structures
  - Edge case handling
  - Cross-browser compatibility

## Testing Approach

1. **One Test at a Time**: Work through tasks sequentially, completing each fully before moving to the next
2. **Incremental Coverage**: Run coverage after each test to track progress  
3. **Function-Level Focus**: Test individual functions comprehensively before moving to the next
4. **Mock Properly**: Use Jest mocks for Chrome APIs and DOM manipulation
5. **Verify Fixes**: Run full test suite after each addition to ensure no regressions

## Success Criteria

- **Critical**: Fix performance test issues (immediate)
- **High Priority**: Achieve 70%+ coverage on background.js and contentScript.js
- **Medium Priority**: Achieve 60%+ coverage on all modules
- **Overall Target**: Achieve 80%+ total project coverage
- **Quality**: All tests pass, no regressions introduced
