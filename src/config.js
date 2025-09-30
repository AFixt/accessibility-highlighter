/**
 * @fileoverview Accessibility Highlighter Configuration
 *
 * Centralized configuration and constants for the extension. This file contains
 * all configurable settings including:
 * - Performance thresholds and timing settings
 * - Visual styling for overlays and indicators
 * - Lists of prohibited values for accessibility checks
 * - CSS selectors for element identification
 * - Error and warning messages
 * - Feature flags for enabling/disabling checks
 *
 * @author AFixt
 * @version 1.0.1
 */

/**
 * Performance configuration settings
 */
export const PERFORMANCE_CONFIG = {
  THROTTLE_DELAY: 1000, // 1 second throttle delay
  FONT_SIZE_THRESHOLD: 12, // Minimum font size in pixels
  MAX_LOG_ELEMENT_LENGTH: 100, // Maximum length for element HTML in logs
  Z_INDEX_OVERLAY: 2147483647 // Highest z-index for overlays
};

/**
 * Visual styling configuration
 */
export const VISUAL_CONFIG = {
  ERROR_COLOR: '#FF0000',
  WARNING_COLOR: '#FFA500',
  OVERLAY_OPACITY: 0.4,
  BORDER_RADIUS: '5px',
  BORDER_WIDTH: '2px',
  STRIPE_GRADIENT: 'repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,.5) 15px, rgba(255,255,255,.5) 30px)'
};

/**
 * Accessibility check configuration
 */
export const CHECK_CONFIG = {
  ENABLE_FONT_SIZE_CHECK: true,
  ENABLE_LANDMARK_CHECK: true,
  ENABLE_ALT_TEXT_CHECK: true,
  ENABLE_FORM_LABEL_CHECK: true,
  ENABLE_LINK_CHECK: true,
  ENABLE_TABLE_CHECK: true,
  ENABLE_MEDIA_CHECK: true,
  ENABLE_TABINDEX_CHECK: true
};

/**
 * List of table summary values that should be avoided.
 * These are considered uninformative or indicate layout tables.
 */
export const PROHIBITED_TABLE_SUMMARIES = [
  'combobox',
  'Layout',
  'for layout',
  'layout table',
  'layout',
  'Table for layout purposes',
  'Calendar',
  'Structural table',
  'footer',
  'This table is used for page layout',
  'Text Ad',
  'Calendar Display',
  'Links',
  'Content',
  'Header',
  'header',
  'Navigation elements',
  'top navbar',
  'title and navigation',
  'block',
  'main heading',
  'body',
  'links',
  'Event Calendar',
  'Search',
  'lightbox',
  'Menu',
  'all',
  'HeadBox',
  'Calendar of Events',
  'Lightbox',
  'Contents',
  'management',
  'contents',
  'search form',
  'This table is used for layout',
  'Search Input Table',
  'Content Area',
  'Fullsize Image',
  'Layout Structure',
  'Page title',
  'Main Table',
  'left',
  'category',
  'Banner Design Table',
  'Search Form',
  'Site contents',
  'pageinfo',
  'breadcrumb',
  'table used for layout purposes',
  'Footer',
  'main layout',
  'tooltip',
  'Logo'
];

/**
 * List of image alt attribute values that should be avoided.
 * These are considered uninformative or redundant.
 */
export const PROHIBITED_ALT_VALUES = [
  'artwork',
  'arrow',
  'painting',
  'bullet',
  'graphic',
  'graph',
  'spacer',
  'image',
  'placeholder',
  'photo',
  'picture',
  'photograph',
  'logo',
  'screenshot',
  'back',
  'bg',
  'img',
  'alt'
];

/**
 * List of link text values that should be avoided.
 * These are considered non-descriptive or generic.
 */
export const PROHIBITED_LINK_TEXT = [
  'link',
  'more',
  'here',
  'click',
  'click here',
  'read',
  'read more',
  'learn more',
  'continue',
  'go',
  'continue reading',
  'view',
  'view more',
  'less',
  'see all',
  'show',
  'hide',
  'show more',
  'show less'
];

/**
 * List of deprecated HTML elements that should be avoided.
 */
export const DEPRECATED_ELEMENTS = [
  'applet',
  'basefont',
  'center',
  'dir',
  'font',
  'isindex',
  'listing',
  'menu',
  's',
  'strike',
  'u'
];

/**
 * CSS selectors for different types of elements to check
 */
export const SELECTORS = {
  ALL_CHECKABLE_ELEMENTS: 'img, button, [role="button"], a, [role="link"], fieldset, input, table, iframe, audio, video, [tabindex], [role="img"]',
  LANDMARK_ELEMENTS: 'header, aside, footer, main, nav, [role="banner"], [role="complementary"], [role="contentinfo"], [role="main"], [role="navigation"], [role="search"]',
  TEXT_ELEMENTS: ['p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'label', 'a', 'button'],
  INTERACTIVE_ELEMENTS: ['a', 'area', 'button', 'input', 'select', 'textarea'],
  OVERLAY_ELEMENTS: '.a11y-error, .a11y-warning, .overlay'
};

/**
 * Error and warning message templates
 */
export const MESSAGES = {
  MISSING_ALT: 'img does not have an alt attribute',
  UNINFORMATIVE_ALT: 'Uninformative alt attribute value found',
  EMPTY_ALT_WITH_TITLE: 'Image element with empty alt and non-empty title',
  DIFFERENT_ALT_TITLE: 'Image element with different alt and title attributes',
  BUTTON_NO_LABEL: 'Button without aria-label or aria-labelledby or empty text content',
  LINK_NO_CONTENT: 'Link without inner text, aria-label, aria-labelledby, or empty text content',
  INVALID_HREF: 'Invalid link href attribute',
  GENERIC_LINK_TEXT: 'Link element with matching text content found',
  MATCHING_TITLE_TEXT: 'Link element with matching title and text content found',
  FIELDSET_NO_LEGEND: 'fieldset without legend',
  INPUT_IMAGE_NO_ALT: 'input type=image without alt or aria-label',
  FORM_FIELD_NO_LABEL: 'Form field without a corresponding label',
  TABLE_NO_HEADERS: 'table without any th elements',
  NESTED_TABLE: 'Nested table elements',
  UNINFORMATIVE_SUMMARY: 'Table with uninformative summary attribute',
  IFRAME_NO_TITLE: 'iframe element without a title attribute',
  MEDIA_AUTOPLAY: 'Media element set to autoplay',
  MEDIA_NO_CAPTIONS: 'Media element without captions track',
  ROLE_IMG_NO_LABEL: 'role=img without aria-label or aria-labelledby',
  NON_ACTIONABLE_TABINDEX: 'Non-actionable element with tabindex=',
  SMALL_FONT_SIZE: 'Text element with font size smaller than 12px',
  NO_LANDMARKS: 'No landmark elements found',
  THROTTLED: 'Accessibility checks throttled - please wait',
  NO_ISSUES: 'No accessibility issues found.'
};

/**
 * CSS class names used by the extension
 */
export const CSS_CLASSES = {
  ERROR_OVERLAY: 'a11y-error',
  WARNING_OVERLAY: 'a11y-warning',
  GENERIC_OVERLAY: 'overlay'
};

/**
 * Extension configuration that can be modified by users
 */
export const USER_CONFIG = {
  enabledChecks: { ...CHECK_CONFIG },
  visualSettings: { ...VISUAL_CONFIG },
  performanceSettings: { ...PERFORMANCE_CONFIG }
};

/**
 * Default extension configuration for factory reset
 */
export const DEFAULT_CONFIG = {
  enabledChecks: { ...CHECK_CONFIG },
  visualSettings: { ...VISUAL_CONFIG },
  performanceSettings: { ...PERFORMANCE_CONFIG }
};