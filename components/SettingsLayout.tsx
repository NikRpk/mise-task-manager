import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Palette, Bell, Sliders, Users, Settings as SettingsIcon, FileText } from 'lucide-react';
import Link from 'next/link';
import { Project } from '@/types';
import { authenticatedFetch } from '@/lib/api-client';
import { logger } from '@/lib/logger';

interface SettingsLayoutProps {
  children: React.ReactNode;
  activeSection: 'profile' | 'appearance' | 'notifications' | 'note-templates' | 'project-details' | 'project-status' | 'project-priority' | 'project-topics' | 'project-custom-fields' | 'project-members';
}

export default function SettingsLayout({ children, activeSection }: SettingsLayoutProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const res = await authenticatedFetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id);
        }
      } else {
        logger.error('Failed to fetch projects for settings', undefined, {
          status: res.status,
          statusText: res.statusText,
        });
      }
    } catch (error) {
      logger.error('Failed to fetch projects', error as Error);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSectionClick = (section: string) => {
    if (section.startsWith('project-')) {
      router.push(`/settings?section=${section}&projectId=${selectedProjectId}`);
    } else {
      router.push(`/settings?section=${section}`);
    }
  };

  const isProjectSection = activeSection.startsWith('project-');

  const generalSections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'note-templates', label: 'Note Templates', icon: FileText },
  ];

  const projectSections = [
    { id: 'project-details', label: 'Project Details', icon: SettingsIcon },
    { id: 'project-status', label: 'Status Options', icon: Sliders },
    { id: 'project-priority', label: 'Priority Options', icon: Sliders },
    { id: 'project-topics', label: 'Topic Options', icon: Sliders },
    { id: 'project-custom-fields', label: 'Custom Fields', icon: Sliders },
    { id: 'project-members', label: 'Members', icon: Users },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <header className="shadow-sm border-b" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back</span>
              </Link>
              <div className="border-l pl-4" style={{ borderColor: 'var(--color-border)' }}>
                <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                  Settings
                </h1>
                <p className="text-sm text-gray-500">Manage your preferences and project configurations</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-surface rounded-lg shadow-sm border sticky top-6" style={{ borderColor: 'var(--color-border)' }}>
              {/* General Settings */}
              <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                  General Settings
                </h3>
                <nav className="space-y-1">
                  {generalSections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => handleSectionClick(section.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left"
                        style={{
                          backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                          color: isActive ? 'white' : 'var(--color-text)',
                        }}
                      >
                        <Icon size={16} />
                        <span>{section.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Project Settings */}
              <div className="p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                  Project Settings
                </h3>
                
                {/* Project Selector */}
                {projects.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Select Project
                    </label>
                    <select
                      value={selectedProjectId || ''}
                      onChange={(e) => {
                        setSelectedProjectId(e.target.value);
                        if (isProjectSection) {
                          router.push(`/settings?section=${activeSection}&projectId=${e.target.value}`);
                        }
                      }}
                      className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2"
                      style={{ 
                        borderColor: 'var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                      }}
                      onFocus={(e) => {
                        e.target.style.boxShadow = '0 0 0 2px var(--color-primary)';
                      }}
                      onBlur={(e) => {
                        e.target.style.boxShadow = '';
                      }}
                    >
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.icon} {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <nav className="space-y-1">
                  {projectSections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => handleSectionClick(section.id)}
                        disabled={!selectedProjectId}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                          color: isActive ? 'white' : 'var(--color-text)',
                        }}
                      >
                        <Icon size={16} />
                        <span>{section.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
