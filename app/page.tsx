'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Plus, Settings, LayoutGrid, List, X } from 'lucide-react';
import Link from 'next/link';
import { Task, TaskStatus } from '@/types';
import TaskCard from '@/components/TaskCard';
import TaskModal from '@/components/TaskModal';
import ProjectSelector from '@/components/ProjectSelector';
import Filters from '@/components/Filters';
import KanbanColumn from '@/components/KanbanColumn';
import AuthGuard from '@/components/AuthGuard';
import UserProfile from '@/components/UserProfile';
import EmptyProjectState from '@/components/EmptyProjectState';
import InputDialog from '@/components/InputDialog';
import { useAuth } from '@/lib/auth-context';
import { authenticatedFetch } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { useProjectPermissions } from '@/lib/use-permissions';
import { useProjectData } from '@/hooks/useProjectData';
import { useTaskData } from '@/hooks/useTaskData';
import { useTaskFilters } from '@/hooks/useTaskFilters';
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

function HomePage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
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
    fetchTasks,
    updateTaskStatus,
    saveTask,
  } = useTaskData(selectedProjectId, user?.uid);
  
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    filteredTasks,
    owners,
  } = useTaskFilters(tasks);
  
  // UI State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusColumns, setStatusColumns] = useState<StatusOption[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'normal' | 'compact'>('normal');
  const [error, setError] = useState<string | null>(null);
  
  // Fetch user permissions for selected project
  const permissions = useProjectPermissions(selectedProjectId);
  
  // Input dialog states
  const [projectNameDialog, setProjectNameDialog] = useState(false);
  const [projectIconDialog, setProjectIconDialog] = useState(false);
  const [pendingProjectName, setPendingProjectName] = useState('');

  // Memoize sensor configuration to prevent re-creation
  const sensorConfig = useMemo(() => ({
    activationConstraint: {
      distance: DRAG_ACTIVATION_DISTANCE,
      delay: DRAG_ACTIVATION_DELAY,
      tolerance: DRAG_ACTIVATION_TOLERANCE,
    },
  }), []);
  
  const sensors = useSensors(
    useSensor(PointerSensor, sensorConfig)
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
      const res = await authenticatedFetch(`/api/projects/${selectedProjectId}/settings`);
      const data = await res.json();
      
      if (data.statusOptions && Array.isArray(data.statusOptions)) {
        setStatusColumns(data.statusOptions.map((opt: any) => ({
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
  }, [selectedProjectId, fetchTasks, fetchProjectSettings, user?.uid]);

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

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  }, []);

  const handleNewTask = useCallback(() => {
    setSelectedTask(null);
    setIsModalOpen(true);
  }, []);

  const handleDragStart = useCallback((event: any) => {
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

  // Memoize tasks grouped by status
  const tasksByStatus = useMemo(() => {
    return statusColumns.reduce((acc, column) => {
      acc[column.value] = filteredTasks.filter(t => t.status === column.value);
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
      <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
        <main className="px-7 py-7">
          <div className="bg-white rounded-xl border mb-6 shadow-sm" style={{ borderColor: '#e2e8f0' }}>
            <div className="flex justify-between items-center px-7 py-4" style={{ borderBottom: '3px solid var(--color-primary)' }}>
              <h1 className="text-lg font-semibold" style={{ color: '#0f172a' }}>Task Manager</h1>
              <div className="flex items-center gap-3">
                <UserProfile />
              </div>
            </div>
          </div>
          <EmptyProjectState onCreateProject={handleCreateProject} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <main className="px-7 py-7">
        {/* Error Alert Banner */}
        {error && (
          <div 
            className="rounded-xl border mb-6 shadow-sm p-4 flex items-start gap-3"
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
        <div className="rounded-xl border mb-6 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {/* Top Bar */}
          <div className="flex justify-between items-center px-7 py-4" style={{ borderBottom: '3px solid var(--color-primary)' }}>
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Task Manager</h1>
              <div className="border-l pl-4" style={{ borderColor: 'var(--color-border)' }}>
                <ProjectSelector
                  projects={projects}
                  selectedProjectId={selectedProjectId}
                  onChange={setSelectedProjectId}
                  onCreateProject={handleCreateProject}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewTask}
                disabled={!permissions.canEdit}
                className="px-4 py-2 text-sm rounded-md transition-colors flex items-center gap-2 font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: permissions.canEdit ? 'var(--color-primary)' : '#94a3b8'
                }}
                title={!permissions.canEdit ? 'You need EDIT permission to create tasks' : 'Create a new task'}
              >
                <Plus size={16} />
                New Task
              </button>
              <Link
                href="/settings"
                className="px-4 py-2 text-sm border rounded-md transition-colors flex items-center gap-2 font-medium"
                style={{ 
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                  backgroundColor: 'var(--color-surface)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
              >
                <Settings size={16} />
                Settings
              </Link>
              <UserProfile />
            </div>
          </div>
          
          {/* Filters Bar */}
          <div className="px-7 py-4" style={{ backgroundColor: 'var(--color-bg)' }}>
            <div className="flex flex-wrap items-end gap-4">
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
              
              {/* View Mode Toggle */}
              <div className="min-w-[100px]">
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                  View
                </label>
                <div className="flex gap-1 border rounded-md p-1" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                  <button
                    onClick={() => setViewMode('normal')}
                    className="flex-1 px-3 py-1 rounded text-xs font-medium transition-all flex items-center justify-center gap-1"
                    style={{
                      backgroundColor: viewMode === 'normal' ? 'var(--color-primary)' : 'transparent',
                      color: viewMode === 'normal' ? 'white' : 'var(--color-text-secondary)',
                    }}
                    title="Normal view"
                  >
                    <LayoutGrid size={14} />
                    <span>Normal</span>
                  </button>
                  <button
                    onClick={() => setViewMode('compact')}
                    className="flex-1 px-3 py-1 rounded text-xs font-medium transition-all flex items-center justify-center gap-1"
                    style={{
                      backgroundColor: viewMode === 'compact' ? 'var(--color-primary)' : 'transparent',
                      color: viewMode === 'compact' ? 'white' : 'var(--color-text-secondary)',
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

        {/* Kanban Board */}
        <DndContext 
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-[1600px] mx-auto">
            {statusColumns.map(column => (
              <KanbanColumn
                key={column.value}
                id={column.value}
                title={column.label}
                tasks={tasksByStatus[column.value] || []}
                onTaskClick={handleTaskClick}
                color={column.color}
                viewMode={viewMode}
                canEdit={permissions.canEdit}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <div className="rotate-3 scale-105 shadow-2xl">
                <TaskCard 
                  task={activeTask} 
                  onClick={() => {}} 
                  statusColor={statusColumns.find(c => c.value === activeTask.status)?.color}
                  viewMode={viewMode}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      <TaskModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTask(null);
          // Refresh tasks to show any auto-saved changes
          fetchTasks();
        }}
        onSave={handleSaveTask}
        projects={projects}
        defaultProjectId={selectedProjectId || undefined}
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
