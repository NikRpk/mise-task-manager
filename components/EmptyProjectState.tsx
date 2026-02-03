'use client';

import { FolderPlus } from 'lucide-react';

interface EmptyProjectStateProps {
  onCreateProject: () => void;
}

export default function EmptyProjectState({ onCreateProject }: EmptyProjectStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'var(--color-surface)' }}>
          <FolderPlus size={48} style={{ color: 'var(--color-primary)' }} />
        </div>
        
        <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
          No Projects Yet
        </h2>
        
        <p className="text-gray-600 mb-6">
          Get started by creating your first project. Projects help you organize tasks and collaborate with your team.
        </p>
        
        <button
          onClick={onCreateProject}
          className="px-6 py-3 rounded-lg font-medium transition-colors text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          Create Your First Project
        </button>
      </div>
    </div>
  );
}
