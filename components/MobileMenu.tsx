'use client';

import { Dispatch, SetStateAction } from 'react';
import Link from 'next/link';
import { X, Search, Settings, LayoutGrid, List, MessageSquare, LogOut, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { User, Project, Priority, TaskStatus, FilterOptions } from '@/types';
import ProjectSelector from '@/components/ProjectSelector';
import DailyStatsCard from '@/components/DailyStatsCard';
import { logger } from '@/lib/logger';

interface StatusOption {
  id: string;
  label: string;
  value: TaskStatus;
  color?: string;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: 'tasks' | 'notes';
  setCurrentView: Dispatch<SetStateAction<'tasks' | 'notes'>>;
  projects: Project[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  onCreateProject: () => void;
  completedToday: number;
  totalTasks: number;
  percentComplete: number;
  showSearchFilters: boolean;
  setShowSearchFilters: Dispatch<SetStateAction<boolean>>;
  filters: FilterOptions;
  setFilters: Dispatch<SetStateAction<FilterOptions>>;
  statusColumns: StatusOption[];
  owners: string[];
  viewModeCompact: 'normal' | 'compact';
  setViewModeCompact: Dispatch<SetStateAction<'normal' | 'compact'>>;
  showOwner: boolean;
  setShowOwner: Dispatch<SetStateAction<boolean>>;
  showPriority: boolean;
  setShowPriority: Dispatch<SetStateAction<boolean>>;
  showDueDate: boolean;
  setShowDueDate: Dispatch<SetStateAction<boolean>>;
  user: User | null;
  signOut: () => Promise<void>;
  setShowFeedbackModal: Dispatch<SetStateAction<boolean>>;
}

export default function MobileMenu({
  isOpen,
  onClose,
  currentView,
  setCurrentView,
  projects,
  selectedProjectId,
  setSelectedProjectId,
  onCreateProject,
  completedToday,
  totalTasks,
  percentComplete,
  showSearchFilters,
  setShowSearchFilters,
  filters,
  setFilters,
  statusColumns,
  owners,
  viewModeCompact,
  setViewModeCompact,
  showOwner,
  setShowOwner,
  showPriority,
  setShowPriority,
  showDueDate,
  setShowDueDate,
  user,
  signOut,
  setShowFeedbackModal,
}: MobileMenuProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div 
      className="md:hidden fixed inset-0 z-50 backdrop-blur-sm animate-fadeIn"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
      onClick={onClose}
    >
      <div 
        className="absolute right-0 top-0 h-full w-80 shadow-xl p-6 overflow-y-auto animate-slideInRight"
        style={{ backgroundColor: 'var(--color-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>
        
        {/* View Toggle - Tasks/Notes */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            View
          </label>
          <div className="inline-flex items-center bg-gray-100 rounded-full p-1 w-full">
            <button
              onClick={() => setCurrentView('tasks')}
              className="flex-1 px-3 py-2 text-sm rounded-full transition-all duration-200"
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
              className="flex-1 px-3 py-2 text-sm rounded-full transition-all duration-200"
              style={{ 
                backgroundColor: currentView === 'notes' ? 'var(--color-primary)' : 'transparent',
                color: currentView === 'notes' ? 'white' : 'var(--color-text-secondary))',
                fontWeight: currentView === 'notes' ? 600 : 400,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Notes
            </button>
          </div>
        </div>
        
        {/* Project Selector */}
        {currentView === 'tasks' && (
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Project
            </label>
            <ProjectSelector
              projects={projects}
              selectedProjectId={selectedProjectId}
              onChange={(id) => {
                setSelectedProjectId(id);
                onClose();
              }}
              onCreateProject={onCreateProject}
            />
          </div>
        )}
        
        {/* Daily Stats */}
        {currentView === 'tasks' && (
          <div className="mb-6">
            <DailyStatsCard 
              completedToday={completedToday}
              totalTasks={totalTasks}
              percentComplete={percentComplete}
            />
          </div>
        )}
        
        {/* Filters Section */}
        {currentView === 'tasks' && (
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              Search & Filters
            </label>
            
            {/* Toggle Search Visibility */}
            <div className="mb-4">
              <button
                onClick={() => {
                  setShowSearchFilters(!showSearchFilters);
                  onClose();
                }}
                className="w-full px-4 py-3 text-sm border rounded-md transition-all duration-200 flex items-center justify-between font-medium"
                style={{ 
                  borderColor: showSearchFilters ? 'var(--color-primary)' : 'var(--color-border)',
                  color: showSearchFilters ? 'var(--color-primary)' : 'var(--color-text)',
                  backgroundColor: showSearchFilters ? 'var(--color-surface-muted)' : 'var(--color-surface)'
                }}
              >
                <div className="flex items-center gap-2">
                  <Search size={16} />
                  <span>Show Search Bar</span>
                </div>
                <div 
                  className="w-10 h-6 rounded-full transition-all duration-200 flex items-center px-1"
                  style={{ 
                    backgroundColor: showSearchFilters ? 'var(--color-primary)' : '#cbd5e1'
                  }}
                >
                  <div 
                    className="w-4 h-4 bg-white rounded-full transition-all duration-200"
                    style={{ 
                      transform: showSearchFilters ? 'translateX(16px)' : 'translateX(0)'
                    }}
                  />
                </div>
              </button>
            </div>
            
            {/* Filter Controls */}
            <div className="space-y-3">
              {/* Deadline Filter */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Deadline
                </label>
                <select
                  value={filters.deadline || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilters({ 
                      ...filters, 
                      deadline: value ? (value as 'overdue' | 'today' | 'this-week' | 'this-month' | 'future') : undefined 
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                  }}
                >
                  <option value="">All</option>
                  <option value="overdue">Overdue</option>
                  <option value="today">Today</option>
                  <option value="this-week">This Week</option>
                  <option value="this-month">This Month</option>
                  <option value="future">Future</option>
                </select>
              </div>
              
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Status
                </label>
                <select
                  value={filters.status?.[0] || ''}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    status: e.target.value ? [e.target.value as TaskStatus] : undefined 
                  })}
                  className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                  }}
                >
                  <option value="">All</option>
                  {statusColumns.map(option => (
                    <option key={option.id} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Priority Filter */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Priority
                </label>
                <select
                  value={filters.priority?.[0] || ''}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    priority: e.target.value ? [e.target.value as Priority] : undefined 
                  })}
                  className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                  }}
                >
                  <option value="">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              
              {/* Owner Filter */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Owner
                </label>
                <select
                  value={filters.owner?.[0] || ''}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    owner: e.target.value ? [e.target.value] : undefined 
                  })}
                  className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                  }}
                >
                  <option value="">All</option>
                  {owners.map(owner => (
                    <option key={owner} value={owner}>{owner}</option>
                  ))}
                </select>
              </div>
              
              {/* Clear Filters Button */}
              {(filters.deadline || filters.status || filters.priority || filters.owner) && (
                <button
                  onClick={() => setFilters({})}
                  className="w-full px-4 py-2 text-sm border rounded-md transition-all duration-200 font-medium"
                  style={{ 
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    backgroundColor: 'var(--color-surface)'
                  }}
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* View Mode Section */}
        {currentView === 'tasks' && (
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              View Mode
            </label>
            <div className="flex gap-2 p-1 border rounded-md" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
              <button
                onClick={() => setViewModeCompact('normal')}
                className="flex-1 px-4 py-2 rounded text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: viewModeCompact === 'normal' ? 'var(--color-primary)' : 'transparent',
                  color: viewModeCompact === 'normal' ? 'white' : 'var(--color-text-secondary)',
                }}
              >
                <LayoutGrid size={16} />
                <span>Normal</span>
              </button>
              <button
                onClick={() => setViewModeCompact('compact')}
                className="flex-1 px-4 py-2 rounded text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: viewModeCompact === 'compact' ? 'var(--color-primary)' : 'transparent',
                  color: viewModeCompact === 'compact' ? 'white' : 'var(--color-text-secondary)',
                }}
              >
                <List size={16} />
                <span>Compact</span>
              </button>
            </div>
          </div>
        )}
        
        {/* Display Options Section */}
        {currentView === 'tasks' && (
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              Display Options
            </label>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-gray-50 transition-colors" style={{ backgroundColor: 'var(--color-surface)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Show Owner</span>
                <div 
                  className="w-10 h-6 rounded-full transition-all duration-200 flex items-center px-1"
                  style={{ 
                    backgroundColor: showOwner ? 'var(--color-primary)' : '#cbd5e1'
                  }}
                  onClick={() => setShowOwner(!showOwner)}
                >
                  <div 
                    className="w-4 h-4 bg-white rounded-full transition-all duration-200"
                    style={{ 
                      transform: showOwner ? 'translateX(16px)' : 'translateX(0)'
                    }}
                  />
                </div>
              </label>
              
              <label className="flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-gray-50 transition-colors" style={{ backgroundColor: 'var(--color-surface)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Show Priority</span>
                <div 
                  className="w-10 h-6 rounded-full transition-all duration-200 flex items-center px-1"
                  style={{ 
                    backgroundColor: showPriority ? 'var(--color-primary)' : '#cbd5e1'
                  }}
                  onClick={() => setShowPriority(!showPriority)}
                >
                  <div 
                    className="w-4 h-4 bg-white rounded-full transition-all duration-200"
                    style={{ 
                      transform: showPriority ? 'translateX(16px)' : 'translateX(0)'
                    }}
                  />
                </div>
              </label>
              
              <label className="flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-gray-50 transition-colors" style={{ backgroundColor: 'var(--color-surface)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Show Due Date</span>
                <div 
                  className="w-10 h-6 rounded-full transition-all duration-200 flex items-center px-1"
                  style={{ 
                    backgroundColor: showDueDate ? 'var(--color-primary)' : '#cbd5e1'
                  }}
                  onClick={() => setShowDueDate(!showDueDate)}
                >
                  <div 
                    className="w-4 h-4 bg-white rounded-full transition-all duration-200"
                    style={{ 
                      transform: showDueDate ? 'translateX(16px)' : 'translateX(0)'
                    }}
                  />
                </div>
              </label>
            </div>
          </div>
        )}
        
        {/* User Profile Section */}
        <div className="pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
          {/* User Info */}
          {user && (
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm" style={{ background: 'var(--color-primary)' }}>
                  {(user.displayName || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                    {user.displayName}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Profile Actions */}
          <div className="space-y-2">
            <Link
              href="/quick"
              onClick={onClose}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors"
              style={{ 
                backgroundColor: 'var(--color-primary)',
                color: 'white'
              }}
            >
              <Zap size={18} />
              <span className="text-sm font-medium">Quick Task</span>
            </Link>
            
            <Link
              href="/settings"
              onClick={onClose}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-md hover:bg-gray-50 transition-colors"
              style={{ color: 'var(--color-text)' }}
            >
              <Settings size={18} />
              <span className="text-sm font-medium">Settings</span>
            </Link>
            
            <button
              onClick={() => {
                onClose();
                setShowFeedbackModal(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-md hover:bg-gray-50 transition-colors"
              style={{ color: 'var(--color-text)' }}
            >
              <MessageSquare size={18} />
              <span className="text-sm font-medium">Share Feedback</span>
            </button>
            
            <button
              onClick={async () => {
                try {
                  await signOut();
                  router.push('/login');
                } catch (error) {
                  logger.error('Error signing out', error as Error, { uid: user?.uid });
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-md hover:bg-red-50 transition-colors text-red-600"
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
