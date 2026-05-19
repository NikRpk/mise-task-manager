'use client';

/**
 * ColorPicker — compact swatch that opens a hex color picker popover.
 *
 * Usage (inline swatch only):
 *   <ColorPicker value={color} onChange={setColor} />
 *
 * Usage (with visible hex input field):
 *   <ColorPicker value={color} onChange={setColor} showHexInput />
 */

import { useEffect, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  /** Show a hex text input alongside the swatch (useful for theme color rows) */
  showHexInput?: boolean;
  disabled?: boolean;
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export default function ColorPicker({ value, onChange, showHexInput = false, disabled = false }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(value);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({ top: '2.75rem', left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Keep draft in sync when value changes externally
  useEffect(() => {
    setHexDraft(value);
  }, [value]);

  // After the popover mounts, nudge it back on-screen if it overflows the viewport
  useEffect(() => {
    if (!open || !popoverRef.current || !containerRef.current) return;
    const popRect = popoverRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const overflowRight = popRect.right - viewportWidth + 12; // 12px breathing room
    const overflowLeft = -popRect.left + 12;

    let left: number | string = 0;
    if (overflowRight > 0) {
      left = -overflowRight;
    } else if (overflowLeft > 0) {
      left = overflowLeft;
    }

    // Also flip above the swatch if it would go off the bottom
    const overflowBottom = popRect.bottom - window.innerHeight + 12;
    const top = overflowBottom > 0 ? -(popRect.height + 8) : (containerRef.current.offsetHeight + 4);

    setPopoverStyle({ top, left });
  }, [open]);

  // Close popover when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleHexInputChange = (raw: string) => {
    setHexDraft(raw);
    // Only propagate valid 6-digit hex values
    const normalised = raw.startsWith('#') ? raw : `#${raw}`;
    if (HEX_RE.test(normalised)) {
      onChange(normalised);
    }
  };

  const handleHexInputBlur = () => {
    // On blur, reset draft to last valid value if input is invalid
    if (!HEX_RE.test(hexDraft)) {
      setHexDraft(value);
    }
  };

  return (
    <div ref={containerRef} className="relative flex items-center gap-2">
      {/* Colour swatch button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        className="w-10 h-10 rounded-md border cursor-pointer flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow hover:shadow-md"
        style={{
          backgroundColor: HEX_RE.test(value) ? value : '#cccccc',
          borderColor: 'var(--color-border)',
        }}
        aria-label="Pick colour"
      />

      {/* Optional hex text input */}
      {showHexInput && (
        <input
          type="text"
          value={hexDraft}
          onChange={(e) => handleHexInputChange(e.target.value)}
          onBlur={handleHexInputBlur}
          disabled={disabled}
          maxLength={7}
          placeholder="#000000"
          className="flex-1 px-3 py-2 border rounded-md font-mono text-sm disabled:opacity-50"
          style={{ borderColor: 'var(--color-border)' }}
          spellCheck={false}
        />
      )}

      {/* Popover picker */}
      {open && !disabled && (
        <div
          ref={popoverRef}
          className="absolute z-50 rounded-xl shadow-xl p-3"
          style={{
            ...popoverStyle,
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <HexColorPicker color={HEX_RE.test(value) ? value : '#cccccc'} onChange={onChange} />
          {/* Always show the hex value in the popover for reference */}
          <input
            type="text"
            value={hexDraft}
            onChange={(e) => handleHexInputChange(e.target.value)}
            onBlur={handleHexInputBlur}
            maxLength={7}
            placeholder="#000000"
            className="mt-2 w-full px-3 py-1.5 border rounded-md font-mono text-sm text-center"
            style={{ borderColor: 'var(--color-border)' }}
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
}
