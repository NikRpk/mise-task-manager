# Design Guidelines

This document outlines the design system and guidelines for the Task Management application.

## Design Principles

1. **Clarity First**: Information should be clear and easy to scan
2. **Consistency**: Use consistent patterns, spacing, and components throughout
3. **Accessibility**: Ensure sufficient contrast and keyboard navigation
4. **Responsive**: Design mobile-first, then enhance for larger screens
5. **Minimalism**: Clean, uncluttered interface with purposeful elements

## Color System

### Primary Colors
- **Blue (Primary Action)**: `bg-blue-600` / `text-blue-600`
  - Used for: Primary buttons, links, focus states, progress indicators
  - Hover: `bg-blue-700` / `text-blue-800`
  - Focus ring: `focus:ring-blue-500`

### Neutral Colors
- **Backgrounds**:
  - Main: `bg-gray-50` (light gray background)
  - Cards/Panels: `bg-white`
  - Columns: `bg-gray-100`
- **Text**:
  - Primary: `text-gray-900` (headings, important text)
  - Secondary: `text-gray-700` (body text)
  - Tertiary: `text-gray-600` (labels, hints)
  - Muted: `text-gray-500` (metadata, timestamps)
- **Borders**: `border-gray-200` (subtle), `border-gray-300` (default)

### Status & Priority Colors
- **High Priority**: `bg-red-100 text-red-800 border-red-300`
- **Medium Priority**: `bg-yellow-100 text-yellow-800 border-yellow-300`
- **Low Priority**: `bg-green-100 text-green-800 border-green-300`
- **Overdue**: `text-red-600 font-medium`
- **Success/Complete**: Green tones
- **Warning**: Yellow/Orange tones
- **Error/Danger**: Red tones

### Interactive States
- **Hover**: Slightly darker shade (e.g., `hover:bg-gray-200`)
- **Active**: Pressed state (darker than hover)
- **Focus**: `focus:ring-2 focus:ring-blue-500` (2px blue ring)
- **Disabled**: `opacity-50` with `cursor-not-allowed`

## Typography

### Font Families
- **Sans-serif**: Geist Sans (via Next.js)
- **Monospace**: Geist Mono (for code/technical content)
- **Fallback**: Arial, Helvetica, sans-serif

### Font Sizes & Weights
- **Headings**:
  - H1: `text-2xl font-bold` (page titles)
  - H2: `text-xl font-semibold` (section titles, modal titles)
  - H3: `text-sm font-semibold` (subsection titles)
- **Body Text**:
  - Default: `text-sm` (14px) for most UI elements
  - Small: `text-xs` (12px) for labels, metadata
  - Medium: `text-base` (16px) for body content
- **Weights**:
  - Regular: `font-normal` (default)
  - Medium: `font-medium` (emphasis)
  - Semibold: `font-semibold` (headings)
  - Bold: `font-bold` (primary headings)

## Spacing System

Use Tailwind's spacing scale (4px base unit):
- **Padding**:
  - Small: `p-2` (8px) - tight spaces
  - Default: `p-4` (16px) - cards, panels
  - Large: `p-6` (24px) - modals, sections
- **Gaps**:
  - Small: `gap-2` (8px) - between related items
  - Default: `gap-4` (16px) - between groups
  - Large: `gap-6` (24px) - between major sections
- **Margins**:
  - Small: `mb-2`, `mb-3` (8-12px) - between list items
  - Default: `mb-4`, `mb-6` (16-24px) - between sections
  - Large: `py-6` (24px) - vertical section spacing

## Component Patterns

### Buttons

**Primary Button**:
```tsx
className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
```

**Secondary Button**:
```tsx
className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
```

**Button Sizes**:
- Small: `px-3 py-1.5 text-xs`
- Default: `px-4 py-2 text-sm`
- Large: `px-6 py-3 text-base`

### Cards

**Default Card**:
```tsx
className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
```

**Hover State**:
```tsx
className="... hover:shadow-md transition-shadow cursor-pointer"
```

### Input Fields

**Text Input**:
```tsx
className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
```

**Select Dropdown**:
```tsx
className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
```

### Badges/Tags

**Priority Badge**:
```tsx
className="px-2 py-0.5 text-xs font-medium rounded border"
// + priority-specific colors
```

**Tag Badge**:
```tsx
className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
```

### Modals

**Modal Overlay**:
```tsx
className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
```

**Modal Content**:
```tsx
className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
```

## Layout Patterns

### Container Widths
- **Max Width**: `max-w-7xl` (1280px) for main content
- **Responsive Padding**: `px-4 sm:px-6 lg:px-8`

### Grid Layouts
- **Kanban Columns**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`
- **Form Fields**: `grid grid-cols-1 md:grid-cols-2 gap-4`
- **Filter Grid**: `grid grid-cols-1 md:grid-cols-3 gap-4`

### Header
```tsx
<header className="bg-white shadow-sm border-b border-gray-200">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
    {/* Header content */}
  </div>
</header>
```

## Border Radius

- **Small**: `rounded` (4px) - badges, small elements
- **Default**: `rounded-md` (6px) - buttons, inputs
- **Large**: `rounded-lg` (8px) - cards, panels
- **Full**: `rounded-full` (9999px) - progress bars, pills

## Shadows

- **Small**: `shadow-sm` - subtle elevation (cards)
- **Default**: `shadow-md` - hover states
- **Large**: `shadow-xl` - modals, dropdowns
- **None**: No shadow for flat elements

## Transitions

- **Default**: `transition-shadow` (for hover effects)
- **Smooth**: `transition-all duration-200` (for complex animations)
- **Drag State**: `opacity-50` when dragging

## Responsive Breakpoints

Tailwind default breakpoints:
- **sm**: 640px (tablet portrait)
- **md**: 768px (tablet landscape)
- **lg**: 1024px (desktop)
- **xl**: 1280px (large desktop)
- **2xl**: 1536px (extra large)

## Accessibility Guidelines

1. **Color Contrast**: Ensure WCAG AA compliance (4.5:1 for text)
2. **Focus States**: Always visible focus rings (`focus:ring-2`)
3. **Keyboard Navigation**: All interactive elements should be keyboard accessible
4. **ARIA Labels**: Use semantic HTML and ARIA attributes where needed
5. **Screen Readers**: Use descriptive text, not just icons

## Component-Specific Guidelines

### Task Cards
- Show priority badge and tags at the top
- Display sub-task progress bar when applicable
- Show deadline, owner, and link count at the bottom
- Use `line-clamp-2` for description truncation
- Highlight overdue tasks with red text

### Kanban Columns
- Minimum height: `min-h-[500px]`
- Background: `bg-gray-100`
- Show task count badge
- Make droppable for drag-and-drop

### Forms
- Group related fields together
- Use consistent label styling: `block text-sm font-medium text-gray-700 mb-1`
- Provide clear error states (to be implemented)
- Use appropriate input types (text, date, select, etc.)

### Filters
- Display in a white card with border
- Use consistent spacing between filter groups
- Show active filter states clearly
- Allow multiple selections where appropriate

## Icon Usage

- Use emoji sparingly (🔗 for links)
- Consider using SVG icons for better scalability
- Maintain consistent icon sizes (16px, 20px, 24px)

## Best Practices

1. **Consistency**: Reuse existing component patterns
2. **Spacing**: Use the spacing scale consistently
3. **Colors**: Stick to the defined color palette
4. **Typography**: Follow the type scale
5. **Responsive**: Test on multiple screen sizes
6. **Performance**: Use `transition-shadow` instead of `transition-all` when possible
7. **Accessibility**: Test with keyboard navigation and screen readers

## Dark Mode (Future)

The CSS includes dark mode support via `prefers-color-scheme`, but it's not fully implemented. When implementing:
- Use CSS variables for colors
- Test contrast ratios in dark mode
- Provide a toggle for user preference
