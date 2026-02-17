'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { authenticatedFetch } from '@/lib/api-client';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function QuickTaskPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [defaultProjectId, setDefaultProjectId] = useState<string>('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/quick');
    }
  }, [user, authLoading, router]);

  // Fetch default project
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;
      
      try {
        const res = await authenticatedFetch('/api/projects');
        const projects = await res.json();
        
        // Use first project or personal project
        const personalProject = projects.find((p: { name: string }) => 
          p.name.toLowerCase().includes('personal')
        );
        setDefaultProjectId(personalProject?.id || projects[0]?.id || '');
      } catch (err) {
        console.error('Failed to fetch projects', err);
      }
    };

    fetchProjects();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !defaultProjectId) return;
    
    setCreating(true);
    setError('');
    
    try {
      await authenticatedFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: '',
          status: 'todo',
          priority: 'medium',
          owner: user?.email || '',
          projectId: defaultProjectId,
          tags: [],
          links: [],
          subTasks: [],
          deadline: deadline ? new Date(deadline).toISOString() : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
      
      setSuccess(true);
      setTitle('');
      setDeadline('');
      
      // Show success for 1 second, then reset
      setTimeout(() => {
        setSuccess(false);
      }, 1500);
      
    } catch (err) {
      setError('Failed to create task. Please try again.');
      console.error('Error creating task:', err);
    } finally {
      setCreating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
          Quick Add Task
        </h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Task Title Input */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full px-4 py-4 text-lg border rounded-lg focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: '#ffffff',
                  color: 'var(--color-text)',
                }}
                autoFocus
                disabled={creating}
              />
            </div>

            {/* Deadline Input */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Due Date (Optional)
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: '#ffffff',
                  color: 'var(--color-text)',
                }}
                disabled={creating}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-3 rounded-lg flex items-center gap-2 text-green-600" style={{ backgroundColor: '#f0fdf4' }}>
                <CheckCircle size={20} />
                <span className="font-medium">Task created!</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!title.trim() || creating || !defaultProjectId}
              className="w-full py-4 px-6 rounded-lg text-white text-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {creating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Creating...
                </>
              ) : (
                'Add Task'
              )}
            </button>

            {/* Additional Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 py-2 px-4 rounded-lg border text-sm"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                View All Tasks
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitle('');
                  setDeadline('');
                  setError('');
                }}
                disabled={!title && !deadline}
                className="flex-1 py-2 px-4 rounded-lg border text-sm disabled:opacity-50"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Clear
              </button>
            </div>
          </form>

          {/* Info Text */}
          <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Tasks are added to your Personal project with medium priority
          </p>
        </div>
      </div>
    </div>
  );
}
