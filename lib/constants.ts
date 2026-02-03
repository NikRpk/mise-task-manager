/**
 * Application-wide constants
 * Single source of truth for magic numbers and configuration values
 */

// ============================================================================
// AUTO-SAVE & DEBOUNCING
// ============================================================================

/** Delay in milliseconds before auto-saving changes */
export const AUTO_SAVE_DELAY_MS = 1000;

/** Delay in milliseconds for search input debouncing */
export const SEARCH_DEBOUNCE_MS = 300;

// ============================================================================
// DRAG AND DROP
// ============================================================================

/** Minimum distance in pixels to activate drag */
export const DRAG_ACTIVATION_DISTANCE = 3;

/** Delay in milliseconds before drag activates */
export const DRAG_ACTIVATION_DELAY = 100;

/** Tolerance in pixels for drag detection */
export const DRAG_ACTIVATION_TOLERANCE = 5;

// ============================================================================
// UI DIMENSIONS
// ============================================================================

/** Minimum height for Kanban columns */
export const KANBAN_COLUMN_MIN_HEIGHT = '600px';

/** Maximum width for modal dialogs */
export const MODAL_MAX_WIDTH = '7xl';

/** Maximum height for modal dialogs (viewport percentage) */
export const MODAL_MAX_HEIGHT = '90vh';

// ============================================================================
// TIMING & ANIMATION
// ============================================================================

/** Duration in milliseconds for toast notifications */
export const TOAST_DURATION_MS = 3000;

/** Duration in milliseconds for success messages */
export const SUCCESS_MESSAGE_DURATION_MS = 2000;

/** Duration in milliseconds for animations */
export const ANIMATION_DURATION_MS = 200;

// ============================================================================
// PAGINATION & LIMITS
// ============================================================================

/** Default number of items per page */
export const DEFAULT_PAGE_SIZE = 50;

/** Number of tasks to fetch per page */
export const TASKS_PER_PAGE = 50;

/** Maximum number of tasks to display without pagination */
export const MAX_TASKS_BEFORE_PAGINATION = 100;

/** Maximum number of projects to display in selector */
export const MAX_PROJECTS_IN_SELECTOR = 20;

// ============================================================================
// VALIDATION
// ============================================================================

/** Minimum length for task title */
export const MIN_TASK_TITLE_LENGTH = 1;

/** Maximum length for task title */
export const MAX_TASK_TITLE_LENGTH = 200;

/** Maximum length for task description */
export const MAX_TASK_DESCRIPTION_LENGTH = 5000;

/** Maximum length for project name */
export const MAX_PROJECT_NAME_LENGTH = 100;

/** Maximum number of tags per task */
export const MAX_TAGS_PER_TASK = 10;

/** Maximum length for a single tag */
export const MAX_TAG_LENGTH = 50;

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
// COLORS (HelloFresh Brand)
// ============================================================================

export const COLORS = {
  // Background colors
  background: '#fffdfa',
  surface: '#ffffff',
  
  // Text colors
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  
  // Brand colors
  primary: '#009646',
  secondary: '#125034',
  
  // Status colors
  success: '#00a61c',
  warning: '#f6c400',
  error: '#f30047',
  info: '#3b82f6',
  
  // Border colors
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
} as const;

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
  sections: [
    { id: 'agenda', title: 'Agenda', placeholder: 'What topics will be discussed?', order: 1 },
    { id: 'discussion', title: 'Discussion & Notes', placeholder: 'Key points discussed...', order: 2 },
    { id: 'decisions', title: 'Decisions Made', placeholder: 'What was decided?', order: 3 },
    { id: 'action-items', title: 'Action Items', placeholder: 'What needs to be done?', order: 4 },
  ],
  isDefault: true,
} as const;

/** Maximum number of notes to display per page */
export const NOTES_PER_PAGE = 50;

/** Number of days to fetch upcoming calendar events */
export const CALENDAR_FETCH_DAYS = 30;
