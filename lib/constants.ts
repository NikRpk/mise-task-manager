/**
 * Application-wide constants
 * Single source of truth for magic numbers and configuration values
 */

// ============================================================================
// AUTO-SAVE & DEBOUNCING
// ============================================================================

/** Delay in milliseconds before auto-saving changes */
export const AUTO_SAVE_DELAY_MS = 1000;

// ============================================================================
// DRAG AND DROP
// ============================================================================

/** Minimum distance in pixels to activate drag */
export const DRAG_ACTIVATION_DISTANCE = 8;

/** Delay in milliseconds before drag activates */
export const DRAG_ACTIVATION_DELAY = 150;

/** Tolerance in pixels for drag detection */
export const DRAG_ACTIVATION_TOLERANCE = 5;

// ============================================================================
// UI DIMENSIONS
// ============================================================================

/** Minimum height for Kanban columns */
export const KANBAN_COLUMN_MIN_HEIGHT = '600px';

// ============================================================================
// TIMING & ANIMATION
// ============================================================================

/** Duration in milliseconds for toast notifications */
export const TOAST_DURATION_MS = 3000;

// ============================================================================
// PAGINATION & LIMITS
// ============================================================================

/** Number of tasks to fetch per page */
export const TASKS_PER_PAGE = 50;

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/** Default project icon emoji */
export const DEFAULT_PROJECT_ICON = '📋';

/** Default task priority */
export const DEFAULT_TASK_PRIORITY = 'medium' as const;

/** Default task status */
export const DEFAULT_TASK_STATUS = 'todo' as const;

// ============================================================================
// DEFAULT STATUS OPTIONS
// ============================================================================

export const DEFAULT_STATUS_OPTIONS = [
  { id: 'todo', label: 'To Do', color: '#94a3b8', isDefault: true },
  { id: 'in-progress', label: 'In Progress', color: '#3b82f6', isDefault: false },
  { id: 'review', label: 'Review', color: '#f59e0b', isDefault: false },
  { id: 'done', label: 'Done', color: '#10b981', isDefault: true },
] as const;

// ============================================================================
// DEFAULT PRIORITY OPTIONS
// ============================================================================

export const DEFAULT_PRIORITY_OPTIONS = [
  { id: 'low', label: 'Low', color: '#94a3b8', isDefault: true },
  { id: 'medium', label: 'Medium', color: '#f59e0b', isDefault: false },
  { id: 'high', label: 'High', color: '#ef4444', isDefault: true },
] as const;

// ============================================================================
// TIMEZONE
// ============================================================================

/** Default timezone for date formatting */
export const DEFAULT_TIMEZONE = 'Europe/Berlin';

/** Default date format (German) */
export const DEFAULT_DATE_FORMAT = 'dd.MM.yyyy';

/** Default datetime format */
export const DEFAULT_DATETIME_FORMAT = 'dd.MM.yyyy HH:mm';

// ============================================================================
// NOTE TEMPLATES
// ============================================================================

/** Default note template for meetings */
export const DEFAULT_NOTE_TEMPLATE = {
  id: 'default',
  name: 'Meeting Notes',
  content: `<h2>Agenda</h2>
<ul>
  <li></li>
</ul>

<h2>Discussion & Notes</h2>
<ul>
  <li></li>
</ul>

<h2>Decisions Made</h2>
<ul>
  <li></li>
</ul>

<h2>Action Items</h2>
<ul>
  <li></li>
</ul>`,
  isDefault: true,
} as const;

/** Maximum number of notes to display per page */
export const NOTES_PER_PAGE = 50;

/** Number of days to fetch upcoming calendar events */
export const CALENDAR_FETCH_DAYS = 30;

/** Number of hours to look back for recent past events */
export const CALENDAR_LOOKBACK_HOURS = 2;
