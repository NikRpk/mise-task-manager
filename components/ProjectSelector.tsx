'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Project } from '@/types';
import { DEFAULT_PROJECT_ICON } from '@/lib/constants';

interface ProjectSelectorProps {
  projects: Project[];
  selectedProjectId: string | null;
  onChange: (projectId: string | null) => void;
  onCreateProject?: () => void;
}

export default function ProjectSelector({ projects, selectedProjectId, onChange, onCreateProject }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (projectId: string) => {
    onChange(projectId);
    setIsOpen(false);
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const displayText = selectedProject 
    ? `${selectedProject.icon || DEFAULT_PROJECT_ICON} ${selectedProject.name}` 
    : 'Select Project';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 bg-surface border rounded-md shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-colors text-sm"
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)',
        }}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown size={14} className="flex-shrink-0" />
      </button>
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 bg-surface border rounded-md shadow-lg z-50 min-w-[250px]"
          style={{
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="max-h-80 overflow-y-auto">
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => handleSelect(project.id)}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors w-full text-left"
                style={{
                  backgroundColor: selectedProjectId === project.id ? '#f0f9ff' : 'transparent',
                }}
              >
                <span className="text-xl">{project.icon || DEFAULT_PROJECT_ICON}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                    {project.name}
                  </p>
                  {project.description && (
                    <p className="text-xs text-gray-500 truncate">{project.description}</p>
                  )}
                </div>
                {selectedProjectId === project.id && (
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }}></div>
                )}
              </button>
            ))}
          </div>
          {onCreateProject && (
            <div className="p-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onCreateProject();
                }}
                className="text-sm w-full text-left px-3 py-2 rounded hover:bg-gray-50 transition-colors font-medium"
                style={{ color: 'var(--color-primary)' }}
              >
                + New Project
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
