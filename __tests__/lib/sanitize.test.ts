/**
 * Tests for HTML sanitization
 * CRITICAL: Security tests - XSS prevention
 */

import { sanitizeHTML, escapeHTML, stripHTML } from '@/lib/sanitize';

describe('sanitizeHTML', () => {
  describe('Script Tag Prevention', () => {
    test('removes script tags', () => {
      const input = '<script>alert("XSS")</script>Hello';
      const output = sanitizeHTML(input);
      
      expect(output).not.toContain('<script');
      // Note: Script content is removed, but text nodes remain
      expect(output).toContain('Hello');
    });

    test('removes script tags with attributes', () => {
      const input = '<script type="text/javascript" src="evil.js">alert("XSS")</script>Text';
      const output = sanitizeHTML(input);
      
      expect(output).not.toContain('<script');
      expect(output).not.toContain('evil.js');
      expect(output).toContain('Text');
    });

    test('removes inline event handlers', () => {
      const input = '<div onclick="alert(\'XSS\')">Click me</div>';
      const output = sanitizeHTML(input);
      
      expect(output).not.toContain('onclick');
      expect(output).not.toContain('alert');
      expect(output).toContain('Click me');
    });
  });

  describe('Dangerous URL Prevention', () => {
    test('removes javascript: URLs', () => {
      const input = '<a href="javascript:alert(\'XSS\')">Click</a>';
      const output = sanitizeHTML(input);
      
      expect(output).not.toContain('javascript:');
      expect(output).toContain('Click');
    });

    test('removes data: URLs', () => {
      const input = '<a href="data:text/html,<script>alert()</script>">Click</a>';
      const output = sanitizeHTML(input);
      
      expect(output).not.toContain('data:');
    });

    test('removes vbscript: URLs', () => {
      const input = '<a href="vbscript:msgbox()">Click</a>';
      const output = sanitizeHTML(input);
      
      expect(output).not.toContain('vbscript:');
    });

    test('allows safe HTTP URLs', () => {
      const input = '<a href="https://hellofresh.com">HelloFresh</a>';
      const output = sanitizeHTML(input);
      
      expect(output).toContain('https://hellofresh.com');
      expect(output).toContain('HelloFresh');
    });

    test('allows relative URLs', () => {
      const input = '<a href="/tasks/123">Task</a>';
      const output = sanitizeHTML(input);
      
      expect(output).toContain('href="/tasks/123"');
    });

    test('allows mailto: URLs', () => {
      const input = '<a href="mailto:test@hellofresh.com">Email</a>';
      const output = sanitizeHTML(input);
      
      expect(output).toContain('mailto:test@hellofresh.com');
    });
  });

  describe('Dangerous Tags Prevention', () => {
    test('removes iframe tags', () => {
      const input = '<iframe src="evil.com"></iframe>Safe';
      const output = sanitizeHTML(input);
      
      expect(output).not.toContain('<iframe');
      expect(output).toContain('Safe');
    });

    test('removes object tags', () => {
      const input = '<object data="evil.swf"></object>Safe';
      const output = sanitizeHTML(input);
      
      expect(output).not.toContain('<object');
    });

    test('removes embed tags', () => {
      const input = '<embed src="evil.swf">Safe';
      const output = sanitizeHTML(input);
      
      expect(output).not.toContain('<embed');
    });
  });

  describe('CSS Injection Prevention', () => {
    test('removes expression() in CSS', () => {
      const input = '<div style="background: expression(alert())">Text</div>';
      const output = sanitizeHTML(input);
      
      expect(output).not.toContain('expression');
      expect(output).toContain('Text');
    });

    test('removes url() in CSS', () => {
      const input = '<div style="background: url(javascript:alert())">Text</div>';
      const output = sanitizeHTML(input);
      
      expect(output).not.toContain('url(');
    });

    test('removes import in CSS', () => {
      const input = '<div style="background: import url(evil.css)">Text</div>';
      const output = sanitizeHTML(input);
      
      expect(output).not.toContain('import');
    });

    test('allows safe CSS properties', () => {
      const input = '<span style="color: red; font-weight: bold">Text</span>';
      const output = sanitizeHTML(input);
      
      expect(output).toContain('color: red');
      expect(output).toContain('font-weight: bold');
    });
  });

  describe('Safe Formatting Preservation', () => {
    test('preserves bold tags', () => {
      const input = '<b>Bold text</b>';
      expect(sanitizeHTML(input)).toBe('<b>Bold text</b>');
    });

    test('preserves italic tags', () => {
      const input = '<i>Italic text</i>';
      expect(sanitizeHTML(input)).toBe('<i>Italic text</i>');
    });

    test('preserves underline tags', () => {
      const input = '<u>Underlined text</u>';
      expect(sanitizeHTML(input)).toBe('<u>Underlined text</u>');
    });

    test('preserves lists', () => {
      const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const output = sanitizeHTML(input);
      
      expect(output).toContain('<ul>');
      expect(output).toContain('<li>');
      expect(output).toContain('Item 1');
    });

    test('preserves code blocks', () => {
      const input = '<pre><code>const x = 1;</code></pre>';
      const output = sanitizeHTML(input);
      
      expect(output).toContain('<pre>');
      expect(output).toContain('<code>');
      expect(output).toContain('const x = 1;');
    });

    test('preserves safe links with rel attribute', () => {
      const input = '<a href="https://hellofresh.com" target="_blank">Link</a>';
      const output = sanitizeHTML(input);
      
      expect(output).toContain('rel="noopener noreferrer"');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty string', () => {
      expect(sanitizeHTML('')).toBe('');
    });

    test('handles null input', () => {
      expect(sanitizeHTML(null as any)).toBe('');
    });

    test('handles undefined input', () => {
      expect(sanitizeHTML(undefined as any)).toBe('');
    });

    test('handles deeply nested tags', () => {
      const input = '<div><div><div><b>Deep</b></div></div></div>';
      const output = sanitizeHTML(input);
      
      expect(output).toContain('<b>Deep</b>');
    });

    test('handles mixed safe and unsafe content', () => {
      const input = '<b>Safe</b><script>alert("XSS")</script><i>Also safe</i>';
      const output = sanitizeHTML(input);
      
      expect(output).toContain('<b>Safe</b>');
      expect(output).toContain('<i>Also safe</i>');
      expect(output).not.toContain('<script');
    });
  });
});

describe('escapeHTML', () => {
  test('escapes HTML entities', () => {
    const input = '<div>Test & "quotes"</div>';
    const output = escapeHTML(input);
    
    expect(output).not.toContain('<div>');
    expect(output).toContain('&lt;');
    expect(output).toContain('&gt;');
  });

  test('handles empty string', () => {
    expect(escapeHTML('')).toBe('');
  });

  test('handles special characters', () => {
    const input = '< > & " \'';
    const output = escapeHTML(input);
    
    expect(output).toContain('&lt;');
    expect(output).toContain('&gt;');
    expect(output).toContain('&amp;');
  });
});

describe('stripHTML', () => {
  test('removes all HTML tags', () => {
    const input = '<b>Bold</b> and <i>italic</i> text';
    const output = stripHTML(input);
    
    expect(output).toBe('Bold and italic text');
    expect(output).not.toContain('<');
  });

  test('handles nested tags', () => {
    const input = '<div><span><b>Nested</b></span></div>';
    const output = stripHTML(input);
    
    expect(output).toBe('Nested');
  });

  test('handles empty string', () => {
    expect(stripHTML('')).toBe('');
  });

  test('preserves text content', () => {
    const input = '<p>First paragraph</p><p>Second paragraph</p>';
    const output = stripHTML(input);
    
    expect(output).toContain('First paragraph');
    expect(output).toContain('Second paragraph');
  });
});
