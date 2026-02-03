/**
 * HTML Sanitization utilities to prevent XSS attacks
 * Sanitizes HTML content while preserving safe formatting
 */

// Allowed HTML tags for rich text content
const ALLOWED_TAGS = [
  'p', 'br', 'div', 'span',
  'b', 'strong', 'i', 'em', 'u',
  'ul', 'ol', 'li',
  'a', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
] as const;

// Allowed attributes for specific tags
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  'a': ['href', 'title', 'target', 'rel'],
  'span': ['style'], // For text colors
  'div': ['style'],  // For code blocks
  'code': ['style'],
  'pre': ['style'],
};

// Allowed CSS properties (for inline styles)
const ALLOWED_STYLES = [
  'color',
  'background-color',
  'font-weight',
  'font-style',
  'text-decoration',
];

/**
 * Basic HTML sanitization using DOM APIs
 * Removes dangerous tags, attributes, and JavaScript
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Create a temporary DOM element to parse HTML safely
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Recursive function to sanitize nodes
  function sanitizeNode(node: Node): Node | null {
    // Text nodes are safe
    if (node.nodeType === Node.TEXT_NODE) {
      return node.cloneNode(true);
    }

    // Only process element nodes
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    // Check if tag is allowed
    if (!ALLOWED_TAGS.includes(tagName as any)) {
      // If tag not allowed, return its children instead
      const fragment = document.createDocumentFragment();
      Array.from(element.childNodes).forEach(child => {
        const sanitized = sanitizeNode(child);
        if (sanitized) fragment.appendChild(sanitized);
      });
      return fragment;
    }

    // Create new clean element
    const cleaned = document.createElement(tagName);

    // Copy allowed attributes
    const allowedAttrs = ALLOWED_ATTRIBUTES[tagName] || [];
    allowedAttrs.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value !== null) {
        // Special handling for href to prevent javascript: URLs
        if (attr === 'href') {
          const sanitizedHref = sanitizeURL(value);
          if (sanitizedHref) {
            cleaned.setAttribute(attr, sanitizedHref);
          }
        }
        // Special handling for style attribute
        else if (attr === 'style') {
          const sanitizedStyle = sanitizeStyle(value);
          if (sanitizedStyle) {
            cleaned.setAttribute(attr, sanitizedStyle);
          }
        }
        // Safe attributes
        else {
          cleaned.setAttribute(attr, value);
        }
      }
    });

    // Sanitize rel attribute for links (prevent tabnabbing)
    if (tagName === 'a' && !cleaned.hasAttribute('rel')) {
      cleaned.setAttribute('rel', 'noopener noreferrer');
    }

    // Sanitize target attribute
    if (tagName === 'a' && cleaned.getAttribute('target') === '_blank') {
      // Ensure rel is set for security
      const rel = cleaned.getAttribute('rel') || '';
      if (!rel.includes('noopener')) {
        cleaned.setAttribute('rel', (rel + ' noopener noreferrer').trim());
      }
    }

    // Recursively sanitize children
    Array.from(element.childNodes).forEach(child => {
      const sanitized = sanitizeNode(child);
      if (sanitized) cleaned.appendChild(sanitized);
    });

    return cleaned;
  }

  // Sanitize all nodes
  const fragment = document.createDocumentFragment();
  Array.from(temp.childNodes).forEach(child => {
    const sanitized = sanitizeNode(child);
    if (sanitized) fragment.appendChild(sanitized);
  });

  // Convert back to HTML string
  const result = document.createElement('div');
  result.appendChild(fragment);
  return result.innerHTML;
}

/**
 * Sanitize URL to prevent javascript: and data: URIs
 * @param url - The URL to sanitize
 * @returns Sanitized URL or empty string if dangerous
 */
function sanitizeURL(url: string): string {
  if (!url) return '';

  const trimmed = url.trim().toLowerCase();

  // Block javascript: and data: URIs
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:')
  ) {
    return '';
  }

  // Allow relative URLs, http, https, mailto
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  ) {
    return url;
  }

  // Default: treat as relative URL
  return url;
}

/**
 * Sanitize inline CSS styles
 * @param style - The style string to sanitize
 * @returns Sanitized style string
 */
function sanitizeStyle(style: string): string {
  if (!style) return '';

  const styles = style.split(';').filter(Boolean);
  const sanitized: string[] = [];

  styles.forEach(rule => {
    const [property, value] = rule.split(':').map(s => s.trim());
    if (!property || !value) return;

    const prop = property.toLowerCase();

    // Only allow whitelisted properties
    if (ALLOWED_STYLES.includes(prop)) {
      // Remove any potential javascript or expressions
      if (
        !value.toLowerCase().includes('javascript:') &&
        !value.toLowerCase().includes('expression(') &&
        !value.toLowerCase().includes('import') &&
        !value.toLowerCase().includes('url(')
      ) {
        sanitized.push(`${prop}: ${value}`);
      }
    }
  });

  return sanitized.join('; ');
}

/**
 * Escape HTML to prevent XSS when displaying user input as text
 * Use this for plain text that should not contain any HTML
 * @param text - The text to escape
 * @returns HTML-escaped text
 */
export function escapeHTML(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Strip all HTML tags from a string
 * Use this to convert HTML to plain text safely
 * @param html - The HTML string
 * @returns Plain text without HTML tags
 */
export function stripHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}
