'use client';

import { useAuth } from '@/lib/auth-context';
import { LogOut, Settings, MessageSquare } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import FeedbackModal from './FeedbackModal';

export default function UserProfile() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      logger.error('Error signing out', error as Error, { uid: user?.uid });
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        style={{ color: 'var(--color-text)' }}
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium" style={{ background: 'var(--color-primary)' }}>
          {(user.displayName || 'U').charAt(0).toUpperCase()}
        </div>
        <span className="font-medium hidden sm:block">{user.displayName || 'User'}</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 bg-surface rounded-lg shadow-lg border overflow-hidden z-50"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: 'var(--color-primary)' }}>
                {(user.displayName || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                  {user.displayName}
                </p>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="py-2">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/settings');
              }}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
              style={{ color: 'var(--color-text)' }}
            >
              <Settings size={18} />
              <span>Settings</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                setShowFeedbackModal(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
              style={{ color: 'var(--color-text)' }}
            >
              <MessageSquare size={18} />
              <span>Share Feedback</span>
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-red-600"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={showFeedbackModal} 
        onClose={() => setShowFeedbackModal(false)} 
      />
    </div>
  );
}
