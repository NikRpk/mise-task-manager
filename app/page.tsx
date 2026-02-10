'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Plus, Settings, LayoutGrid, List, X, Search, FileText, Trash2, Edit, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Task, TaskStatus, Note } from '@/types';
import TaskCard from '@/components/TaskCard';
import TaskModal from '@/components/TaskModal';
import ProjectSelector from '@/components/ProjectSelector';
import Filters from '@/components/Filters';
import DisplayOptionsMenu from '@/components/DisplayOptionsMenu';
import DailyStatsCard from '@/components/DailyStatsCard';
import KanbanColumn from '@/components/KanbanColumn';
import AuthGuard from '@/components/AuthGuard';
import UserProfile from '@/components/UserProfile';
import EmptyProjectState from '@/components/EmptyProjectState';
import InputDialog from '@/components/InputDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAuth } from '@/lib/auth-context';
import { authenticatedFetch } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { useProjectPermissions } from '@/lib/use-permissions';
import { useProjectData } from '@/hooks/useProjectData';
import { useTaskData } from '@/hooks/useTaskData';
import { useTaskFilters } from '@/hooks/useTaskFilters';
import { useDailyStats } from '@/hooks/useDailyStats';
import { useNoteData } from '@/hooks/useNoteData';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useRealtimeListeners } from '@/lib/realtime-listeners';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { 
  DRAG_ACTIVATION_DISTANCE, 
  DRAG_ACTIVATION_DELAY, 
  DRAG_ACTIVATION_TOLERANCE,
  DEFAULT_STATUS_OPTIONS 
} from '@/lib/constants';

interface StatusOption {
  id: string;
  label: string;
  value: TaskStatus;
  color?: string;
}

type ViewMode = 'tasks' | 'notes';

function HomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const [currentView, setCurrentView] = useState<ViewMode>('tasks');
  
  // Use custom hooks for data management
  const { 
    projects, 
    selectedProjectId, 
    setSelectedProjectId, 
    loading: projectsLoading,
    createProject: createProjectApi,
  } = useProjectData(user?.uid);
  
  const {
    tasks,
    setTasks,
    fetchTasks,
    updateTaskStatus,
    saveTask,
    deleteTask,
  } = useTaskData(selectedProjectId, user?.uid);
  
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    filteredTasks,
    owners,
  } = useTaskFilters(tasks);
  
  // Notes data
  const { notes, loading: notesLoading, fetchNotes, deleteNote } = useNoteData(user?.uid);
  const [notesSearchQuery, setNotesSearchQuery] = useState('');
  
  // Filtered notes
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(notesSearchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [notes, notesSearchQuery]);
  
  // Get timezone from cached settings
  const userTimezone = settings?.timezone || DEFAULT_TIMEZONE;
  
  // Calculate daily completion stats
  const dailyStats = useDailyStats(tasks, userTimezone);
  
  // UI State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusColumns, setStatusColumns] = useState<StatusOption[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [viewModeCompact, setViewModeCompact] = useState<'normal' | 'compact'>('normal');
  const [showOwner, setShowOwner] = useState(false);
  const [showPriority, setShowPriority] = useState(true); // Show by default
  const [showDueDate, setShowDueDate] = useState(true); // Show by default
  const [error, setError] = useState<string | null>(null);
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; message: string; onConfirm: () => void }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });
  
  // Fetch user permissions for selected project
  const permissions = useProjectPermissions(selectedProjectId);
  
  // Set up real-time listeners for automatic cache invalidation
  useRealtimeListeners({
    userId: user?.uid,
    selectedProjectId,
    enabled: true,
  });
  
  // Input dialog states
  const [projectNameDialog, setProjectNameDialog] = useState(false);
  const [projectIconDialog, setProjectIconDialog] = useState(false);
  const [pendingProjectName, setPendingProjectName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Must move 8px before drag starts
      },
    })
  );

  const fetchProjectSettings = useCallback(async () => {
    if (!selectedProjectId) return;

    // Helper to convert constants to StatusOption format
    const getDefaultStatusColumns = () => DEFAULT_STATUS_OPTIONS.map(opt => ({
      id: opt.id,
      label: opt.label,
      value: opt.id as TaskStatus,
      color: opt.color,
    }));

    try {
      // Use combined endpoint that fetches both project and settings
      const res = await authenticatedFetch(`/api/projects/${selectedProjectId}/full`);
      const data = await res.json();
      
      if (data.settings && data.settings.statusOptions && Array.isArray(data.settings.statusOptions)) {
        interface StatusOptionData {
          id: string;
          label: string;
          color: string;
        }
        
        setStatusColumns(data.settings.statusOptions.map((opt: StatusOptionData) => ({
          id: opt.id,
          label: opt.label,
          value: opt.id as TaskStatus,
          color: opt.color,
        })));
      } else {
        // Fallback to default columns from constants
        setStatusColumns(getDefaultStatusColumns());
      }
    } catch (error) {
      logger.error('Failed to fetch project settings', error as Error, {
        projectId: selectedProjectId,
        userId: user?.uid,
      });
      // Fallback to default columns from constants
      setStatusColumns(getDefaultStatusColumns());
    }
  }, [selectedProjectId, user?.uid]);

  // Load tasks and project settings when project changes
  useEffect(() => {
    if (selectedProjectId) {
      let cancelled = false;
      
      const loadData = async () => {
        try {
          setError(null);
          await Promise.all([
            fetchTasks(),
            fetchProjectSettings()
          ]);
        } catch (err) {
          if (!cancelled) {
            logger.error('Failed to load project data', err as Error, {
              projectId: selectedProjectId,
              userId: user?.uid,
            });
            setError('Failed to load project data. Please try refreshing.');
          }
        }
      };
      
      loadData();
      
      return () => {
        cancelled = true;
      };
    }
  }, [selectedProjectId, fetchTasks, fetchProjectSettings]);

  // Handle shared task link
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId && tasks.length > 0) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setSelectedTask(task);
        setIsModalOpen(true);
        // Remove taskId from URL without reloading
        window.history.replaceState({}, '', '/');
      }
    }
  }, [searchParams, tasks]);
  
  // Fetch notes when view switches to notes
  useEffect(() => {
    if (currentView === 'notes' && user) {
      fetchNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, user]);

  const handleCreateProject = useCallback(() => {
    setProjectNameDialog(true);
  }, []);

  const handleProjectNameSubmit = useCallback((name: string) => {
    setPendingProjectName(name);
    setProjectIconDialog(true);
  }, []);

  const handleProjectIconSubmit = useCallback(async (icon: string) => {
    try {
      await createProjectApi(pendingProjectName, icon);
      setPendingProjectName('');
    } catch (error) {
      // Error already logged in hook
      // Could show error toast here
    }
  }, [pendingProjectName, createProjectApi]);

  const handleSaveTask = useCallback(async (taskData: Partial<Task>) => {
    const taskWithMetadata = {
      ...taskData,
      projectId: selectedProjectId!,
      owner: user?.displayName || 'Unknown',
    };
    
    try {
      await saveTask(taskWithMetadata);
    } catch (error) {
      // Error already logged in hook
      // Could show error toast here
    }
  }, [selectedProjectId, user?.displayName, saveTask]);
  
  // Optimistic update callback for auto-save changes (title, description, etc.)
  const handleOptimisticUpdate = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prevTasks =>
      prevTasks.map(t =>
        t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      )
    );
  }, [setTasks]);
  
  // Quick complete handler for task cards
  const handleQuickComplete = useCallback(async (taskId: string) => {
    try {
      // Update status immediately - the card's animation will play before it's removed
      await updateTaskStatus(taskId, 'done');
    } catch (error) {
      // Error already logged and rolled back in hook
      // Could show error toast here
    }
  }, [updateTaskStatus]);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  }, []);

  const handleNewTask = useCallback(() => {
    setSelectedTask(null);
    setIsModalOpen(true);
  }, []);

  const handleDragStart = useCallback((event: { active: { id: string | number } }) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  }, [tasks]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || active.id === over.id) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    try {
      await updateTaskStatus(taskId, newStatus);
    } catch (error) {
      // Error already logged and UI rolled back in hook
      setError('Failed to update task status. The change has been reverted.');
    }
  }, [updateTaskStatus]);
  
  const handleDragCancel = useCallback(() => {
    setActiveTask(null);
  }, []);
  
  // Handle scroll to show/hide left fade
  const handleKanbanScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    
    // Show left fade if scrolled right
    setShowLeftFade(scrollLeft > 10);
    
    // Hide right fade if scrolled to the end (with 10px tolerance)
    const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 10;
    setShowRightFade(!isAtEnd);
  }, []);
  
  // Note handlers
  const handleNewNote = useCallback(() => {
    router.push('/notes/new');
  }, [router]);

  const handleViewNote = useCallback((note: Note) => {
    router.push(`/notes/${note.id}`);
  }, [router]);

  const handleDeleteNote = useCallback((note: Note) => {
    setConfirmDialog({
      isOpen: true,
      message: `Are you sure you want to delete "${note.title}"? This action cannot be undone.`,
      onConfirm: async () => {
        await deleteNote(note.id);
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
    });
  }, [deleteNote, confirmDialog]);

  // Memoize tasks grouped by status
  const tasksByStatus = useMemo(() => {
    // Priority order: high > medium > low
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    
    return statusColumns.reduce((acc, column) => {
      const tasksInColumn = filteredTasks.filter(t => t.status === column.value);
      
      // Sort tasks: first by deadline (closest first), then by priority
      const sortedTasks = tasksInColumn.sort((a, b) => {
        // 1. Sort by deadline (tasks with deadlines come first, sorted by date)
        if (a.deadline && b.deadline) {
          // Both have deadlines - compare dates
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        } else if (a.deadline && !b.deadline) {
          // a has deadline, b doesn't - a comes first
          return -1;
        } else if (!a.deadline && b.deadline) {
          // b has deadline, a doesn't - b comes first
          return 1;
        }
        
        // 2. Neither has deadline (or same deadline) - sort by priority
        const aPriority = a.priority || 'low';
        const bPriority = b.priority || 'low';
        return priorityOrder[aPriority] - priorityOrder[bPriority];
      });
      
      acc[column.value] = sortedTasks;
      return acc;
    }, {} as Record<Task['status'], Task[]>);
  }, [filteredTasks, statusColumns]);

  if (projectsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-primary)' }}></div>
          <p style={{ color: 'var(--color-text)' }}>Loading projects...</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <>
        <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
          <main className="px-5 py-4">
            <div className="bg-white rounded-xl border mb-4 shadow-sm" style={{ borderColor: '#e2e8f0' }}>
              <div className="flex justify-between items-center px-5 py-3" style={{ borderBottom: '3px solid var(--color-primary)' }}>
                <div className="flex items-center gap-3">
                  <h1 className="text-lg font-semibold" style={{ color: '#0f172a' }}>Task Manager</h1>
                  {/* Tasks/Notes Toggle */}
                  <div className="inline-flex items-center bg-gray-100 rounded-full p-1 ml-4">
                    <button
                      onClick={() => setCurrentView('tasks')}
                      className="px-3 py-1 text-sm rounded-full transition-all duration-200"
                      style={{ 
                        backgroundColor: currentView === 'tasks' ? 'var(--color-primary)' : 'transparent',
                        color: currentView === 'tasks' ? 'white' : 'var(--color-text-secondary)',
                        fontWeight: currentView === 'tasks' ? 600 : 400,
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Tasks
                    </button>
                    <button
                      onClick={() => setCurrentView('notes')}
                      className="px-3 py-1 text-sm rounded-full transition-all duration-200"
                      style={{ 
                        backgroundColor: currentView === 'notes' ? 'var(--color-primary)' : 'transparent',
                        color: currentView === 'notes' ? 'white' : 'var(--color-text-secondary)',
                        fontWeight: currentView === 'notes' ? 600 : 400,
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Notes
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <UserProfile />
                </div>
              </div>
            </div>
            {currentView === 'tasks' ? (
              <EmptyProjectState onCreateProject={handleCreateProject} />
            ) : (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center max-w-md">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'var(--color-surface)' }}>
                    <FileText size={48} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  
                  <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
                    No Notes Yet
                  </h2>
                  
                  <p className="text-gray-600 mb-6">
                    Notes are only available after creating a project. Create your first project to get started.
                  </p>
                  
                  <button
                    onClick={handleCreateProject}
                    className="px-6 py-3 rounded-lg font-medium transition-colors text-white"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    Create Your First Project
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
        
        {/* Dialogs need to be rendered outside the early return */}
        <InputDialog
          isOpen={projectNameDialog}
          onClose={() => setProjectNameDialog(false)}
          onConfirm={handleProjectNameSubmit}
          title="Create New Project"
          placeholder="Enter project name"
        />
        
        <InputDialog
          isOpen={projectIconDialog}
          onClose={() => {
            setProjectIconDialog(false);
            setPendingProjectName('');
          }}
          onConfirm={handleProjectIconSubmit}
          title="Choose Project Icon"
          placeholder="Enter emoji (e.g., 📋, 🚀, 💡)"
          defaultValue="📋"
        />
      </>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
      <main className="px-5 py-4 flex-1 flex flex-col min-h-0 overflow-hidden">{/* Error Alert Banner */}
        {error && (
          <div 
            className="rounded-xl border mb-4 shadow-sm p-3 flex items-start gap-3"
            style={{ 
              backgroundColor: '#fef2f2',
              borderColor: '#fecaca'
            }}
          >
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1" style={{ color: '#f30047' }}>
                Error Loading Data
              </h3>
              <p className="text-sm" style={{ color: '#991b1b' }}>
                {error}
              </p>
            </div>
            <button
              onClick={() => {
                setError(null);
                if (selectedProjectId) {
                  fetchTasks();
                  fetchProjectSettings();
                }
              }}
              className="px-3 py-1 text-sm rounded-md transition-colors font-medium"
              style={{
                backgroundColor: '#f30047',
                color: 'white',
              }}
            >
              Retry
            </button>
            <button
              onClick={() => setError(null)}
              className="p-1 rounded-md transition-colors"
              style={{ color: '#991b1b' }}
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        )}
        
        {/* Page Header with Filters */}
        <div className="rounded-xl border mb-4 shadow-sm flex-shrink-0" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {/* Top Bar */}
          <div className="flex justify-between items-center px-5 py-3" style={{ borderBottom: '3px solid var(--color-primary)' }}>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
                <button
                  onClick={() => setCurrentView('tasks')}
                  className="px-3 py-1 text-sm rounded-full transition-all duration-200"
                  style={{ 
                    backgroundColor: currentView === 'tasks' ? 'var(--color-primary)' : 'transparent',
                    color: currentView === 'tasks' ? 'white' : 'var(--color-text-secondary)',
                    fontWeight: currentView === 'tasks' ? 600 : 400,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Tasks
                </button>
                <button
                  onClick={() => setCurrentView('notes')}
                  className="px-3 py-1 text-sm rounded-full transition-all duration-200"
                  style={{ 
                    backgroundColor: currentView === 'notes' ? 'var(--color-primary)' : 'transparent',
                    color: currentView === 'notes' ? 'white' : 'var(--color-text-secondary)',
                    fontWeight: currentView === 'notes' ? 600 : 400,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Notes
                </button>
              </div>
              {currentView === 'tasks' && (
                <div key="project-selector" className="border-l pl-4 animate-fadeIn" style={{ borderColor: 'var(--color-border)' }}>
                  <ProjectSelector
                    projects={projects}
                    selectedProjectId={selectedProjectId}
                    onChange={setSelectedProjectId}
                    onCreateProject={handleCreateProject}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {currentView === 'tasks' && (
                <>
                  <DailyStatsCard 
                    completedToday={dailyStats.completedToday}
                    totalTasks={dailyStats.totalTasks}
                    percentComplete={dailyStats.percentComplete}
                  />
                  <button
                    key="search-filters"
                    onClick={() => setShowSearchFilters(!showSearchFilters)}
                    className="px-3 py-1.5 text-sm border rounded-md transition-all duration-200 flex items-center gap-2 font-medium animate-fadeIn"
                    style={{ 
                      borderColor: showSearchFilters ? 'var(--color-primary)' : 'var(--color-border)',
                      color: showSearchFilters ? 'var(--color-primary)' : 'var(--color-text)',
                      backgroundColor: showSearchFilters ? 'var(--color-surface-muted)' : 'var(--color-surface)'
                    }}
                    onMouseEnter={(e) => {
                      if (!showSearchFilters) {
                        e.currentTarget.style.backgroundColor = 'var(--color-bg)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!showSearchFilters) {
                        e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                      }
                    }}
                    title="Toggle search and filters"
                  >
                    <Search size={16} />
                    Search & Filters
                  </button>
                  <button
                    key="new-task"
                    onClick={handleNewTask}
                    disabled={!permissions.canEdit}
                    className="px-3 py-1.5 text-sm rounded-md transition-all duration-200 flex items-center gap-2 font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed animate-fadeIn"
                    style={{ 
                      backgroundColor: permissions.canEdit ? 'var(--color-primary)' : '#94a3b8'
                    }}
                    title={!permissions.canEdit ? 'You need EDIT permission to create tasks' : 'Create a new task'}
                  >
                    <Plus size={16} />
                    New Task
                  </button>
                </>
              )}
              {currentView === 'notes' && (
                <button
                  key="new-note"
                  onClick={handleNewNote}
                  className="px-3 py-1.5 text-sm rounded-md transition-all duration-200 flex items-center gap-2 font-medium text-white animate-fadeIn"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Plus size={16} />
                  New Note
                </button>
              )}
              <UserProfile />
            </div>
          </div>
          
          {/* Collapsible Filters Bar with Slide Animation */}
          <div 
            className="transition-all duration-300 ease-in-out border-t"
            style={{ 
              maxHeight: showSearchFilters ? '500px' : '0',
              opacity: showSearchFilters ? 1 : 0,
              borderColor: showSearchFilters ? 'var(--color-border)' : 'transparent',
              overflow: showSearchFilters ? 'visible' : 'hidden',
            }}
          >
            <div className="px-5 py-3" style={{ backgroundColor: 'var(--color-bg)' }}>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[300px]">
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all"
                    style={{ 
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                    }}
                    onFocus={(e) => {
                      e.target.style.boxShadow = '0 0 0 2px var(--color-primary)';
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = '';
                    }}
                  />
                </div>
                <Filters filters={filters} onChange={setFilters} owners={owners} />
                
                {/* Display Options */}
                <div className="flex items-end">
                  <DisplayOptionsMenu
                    showOwner={showOwner}
                    showPriority={showPriority}
                    showDueDate={showDueDate}
                    onToggleOwner={() => setShowOwner(!showOwner)}
                    onTogglePriority={() => setShowPriority(!showPriority)}
                    onToggleDueDate={() => setShowDueDate(!showDueDate)}
                  />
                </div>
                
                {/* View Mode Toggle */}
                <div className="min-w-[100px]">
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                    View
                  </label>
                  <div className="flex gap-1 border rounded-md p-1" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <button
                    onClick={() => setViewModeCompact('normal')}
                      className="flex-1 px-3 py-1 rounded text-xs font-medium transition-all flex items-center justify-center gap-1"
                      style={{
                      backgroundColor: viewModeCompact === 'normal' ? 'var(--color-primary)' : 'transparent',
                        color: viewModeCompact === 'normal' ? 'white' : 'var(--color-text-secondary)',
                      }}
                      title="Normal view"
                    >
                    <LayoutGrid size={14} />
                    <span>Normal</span>
                  </button>
                  <button
                    onClick={() => setViewModeCompact('compact')}
                    className="flex-1 px-3 py-1 rounded text-xs font-medium transition-all flex items-center justify-center gap-1"
                    style={{
                      backgroundColor: viewModeCompact === 'compact' ? 'var(--color-primary)' : 'transparent',
                      color: viewModeCompact === 'compact' ? 'white' : 'var(--color-text-secondary)',
                    }}
                    title="Compact view"
                  >
                    <List size={14} />
                    <span>Compact</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Content Area - Switch between Tasks and Notes */}
        {currentView === 'tasks' ? (
          /* Kanban Board */
          <DndContext 
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="relative flex-1 min-h-0">
              <div 
                className="kanban-scroll-container flex gap-5 overflow-x-auto pb-4 px-2 -mx-2 h-full"
                onScroll={handleKanbanScroll}
              >
                {statusColumns.map(column => (
                  <KanbanColumn
                    key={column.value}
                    id={column.value}
                    title={column.label}
                    tasks={tasksByStatus[column.value] || []}
                    onTaskClick={handleTaskClick}
                    onQuickComplete={handleQuickComplete}
                    color={column.color}
                    viewMode={viewModeCompact}
                    canEdit={permissions.canEdit}
                    showOwner={showOwner}
                    showPriority={showPriority}
                    showDueDate={showDueDate}
                  />
                ))}
              </div>
              
              {/* Left fade overlay - shows when scrolled */}
              <div 
                className="absolute top-0 bottom-0 pointer-events-none transition-opacity duration-300"
                style={{
                  left: '-28px', // Extend beyond container padding
                  width: '128px', // Reduced to ~50% (100px + 28px)
                  background: 'linear-gradient(to right, var(--color-bg) 0%, var(--color-bg) 20%, transparent 100%)',
                  opacity: showLeftFade ? 1 : 0,
                }}
              />
              
              {/* Right fade overlay - shows when there's more content to the right */}
              <div 
                className="absolute top-0 bottom-0 pointer-events-none transition-opacity duration-300"
                style={{
                  right: '-28px', // Extend beyond container padding
                  width: '128px', // Reduced to ~50% (100px + 28px)
                  background: 'linear-gradient(to left, var(--color-bg) 0%, var(--color-bg) 20%, transparent 100%)',
                  opacity: showRightFade ? 1 : 0,
                }}
              />
            </div>
            <DragOverlay dropAnimation={null}>
              {activeTask ? (
                <div className="rotate-3 scale-105 shadow-2xl">
                  <TaskCard 
                    task={activeTask} 
                    onClick={() => {}} 
                    statusColor={statusColumns.find(c => c.value === activeTask.status)?.color}
                    viewMode={viewModeCompact}
                    showOwner={showOwner}
                    showPriority={showPriority}
                    showDueDate={showDueDate}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          /* Notes Table */
          <div className="rounded-xl border shadow-sm overflow-hidden animate-fadeIn flex-1 min-h-0 flex flex-col" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            {/* Search Bar */}
            <div className="px-7 py-4 flex-shrink-0" style={{ backgroundColor: 'var(--color-bg)', borderBottom: `1px solid var(--color-border)` }}>
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search notes..."
                    value={notesSearchQuery}
                    onChange={(e) => setNotesSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                </div>
              </div>
            </div>

            {filteredNotes.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <FileText size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                  {notesSearchQuery ? 'No notes found' : 'No notes yet'}
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  {notesSearchQuery ? 'Try adjusting your search' : 'Create your first note to get started'}
                </p>
                {!notesSearchQuery && (
                  <button
                    onClick={handleNewNote}
                    className="px-4 py-2 text-sm rounded-md flex items-center gap-2 font-medium text-white mx-auto"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Plus size={16} />
                    Create Note
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto flex-1 min-h-0">
                <table className="w-full">
                  <thead className="border-b" style={{ backgroundColor: '#f8fafc', borderColor: 'var(--color-border)' }}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748b' }}>Title</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748b' }}>Calendar Event</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748b' }}>Created</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748b' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNotes.map((note) => (
                      <tr
                        key={note.id}
                        className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                        style={{ borderColor: 'var(--color-border)' }}
                        onClick={() => handleViewNote(note)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <FileText size={18} className="text-gray-400 flex-shrink-0" />
                            <div>
                              <div className="font-medium" style={{ color: 'var(--color-text)' }}>{note.title}</div>
                              {note.tasks && note.tasks.length > 0 && (
                                <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                  {note.tasks.length} task{note.tasks.length !== 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {note.calendarEventData ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar size={14} className="text-blue-600" />
                              <span style={{ color: 'var(--color-text-secondary)' }}>
                                {format(toZonedTime(new Date(note.calendarEventData.start), userTimezone), 'dd.MM.yyyy')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            {format(new Date(note.createdAt), 'dd.MM.yyyy')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewNote(note);
                              }}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View note"
                            >
                              <Edit size={16} style={{ color: 'var(--color-text-secondary)' }} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNote(note);
                              }}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete note"
                            >
                              <Trash2 size={16} className="text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      <TaskModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTask(null);
          // No need to refetch - optimistic updates handle this
        }}
        onSave={handleSaveTask}
        onUpdate={handleOptimisticUpdate}
        onDelete={deleteTask}
        projects={projects}
        defaultProjectId={selectedProjectId || undefined}
      />
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title="Delete Note"
        message={confirmDialog.message}
        type="danger"
      />
      
      <InputDialog
        isOpen={projectNameDialog}
        onClose={() => setProjectNameDialog(false)}
        onConfirm={handleProjectNameSubmit}
        title="Create New Project"
        placeholder="Enter project name"
      />
      
      <InputDialog
        isOpen={projectIconDialog}
        onClose={() => {
          setProjectIconDialog(false);
          setPendingProjectName('');
        }}
        onConfirm={handleProjectIconSubmit}
        title="Choose Project Icon"
        placeholder="Enter emoji (e.g., 📋, 🚀, 💡)"
        defaultValue="📋"
      />
    </div>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Loading...</div>}>
        <HomePage />
      </Suspense>
    </AuthGuard>
  );
}
