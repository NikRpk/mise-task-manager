'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Save, Info, Check, Plus, Trash2, GripVertical, Mail, Shield, X, Lock, Calendar } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AuthGuard from '@/components/AuthGuard';
import SettingsLayout from '@/components/SettingsLayout';
import ConfirmDialog from '@/components/ConfirmDialog';
import AlertDialog from '@/components/AlertDialog';
import { useAuth } from '@/lib/auth-context';
import { authenticatedFetch } from '@/lib/api-client';
import { colorSchemes, useTheme } from '@/lib/theme-context';
import TipTapEditor from '@/components/TipTapEditor';
import { ProjectSettings, StatusOption, PriorityOption, CustomField, ProjectMember, ProjectRole } from '@/types';

interface UserSettings {
  colorScheme: string;
  displayName?: string;
  notifications?: {
    email: boolean;
    desktop: boolean;
  };
}

// Sortable Status Item Component (defined outside to prevent re-creation)
const SortableStatusItem = React.memo(({ 
  status, 
  onUpdate, 
  onDelete 
}: { 
  status: StatusOption;
  onUpdate: (id: string, updates: Partial<StatusOption>) => void;
  onDelete: (id: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderColor: 'var(--color-border)',
        backgroundColor: status.isDefault ? '#f0fdf4' : 'transparent',
      }}
      className="flex items-center gap-3 p-3 border rounded-lg"
      {...(status.isDefault ? {} : { ...attributes })}
    >
      {status.isDefault ? (
        <Lock size={16} className="text-green-600" title="Default status - cannot be deleted" />
      ) : (
        <div {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical size={16} className="text-gray-400" />
        </div>
      )}
      <input
        type="text"
        value={status.label}
        onChange={(e) => onUpdate(status.id, { label: e.target.value })}
        className="flex-1 px-3 py-2 border rounded-md"
        style={{ borderColor: 'var(--color-border)' }}
        placeholder="Status name"
      />
      <input
        type="color"
        value={status.color}
        onChange={(e) => onUpdate(status.id, { color: e.target.value })}
        className="w-12 h-10 border rounded-md cursor-pointer"
        style={{ borderColor: 'var(--color-border)' }}
      />
      {status.isDefault ? (
        <div className="w-10 h-10 flex items-center justify-center text-xs text-gray-400" title="Default status cannot be deleted">
          <Lock size={16} />
        </div>
      ) : (
        <button
          onClick={() => onDelete(status.id)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
          title="Delete status"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
});

SortableStatusItem.displayName = 'SortableStatusItem';

// Sortable Priority Item Component (defined outside to prevent re-creation)
const SortablePriorityItem = React.memo(({ 
  priority, 
  onUpdate, 
  onDelete 
}: { 
  priority: PriorityOption;
  onUpdate: (id: string, updates: Partial<PriorityOption>) => void;
  onDelete: (id: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: priority.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderColor: 'var(--color-border)',
        backgroundColor: priority.isDefault ? '#f0fdf4' : 'transparent',
      }}
      className="flex items-center gap-3 p-3 border rounded-lg"
      {...(priority.isDefault ? {} : { ...attributes })}
    >
      {priority.isDefault ? (
        <Lock size={16} className="text-green-600" title="Default priority - cannot be deleted" />
      ) : (
        <div {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical size={16} className="text-gray-400" />
        </div>
      )}
      <input
        type="text"
        value={priority.label}
        onChange={(e) => onUpdate(priority.id, { label: e.target.value })}
        className="flex-1 px-3 py-2 border rounded-md"
        style={{ borderColor: 'var(--color-border)' }}
        placeholder="Priority name"
      />
      <input
        type="color"
        value={priority.color}
        onChange={(e) => onUpdate(priority.id, { color: e.target.value })}
        className="w-12 h-10 border rounded-md cursor-pointer"
        style={{ borderColor: 'var(--color-border)' }}
      />
      {priority.isDefault ? (
        <div className="w-10 h-10 flex items-center justify-center text-xs text-gray-400" title="Default priority cannot be deleted">
          <Lock size={16} />
        </div>
      ) : (
        <button
          onClick={() => onDelete(priority.id)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
          title="Delete priority"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
});

SortablePriorityItem.displayName = 'SortablePriorityItem';

function SettingsContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { currentScheme, setScheme } = useTheme();
  
  const section = searchParams.get('section') || 'profile';
  const projectId = searchParams.get('projectId');

  const [userSettings, setUserSettings] = useState<UserSettings>({
    colorScheme: 'hellofresh',
    displayName: '',
    notifications: {
      email: true,
      desktop: true,
    },
  });

  const [originalUserSettings, setOriginalUserSettings] = useState<UserSettings>({
    colorScheme: 'hellofresh',
    displayName: '',
    notifications: {
      email: true,
      desktop: true,
    },
  });

  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({
    statusOptions: [],
    priorityOptions: [],
    customFields: [],
  });

  const [originalProjectSettings, setOriginalProjectSettings] = useState<ProjectSettings>({
    statusOptions: [],
    priorityOptions: [],
    customFields: [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectIcon, setProjectIcon] = useState('📋');
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<ProjectRole>('EDIT');
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  
  // Dialog state
  const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'warning' | 'info' | 'success' }>({ isOpen: false, title: '', message: '', type: 'info' });
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; type: 'danger' | 'warning' | 'info'; onConfirm: () => void; children?: React.ReactNode }>({ isOpen: false, title: '', message: '', type: 'warning', onConfirm: () => {} });
  
  // Migration dialog state
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [migrationSourceId, setMigrationSourceId] = useState<string>('');
  const [migrationTargetId, setMigrationTargetId] = useState<string>('');
  const [migrationTaskCount, setMigrationTaskCount] = useState(0);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (user) {
      fetchUserSettings();
      checkCalendarConnection();
    }
  }, [user]);

  const checkCalendarConnection = async () => {
    try {
      const res = await authenticatedFetch('/api/calendar/events');
      setIsCalendarConnected(res.ok);
    } catch (error) {
      setIsCalendarConnected(false);
    }
  };

  useEffect(() => {
    if (projectId && section.startsWith('project-')) {
      fetchProjectSettings();
      fetchProjectDetails();
      if (section === 'project-members') {
        fetchProjectMembers();
      }
    }
  }, [projectId, section]);

  const fetchUserSettings = async () => {
    try {
      const res = await authenticatedFetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setUserSettings(data);
        setOriginalUserSettings(data); // Store original for comparison
      } else {
        console.error('Failed to fetch settings:', res.status, await res.text());
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const fetchProjectDetails = async () => {
    if (!projectId) return;
    try {
      const res = await authenticatedFetch(`/api/projects/${projectId}`);
      const data = await res.json();
      setProjectName(data.name);
      setProjectIcon(data.icon || '📋');
    } catch (error) {
      console.error('Failed to fetch project details:', error);
    }
  };

  const fetchProjectSettings = async () => {
    if (!projectId) return;
    try {
      const res = await authenticatedFetch(`/api/projects/${projectId}/settings`);
      if (res.ok) {
        const data = await res.json();
        
        // Ensure default status options are present and marked
        if (!data.statusOptions || data.statusOptions.length === 0) {
          data.statusOptions = [
            { id: 'todo', label: 'To Do', color: '#94a3b8', isDefault: true },
            { id: 'in-progress', label: 'In Progress', color: '#3b82f6', isDefault: false },
            { id: 'review', label: 'Review', color: '#f59e0b', isDefault: false },
            { id: 'done', label: 'Done', color: '#10b981', isDefault: true },
          ];
        } else {
          // Mark existing default statuses as isDefault
          data.statusOptions = data.statusOptions.map((opt: StatusOption) => ({
            ...opt,
            isDefault: opt.id === 'todo' || opt.id === 'done' ? true : (opt.isDefault || false),
          }));
        }
        
        // Ensure default priority options are present and marked
        if (!data.priorityOptions || data.priorityOptions.length === 0) {
          data.priorityOptions = [
            { id: 'low', label: 'Low', color: '#94a3b8', isDefault: true },
            { id: 'medium', label: 'Medium', color: '#f59e0b', isDefault: false },
            { id: 'high', label: 'High', color: '#ef4444', isDefault: true },
          ];
        } else {
          // Mark existing default priorities as isDefault
          data.priorityOptions = data.priorityOptions.map((opt: PriorityOption) => ({
            ...opt,
            isDefault: opt.id === 'low' || opt.id === 'high' ? true : (opt.isDefault || false),
          }));
        }
        
        setProjectSettings(data);
        setOriginalProjectSettings(data); // Store original for comparison
      } else {
        console.error('Failed to fetch project settings:', res.status, await res.text());
      }
    } catch (error) {
      console.error('Failed to fetch project settings:', error);
    }
  };

  const saveUserSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await authenticatedFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(userSettings),
      });
      
      if (userSettings.colorScheme) {
        setScheme(userSettings.colorScheme);
      }
      
      setOriginalUserSettings(userSettings); // Update original after successful save
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to save settings. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveProjectSettings = async () => {
    if (!projectId) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await authenticatedFetch(`/api/projects/${projectId}/settings`, {
        method: 'PUT',
        body: JSON.stringify(projectSettings),
      });
      setOriginalProjectSettings(projectSettings); // Update original after successful save
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to save settings. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Check if there are unsaved changes
  const hasUserChanges = JSON.stringify(userSettings) !== JSON.stringify(originalUserSettings);
  const hasProjectChanges = JSON.stringify(projectSettings) !== JSON.stringify(originalProjectSettings);
  const hasChanges = section.startsWith('project-') ? hasProjectChanges : hasUserChanges;

  const handleSave = () => {
    if (section.startsWith('project-')) {
      saveProjectSettings();
    } else {
      saveUserSettings();
    }
  };

  // Project settings handlers
  const addStatusOption = () => {
    const id = `status-${Date.now()}`;
    setProjectSettings({
      ...projectSettings,
      statusOptions: [
        ...projectSettings.statusOptions,
        { id, label: 'New Status', color: '#64748b' },
      ],
    });
  };

  const handleStatusDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = projectSettings.statusOptions.findIndex((item) => item.id === active.id);
      const newIndex = projectSettings.statusOptions.findIndex((item) => item.id === over.id);

      setProjectSettings({
        ...projectSettings,
        statusOptions: arrayMove(projectSettings.statusOptions, oldIndex, newIndex),
      });
    }
  };

  const updateStatusOption = (id: string, updates: Partial<StatusOption>) => {
    setProjectSettings({
      ...projectSettings,
      statusOptions: projectSettings.statusOptions.map(opt =>
        opt.id === id ? { ...opt, ...updates } : opt
      ),
    });
  };

  const deleteStatusOption = (id: string) => {
    const statusToDelete = projectSettings.statusOptions.find(opt => opt.id === id);
    
    // Prevent deletion of default options
    if (statusToDelete?.isDefault) {
      setAlertDialog({
        isOpen: true,
        title: 'Cannot Delete Default Status',
        message: 'Cannot delete default status options. These are required for the project.\n\nYou can rename or change the color, but cannot delete them.',
        type: 'warning',
      });
      return;
    }
    
    // Check if any tasks are using this status
    checkTasksUsingStatus(id);
  };

  const checkTasksUsingStatus = async (statusId: string) => {
    if (!projectId) return;
    
    try {
      const res = await authenticatedFetch(`/api/tasks?projectId=${projectId}`);
      const tasks = await res.json();
      
      const statusValue = projectSettings.statusOptions.find(opt => opt.id === statusId)?.id;
      const tasksWithStatus = tasks.filter((task: any) => task.status === statusValue);
      
      if (tasksWithStatus.length > 0) {
        // Show migration dialog
        setMigrationSourceId(statusId);
        setMigrationTaskCount(tasksWithStatus.length);
        const firstAvailableStatus = projectSettings.statusOptions.find(opt => opt.id !== statusId);
        setMigrationTargetId(firstAvailableStatus?.id || '');
        setShowMigrationDialog(true);
      } else {
        // No tasks using this status, safe to delete immediately
        setConfirmDialog({
          isOpen: true,
          title: 'Delete Status',
          message: 'Are you sure you want to delete this status?',
          type: 'danger',
          onConfirm: async () => {
            const updatedSettings = {
              ...projectSettings,
              statusOptions: projectSettings.statusOptions.filter(opt => opt.id !== statusId),
            };
            
            // Save to database immediately
            await authenticatedFetch(`/api/projects/${projectId}/settings`, {
              method: 'PUT',
              body: JSON.stringify(updatedSettings),
            });
            
            // Update local state
            setProjectSettings(updatedSettings);
          }
        });
      }
    } catch (error) {
      console.error('Failed to check tasks:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to check if tasks are using this status. Please try again.',
        type: 'error',
      });
    }
  };

  const confirmStatusMigration = async () => {
    if (!projectId || !migrationTargetId) return;
    
    try {
      // Migrate tasks to new status
      const res = await authenticatedFetch(`/api/tasks?projectId=${projectId}`);
      const tasks = await res.json();
      
      const sourceStatusValue = projectSettings.statusOptions.find(opt => opt.id === migrationSourceId)?.id;
      const targetStatusValue = projectSettings.statusOptions.find(opt => opt.id === migrationTargetId)?.id;
      
      const tasksToUpdate = tasks.filter((task: any) => task.status === sourceStatusValue);
      
      // Update all tasks
      await Promise.all(
        tasksToUpdate.map((task: any) =>
          authenticatedFetch(`/api/tasks/${task.id}`, {
            method: 'PUT',
            body: JSON.stringify({ ...task, status: targetStatusValue }),
          })
        )
      );
      
      // Remove the status option from settings
      const updatedSettings = {
        ...projectSettings,
        statusOptions: projectSettings.statusOptions.filter(opt => opt.id !== migrationSourceId),
      };
      
      // Save to database immediately
      await authenticatedFetch(`/api/projects/${projectId}/settings`, {
        method: 'PUT',
        body: JSON.stringify(updatedSettings),
      });
      
      // Update local state
      setProjectSettings(updatedSettings);
      
      setShowMigrationDialog(false);
      setMigrationSourceId('');
      setMigrationTargetId('');
      setMigrationTaskCount(0);
      
      setAlertDialog({
        isOpen: true,
        title: 'Success',
        message: `Successfully migrated ${tasksToUpdate.length} task(s) and deleted the status.`,
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to migrate tasks:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to migrate tasks. Please try again.',
        type: 'error',
      });
    }
  };

  const addPriorityOption = () => {
    const id = `priority-${Date.now()}`;
    setProjectSettings({
      ...projectSettings,
      priorityOptions: [
        ...projectSettings.priorityOptions,
        { id, label: 'New Priority', color: '#64748b' },
      ],
    });
  };

  const handlePriorityDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = projectSettings.priorityOptions.findIndex((item) => item.id === active.id);
      const newIndex = projectSettings.priorityOptions.findIndex((item) => item.id === over.id);

      setProjectSettings({
        ...projectSettings,
        priorityOptions: arrayMove(projectSettings.priorityOptions, oldIndex, newIndex),
      });
    }
  };

  const updatePriorityOption = (id: string, updates: Partial<PriorityOption>) => {
    setProjectSettings({
      ...projectSettings,
      priorityOptions: projectSettings.priorityOptions.map(opt =>
        opt.id === id ? { ...opt, ...updates } : opt
      ),
    });
  };

  const deletePriorityOption = async (id: string) => {
    const priorityToDelete = projectSettings.priorityOptions.find(opt => opt.id === id);
    
    // Prevent deletion of default options
    if (priorityToDelete?.isDefault) {
      setAlertDialog({
        isOpen: true,
        title: 'Cannot Delete Default Priority',
        message: 'Cannot delete default priority options. These are required for the project.\n\nYou can rename or change the color, but cannot delete them.',
        type: 'warning',
      });
      return;
    }
    
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Priority',
      message: 'Are you sure you want to delete this priority?',
      type: 'danger',
      onConfirm: async () => {
        if (!projectId) return;
        
        try {
          const updatedSettings = {
            ...projectSettings,
            priorityOptions: projectSettings.priorityOptions.filter(opt => opt.id !== id),
          };
          
          // Save to database immediately
          await authenticatedFetch(`/api/projects/${projectId}/settings`, {
            method: 'PUT',
            body: JSON.stringify(updatedSettings),
          });
          
          // Update local state
          setProjectSettings(updatedSettings);
        } catch (error) {
          console.error('Failed to delete priority:', error);
          setAlertDialog({
            isOpen: true,
            title: 'Error',
            message: 'Failed to delete priority. Please try again.',
            type: 'error',
          });
        }
      }
    });
  };

  // Custom Fields handlers
  const addCustomField = () => {
    const id = `field-${Date.now()}`;
    setProjectSettings({
      ...projectSettings,
      customFields: [
        ...projectSettings.customFields,
        { id, name: 'New Field', type: 'text', required: false },
      ],
    });
  };

  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setProjectSettings({
      ...projectSettings,
      customFields: projectSettings.customFields.map(field =>
        field.id === id ? { ...field, ...updates } : field
      ),
    });
  };

  const deleteCustomField = async (id: string) => {
    if (!projectId) return;
    
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Custom Field',
      message: 'Are you sure you want to delete this custom field? This will remove it from all tasks.',
      type: 'danger',
      onConfirm: async () => {
        try {
          const updatedSettings = {
            ...projectSettings,
            customFields: projectSettings.customFields.filter(field => field.id !== id),
          };
          
          // Save to database immediately
          await authenticatedFetch(`/api/projects/${projectId}/settings`, {
            method: 'PUT',
            body: JSON.stringify(updatedSettings),
          });
          
          // Update local state
          setProjectSettings(updatedSettings);
        } catch (error) {
          console.error('Failed to delete custom field:', error);
          setAlertDialog({
            isOpen: true,
            title: 'Error',
            message: 'Failed to delete custom field. Please try again.',
            type: 'error',
          });
        }
      }
    });
  };

  // Members handlers
  const fetchProjectMembers = async () => {
    if (!projectId) return;
    try {
      const res = await authenticatedFetch(`/api/projects/${projectId}/members`);
      if (res.ok) {
        const data = await res.json();
        setProjectMembers(data);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const addMember = async () => {
    if (!projectId || !newMemberEmail) return;
    
    try {
      const res = await authenticatedFetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: newMemberEmail, role: newMemberRole }),
      });
      
      if (res.ok) {
        setNewMemberEmail('');
        setNewMemberRole('EDIT');
        fetchProjectMembers();
      } else {
        const error = await res.json();
        setAlertDialog({
          isOpen: true,
          title: 'Error',
          message: error.error || 'Failed to add member',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to add member:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to add member',
        type: 'error',
      });
    }
  };

  const updateMemberRole = async (userId: string, newRole: ProjectRole) => {
    if (!projectId) return;
    
    try {
      const res = await authenticatedFetch(`/api/projects/${projectId}/members`, {
        method: 'PATCH',
        body: JSON.stringify({ userId, role: newRole }),
      });
      
      if (res.ok) {
        fetchProjectMembers();
      } else {
        const error = await res.json();
        setAlertDialog({
          isOpen: true,
          title: 'Error',
          message: error.error || 'Failed to update role',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to update role:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to update role',
        type: 'error',
      });
    }
  };

  const removeMember = async (userId: string) => {
    if (!projectId) return;
    
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Member',
      message: 'Are you sure you want to remove this member from the project?',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await authenticatedFetch(`/api/projects/${projectId}/members?userId=${userId}`, {
            method: 'DELETE',
          });
          
          if (res.ok) {
            fetchProjectMembers();
          } else {
            const error = await res.json();
            setAlertDialog({
              isOpen: true,
              title: 'Error',
              message: error.error || 'Failed to remove member',
              type: 'error',
            });
          }
        } catch (error) {
          console.error('Failed to remove member:', error);
          setAlertDialog({
            isOpen: true,
            title: 'Error',
            message: 'Failed to remove member',
            type: 'error',
          });
        }
      }
    });
  };

  const renderContent = () => {
    switch (section) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="rounded-lg shadow-sm border p-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                  Profile Settings
                </h2>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  className="px-4 py-2 text-sm rounded-md transition-all flex items-center gap-2 font-medium disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: saveSuccess ? '#10b981' : (hasChanges ? 'var(--color-primary)' : 'var(--color-surface)'),
                    color: saveSuccess ? 'white' : (hasChanges ? 'white' : '#94a3b8'),
                    border: `1px solid ${saveSuccess ? '#10b981' : (hasChanges ? 'var(--color-primary)' : 'var(--color-border)')}`,
                    opacity: (!hasChanges && !saveSuccess) ? 0.6 : 1,
                  }}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: hasChanges ? 'white' : 'var(--color-primary)' }}></div>
                      Saving...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check size={16} />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save
                    </>
                  )}
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={userSettings.displayName || user?.displayName || ''}
                    onChange={(e) => setUserSettings({ ...userSettings, displayName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    style={{ borderColor: 'var(--color-border)' }}
                    placeholder="Your display name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                    Timezone
                  </label>
                  <select
                    value={userSettings.timezone || 'Europe/Berlin'}
                    onChange={(e) => setUserSettings({ ...userSettings, timezone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <option value="Europe/Berlin">Europe/Berlin (Germany) - Default</option>
                    <option value="Europe/London">Europe/London (UK)</option>
                    <option value="Europe/Paris">Europe/Paris (France)</option>
                    <option value="Europe/Amsterdam">Europe/Amsterdam (Netherlands)</option>
                    <option value="Europe/Madrid">Europe/Madrid (Spain)</option>
                    <option value="Europe/Rome">Europe/Rome (Italy)</option>
                    <option value="America/New_York">America/New York (EST)</option>
                    <option value="America/Chicago">America/Chicago (CST)</option>
                    <option value="America/Denver">America/Denver (MST)</option>
                    <option value="America/Los_Angeles">America/Los Angeles (PST)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (Japan)</option>
                    <option value="Asia/Shanghai">Asia/Shanghai (China)</option>
                    <option value="Asia/Singapore">Asia/Singapore</option>
                    <option value="Australia/Sydney">Australia/Sydney</option>
                    <option value="UTC">UTC</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    All dates and times will be displayed in this timezone
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-500">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
              </div>
            </div>

            {/* Google Calendar Connection */}
            <div className="rounded-lg shadow-sm border p-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  Google Calendar
                  {isCalendarConnected && (
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">
                      Connected
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Connect your Google Calendar to link notes to meetings
                </p>
              </div>

              <div className="flex items-center gap-3">
                {!isCalendarConnected ? (
                  <button
                    onClick={async () => {
                      if (!user?.uid) return;
                      window.location.href = `/api/auth/google?userId=${user.uid}`;
                    }}
                    className="px-4 py-2 text-sm rounded-md flex items-center gap-2 text-white font-medium"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Calendar size={16} />
                    Connect Google Calendar
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        const res = await authenticatedFetch('/api/calendar/disconnect', {
                          method: 'POST',
                        });
                        
                        if (res.ok) {
                          setIsCalendarConnected(false);
                          setAlertDialog({
                            isOpen: true,
                            title: 'Disconnected',
                            message: 'Google Calendar has been disconnected. You can reconnect anytime to grant updated permissions.',
                            type: 'success',
                          });
                        }
                      } catch (error) {
                        setAlertDialog({
                          isOpen: true,
                          title: 'Error',
                          message: 'Failed to disconnect Google Calendar',
                          type: 'error',
                        });
                      }
                    }}
                    className="px-4 py-2 text-sm border-2 rounded-md flex items-center gap-2 font-medium transition-colors hover:bg-red-50"
                    style={{ borderColor: '#f30047', color: '#f30047' }}
                  >
                    <X size={16} />
                    Disconnect Calendar
                  </button>
                )}
              </div>

              {!isCalendarConnected && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <p className="font-medium mb-1">Permissions needed:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>View your calendar events</li>
                    <li>Create files in Google Drive (for note attachments)</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div className="rounded-lg shadow-sm border p-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                  Appearance Settings
                </h2>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  className="px-4 py-2 text-sm rounded-md transition-all flex items-center gap-2 font-medium disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: saveSuccess ? '#10b981' : (hasChanges ? 'var(--color-primary)' : 'var(--color-surface)'),
                    color: saveSuccess ? 'white' : (hasChanges ? 'white' : '#94a3b8'),
                    border: `1px solid ${saveSuccess ? '#10b981' : (hasChanges ? 'var(--color-primary)' : 'var(--color-border)')}`,
                    opacity: (!hasChanges && !saveSuccess) ? 0.6 : 1,
                  }}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: hasChanges ? 'white' : 'var(--color-primary)' }}></div>
                      Saving...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check size={16} />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save
                    </>
                  )}
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
                  Color Scheme
                </label>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {colorSchemes.map((scheme) => (
                    <button
                      key={scheme.id}
                      onClick={() => {
                        setUserSettings({ ...userSettings, colorScheme: scheme.id });
                        setScheme(scheme.id);
                      }}
                      className="relative p-5 border-2 rounded-lg transition-all hover:shadow-md text-left"
                      style={{
                        borderColor: userSettings.colorScheme === scheme.id ? scheme.primary : 'var(--color-border)',
                        backgroundColor: scheme.id === 'dark-mode' ? scheme.surface : (userSettings.colorScheme === scheme.id ? `${scheme.primary}08` : 'white'),
                        color: scheme.id === 'dark-mode' ? scheme.text : 'inherit',
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: scheme.primary }}
                        >
                          <div className="w-6 h-6 rounded-full opacity-90" style={{ backgroundColor: 'var(--color-surface)' }}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base mb-2" style={{ color: scheme.id === 'dark-mode' ? scheme.text : 'var(--color-text)' }}>
                            {scheme.name}
                          </p>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs">
                              <span style={{ color: scheme.textSecondary }} className="w-24">Background:</span>
                              <div className="flex items-center gap-1.5">
                                <div 
                                  className="w-4 h-4 rounded border" 
                                  style={{ backgroundColor: scheme.background, borderColor: scheme.border }}
                                ></div>
                                <span className="font-mono" style={{ color: scheme.textSecondary }}>{scheme.background}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span style={{ color: scheme.textSecondary }} className="w-24">Primary:</span>
                              <div className="flex items-center gap-1.5">
                                <div 
                                  className="w-4 h-4 rounded border" 
                                  style={{ backgroundColor: scheme.primary, borderColor: scheme.border }}
                                ></div>
                                <span className="font-mono" style={{ color: scheme.textSecondary }}>{scheme.primary}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span style={{ color: scheme.textSecondary }} className="w-24">Success:</span>
                              <div className="flex items-center gap-1.5">
                                <div 
                                  className="w-4 h-4 rounded border" 
                                  style={{ backgroundColor: scheme.success, borderColor: scheme.border }}
                                ></div>
                                <span className="font-mono" style={{ color: scheme.textSecondary }}>{scheme.success}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span style={{ color: scheme.textSecondary }} className="w-24">Warning:</span>
                              <div className="flex items-center gap-1.5">
                                <div 
                                  className="w-4 h-4 rounded border" 
                                  style={{ backgroundColor: scheme.warning, borderColor: scheme.border }}
                                ></div>
                                <span className="font-mono" style={{ color: scheme.textSecondary }}>{scheme.warning}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {userSettings.colorScheme === scheme.id && (
                          <div
                            className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: scheme.primary }}
                          >
                            <Check size={14} color="white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="rounded-lg shadow-sm border p-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                  Notification Settings
                </h2>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  className="px-4 py-2 text-sm rounded-md transition-all flex items-center gap-2 font-medium disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: saveSuccess ? '#10b981' : (hasChanges ? 'var(--color-primary)' : 'var(--color-surface)'),
                    color: saveSuccess ? 'white' : (hasChanges ? 'white' : '#94a3b8'),
                    border: `1px solid ${saveSuccess ? '#10b981' : (hasChanges ? 'var(--color-primary)' : 'var(--color-border)')}`,
                    opacity: (!hasChanges && !saveSuccess) ? 0.6 : 1,
                  }}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: hasChanges ? 'white' : 'var(--color-primary)' }}></div>
                      Saving...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check size={16} />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save
                    </>
                  )}
                </button>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userSettings.notifications?.email || false}
                    onChange={(e) => setUserSettings({
                      ...userSettings,
                      notifications: {
                        ...userSettings.notifications,
                        email: e.target.checked,
                      } as any,
                    })}
                    className="w-4 h-4 rounded"
                  />
                  <div>
                    <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                      Email Notifications
                    </p>
                    <p className="text-sm text-gray-500">
                      Receive email updates about tasks and comments
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userSettings.notifications?.desktop || false}
                    onChange={(e) => setUserSettings({
                      ...userSettings,
                      notifications: {
                        ...userSettings.notifications,
                        desktop: e.target.checked,
                      } as any,
                    })}
                    className="w-4 h-4 rounded"
                  />
                  <div>
                    <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                      Desktop Notifications
                    </p>
                    <p className="text-sm text-gray-500">
                      Show browser notifications for important updates
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        );

      case 'note-templates':
        return (
          <div className="space-y-6">
            <div className="rounded-lg shadow-sm border p-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                    Default Note Template
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Edit the default template used for meeting notes
                  </p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  className="px-4 py-2 text-sm rounded-md transition-all flex items-center gap-2 font-medium disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: saveSuccess ? '#10b981' : (hasChanges ? 'var(--color-primary)' : 'white'),
                    color: saveSuccess ? 'white' : (hasChanges ? 'white' : '#94a3b8'),
                    border: `1px solid ${saveSuccess ? '#10b981' : (hasChanges ? 'var(--color-primary)' : 'var(--color-border)')}`,
                    opacity: (!hasChanges && !saveSuccess) ? 0.6 : 1,
                  }}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: hasChanges ? 'white' : 'var(--color-primary)' }}></div>
                      Saving...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check size={16} />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Template
                    </>
                  )}
                </button>
              </div>

              <div className="text-sm text-gray-600 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <p className="font-medium text-blue-900 mb-2">Template Instructions</p>
                <p>Use the rich text editor to create your template. Include headers (H2) for sections and start bullet lists underneath.</p>
                <p className="mt-2">Example structure: Agenda, Discussion, Decisions, Action Items</p>
              </div>

              {/* Template Editor */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                  Template Content
                </label>
                <TipTapEditor
                  value={userSettings.noteTemplate || ''}
                  onChange={(value) => setUserSettings({ ...userSettings, noteTemplate: value })}
                  placeholder="Create your note template with headers and bullet points..."
                />
              </div>
            </div>
          </div>
        );

      case 'project-details':
        return (
          <div className="space-y-6">
            <div className="rounded-lg shadow-sm border p-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="mb-6">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                  Project Details
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Manage project information and settings
                </p>
              </div>

              <div className="space-y-6">
                {/* Project Name & Icon */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      style={{ borderColor: 'var(--color-border)' }}
                      placeholder="Enter project name"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This name will be displayed throughout the application
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                      Project Icon
                    </label>
                    <input
                      type="text"
                      value={projectIcon}
                      onChange={(e) => setProjectIcon(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-2xl text-center"
                      style={{ borderColor: 'var(--color-border)' }}
                      placeholder="📋"
                      maxLength={2}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter an emoji (e.g., 📋, 🚀, 💡)
                    </p>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={async () => {
                      if (!projectId || !(projectName?.trim())) return;
                      
                      setIsSaving(true);
                      setSaveSuccess(false);
                      try {
                        await authenticatedFetch(`/api/projects/${projectId}`, {
                          method: 'PUT',
                          body: JSON.stringify({ 
                            name: projectName,
                            icon: projectIcon || '📋'
                          }),
                        });
                        setSaveSuccess(true);
                        setTimeout(() => setSaveSuccess(false), 3000);
                        
                        // Refresh page to update project selector
                        setTimeout(() => {
                          window.location.reload();
                        }, 1500);
                      } catch (error) {
                        console.error('Failed to update project:', error);
                        setAlertDialog({
                          isOpen: true,
                          title: 'Error',
                          message: 'Failed to update project. Please try again.',
                          type: 'error',
                        });
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving || !(projectName?.trim())}
                    className="px-4 py-2 text-sm rounded-md transition-all flex items-center gap-2 font-medium disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: saveSuccess ? '#10b981' : 'var(--color-primary)',
                      color: 'white',
                      opacity: !(projectName?.trim()) ? 0.6 : 1,
                    }}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : saveSuccess ? (
                      <>
                        <Check size={16} />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>

                {/* Danger Zone */}
                <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <h3 className="text-sm font-semibold text-red-600 mb-2">
                    Danger Zone
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Deleting this project will permanently remove all tasks, settings, and data associated with it. This action cannot be undone.
                  </p>
                  <button
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        title: 'Delete Project',
                        message: `Are you sure you want to delete "${projectName}"?\n\nThis will permanently delete:\n• All tasks in this project\n• All project settings\n• All member assignments\n\nThis action cannot be undone.`,
                        type: 'danger',
                        onConfirm: async () => {
                          if (!projectId) return;
                          
                          try {
                            await authenticatedFetch(`/api/projects/${projectId}`, {
                              method: 'DELETE',
                            });
                            
                            setAlertDialog({
                              isOpen: true,
                              title: 'Project Deleted',
                              message: 'The project has been permanently deleted.',
                              type: 'success',
                            });
                            
                            // Redirect to home after 2 seconds
                            setTimeout(() => {
                              window.location.href = '/';
                            }, 2000);
                          } catch (error) {
                            console.error('Failed to delete project:', error);
                            setAlertDialog({
                              isOpen: true,
                              title: 'Error',
                              message: 'Failed to delete project. Please try again.',
                              type: 'error',
                            });
                          }
                        },
                      });
                    }}
                    className="px-4 py-2 text-sm border-2 rounded-md transition-colors flex items-center gap-2 font-medium"
                    style={{
                      borderColor: '#f30047',
                      color: '#f30047',
                      backgroundColor: 'white',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f30047';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.color = '#f30047';
                    }}
                  >
                    <Trash2 size={16} />
                    Delete Project
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'project-status':
        return (
          <div className="space-y-6">
            <div className="rounded-lg shadow-sm border p-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                    Status Options
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {projectName && `Configure workflow stages for ${projectName}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={addStatusOption}
                    className="px-3 py-2 text-sm rounded-md flex items-center gap-2 font-medium text-white"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Plus size={16} />
                    Add Status
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges}
                    className="px-4 py-2 text-sm rounded-md transition-all flex items-center gap-2 font-medium disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: saveSuccess ? '#10b981' : (hasChanges ? 'var(--color-primary)' : 'white'),
                      color: saveSuccess ? 'white' : (hasChanges ? 'white' : '#94a3b8'),
                      border: `1px solid ${saveSuccess ? '#10b981' : (hasChanges ? 'var(--color-primary)' : 'var(--color-border)')}`,
                      opacity: (!hasChanges && !saveSuccess) ? 0.6 : 1,
                    }}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: hasChanges ? 'white' : 'var(--color-primary)' }}></div>
                        Saving...
                      </>
                    ) : saveSuccess ? (
                      <>
                        <Check size={16} />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleStatusDragEnd}
              >
                <SortableContext
                  items={projectSettings.statusOptions.map(s => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {projectSettings.statusOptions.map((status) => (
                      <SortableStatusItem 
                        key={status.id} 
                        status={status}
                        onUpdate={updateStatusOption}
                        onDelete={deleteStatusOption}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Migration Dialog */}
              {showMigrationDialog && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 bg-white/30 backdrop-blur-sm z-[100]"
                    onClick={() => setShowMigrationDialog(false)}
                  />
                  
                  {/* Dialog */}
                  <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 pointer-events-none">
                    <div
                      className="rounded-lg w-full max-w-md p-6 shadow-xl pointer-events-auto"
                      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
                        Migrate Tasks
                      </h3>
                      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <Info size={18} className="inline text-yellow-600 mr-2" />
                        <span className="text-sm text-yellow-800">
                          <strong>{migrationTaskCount} task(s)</strong> are currently using this status. 
                          Please select a status to move them to before deletion.
                        </span>
                      </div>
                      <div className="mb-6">
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                          Move tasks to:
                        </label>
                        <select
                          value={migrationTargetId}
                          onChange={(e) => setMigrationTargetId(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          {projectSettings.statusOptions
                            .filter(opt => opt.id !== migrationSourceId)
                            .map(opt => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => setShowMigrationDialog(false)}
                          className="px-4 py-2 text-sm border rounded-md transition-colors"
                          style={{
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text)',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={confirmStatusMigration}
                          disabled={!migrationTargetId}
                          className="px-4 py-2 text-sm rounded-md transition-colors text-white disabled:opacity-50"
                          style={{ backgroundColor: 'var(--color-primary)' }}
                        >
                          Migrate & Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );

      case 'project-priority':
        return (
          <div className="space-y-6">
            <div className="rounded-lg shadow-sm border p-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                    Priority Options
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {projectName && `Configure priority levels for ${projectName}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={addPriorityOption}
                    className="px-3 py-2 text-sm rounded-md flex items-center gap-2 font-medium text-white"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Plus size={16} />
                    Add Priority
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges}
                    className="px-4 py-2 text-sm rounded-md transition-all flex items-center gap-2 font-medium disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: saveSuccess ? '#10b981' : (hasChanges ? 'var(--color-primary)' : 'white'),
                      color: saveSuccess ? 'white' : (hasChanges ? 'white' : '#94a3b8'),
                      border: `1px solid ${saveSuccess ? '#10b981' : (hasChanges ? 'var(--color-primary)' : 'var(--color-border)')}`,
                      opacity: (!hasChanges && !saveSuccess) ? 0.6 : 1,
                    }}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: hasChanges ? 'white' : 'var(--color-primary)' }}></div>
                        Saving...
                      </>
                    ) : saveSuccess ? (
                      <>
                        <Check size={16} />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handlePriorityDragEnd}
              >
                <SortableContext
                  items={projectSettings.priorityOptions.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {projectSettings.priorityOptions.map((priority) => (
                      <SortablePriorityItem 
                        key={priority.id} 
                        priority={priority}
                        onUpdate={updatePriorityOption}
                        onDelete={deletePriorityOption}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        );

      case 'project-members':
        return (
          <div className="space-y-6">
            <div className="rounded-lg shadow-sm border p-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="mb-6">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                  Project Members
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {projectName && `Manage access and permissions for ${projectName}`}
                </p>
              </div>

              {/* Add Member Form */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
                  Add New Member
                </h3>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      style={{ borderColor: 'var(--color-border)' }}
                      placeholder="email@example.com"
                    />
                  </div>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as ProjectRole)}
                    className="px-3 py-2 border rounded-md text-sm"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <option value="VIEW">View Only</option>
                    <option value="EDIT">Can Edit</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <button
                    onClick={addMember}
                    disabled={!newMemberEmail}
                    className="px-4 py-2 text-sm rounded-md flex items-center gap-2 font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
              </div>

              {/* Members List */}
              <div className="space-y-3">
                {projectMembers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No members yet. Add members to collaborate on this project.</p>
                ) : (
                  projectMembers.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center gap-4 p-4 border rounded-lg"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                      >
                        {member.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                          {member.displayName}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Mail size={12} />
                          {member.email}
                        </p>
                      </div>
                      <select
                        value={member.role}
                        onChange={(e) => updateMemberRole(member.userId, e.target.value as ProjectRole)}
                        className="px-3 py-2 border rounded-md text-sm"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <option value="VIEW">View Only</option>
                        <option value="EDIT">Can Edit</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      <button
                        onClick={() => removeMember(member.userId)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Remove member"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Role Explanations */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Shield size={16} />
                  Permission Levels
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li><strong>View Only:</strong> Can view tasks and comments</li>
                  <li><strong>Can Edit:</strong> Can create and edit tasks</li>
                  <li><strong>Admin:</strong> Full control including settings and member management</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'project-custom-fields':
        return (
          <div className="space-y-6">
            <div className="rounded-lg shadow-sm border p-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                    Custom Fields
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {projectName && `Add custom fields to tasks in ${projectName}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={addCustomField}
                    className="px-3 py-2 text-sm rounded-md flex items-center gap-2 font-medium text-white"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Plus size={16} />
                    Add Field
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges}
                    className="px-4 py-2 text-sm rounded-md transition-all flex items-center gap-2 font-medium disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: saveSuccess ? '#10b981' : (hasChanges ? 'var(--color-primary)' : 'white'),
                      color: saveSuccess ? 'white' : (hasChanges ? 'white' : '#94a3b8'),
                      border: `1px solid ${saveSuccess ? '#10b981' : (hasChanges ? 'var(--color-primary)' : 'var(--color-border)')}`,
                      opacity: (!hasChanges && !saveSuccess) ? 0.6 : 1,
                    }}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: hasChanges ? 'white' : 'var(--color-primary)' }}></div>
                        Saving...
                      </>
                    ) : saveSuccess ? (
                      <>
                        <Check size={16} />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                {projectSettings.customFields.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No custom fields yet. Add fields to collect additional information on tasks.
                  </p>
                ) : (
                  projectSettings.customFields.map((field) => (
                    <div
                      key={field.id}
                      className="p-4 border rounded-lg space-y-3"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical size={16} className="text-gray-400 cursor-move" />
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => updateCustomField(field.id, { name: e.target.value })}
                          className="flex-1 px-3 py-2 border rounded-md"
                          style={{ borderColor: 'var(--color-border)' }}
                          placeholder="Field name"
                        />
                        <select
                          value={field.type}
                          onChange={(e) => updateCustomField(field.id, { type: e.target.value as CustomField['type'] })}
                          className="px-3 py-2 border rounded-md"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="select">Select</option>
                        </select>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateCustomField(field.id, { required: e.target.checked })}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm text-gray-600">Required</span>
                        </label>
                        <button
                          onClick={() => deleteCustomField(field.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete field"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      {field.type === 'select' && (
                        <div className="ml-8">
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            Options (one per line or comma-separated)
                          </label>
                          <textarea
                            value={field.options?.join(', ') || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Split by comma or newline, trim, and filter empty
                              const options = value
                                .split(/[,\n]/)
                                .map(o => o.trim())
                                .filter(Boolean);
                              updateCustomField(field.id, { options });
                            }}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            style={{ borderColor: 'var(--color-border)' }}
                            placeholder="Option 1, Option 2, Option 3&#10;or one per line"
                            rows={3}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Separate options with commas or new lines
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <SettingsLayout activeSection={section as any}>
      {renderContent()}
      
      {/* Alert Dialog */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />
      
      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText="Delete"
        cancelText="Cancel"
      >
        {confirmDialog.children}
      </ConfirmDialog>
    </SettingsLayout>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-primary)' }}></div>
            <p style={{ color: 'var(--color-text)' }}>Loading settings...</p>
          </div>
        </div>
      }>
        <SettingsContent />
      </Suspense>
    </AuthGuard>
  );
}
