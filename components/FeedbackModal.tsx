/**
 * Feedback Modal Component
 * Allows users to submit feedback, ideas, or bug reports via Slack
 */

'use client';

import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = 'idea' | 'bug' | 'other';

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user } = useAuth();
  const [type, setType] = useState<FeedbackType>('idea');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const payload = {
        tool: 'Mise - Task and Notes',
        type: type.charAt(0).toUpperCase() + type.slice(1), // Capitalize first letter
        message: message.trim(),
        user: user?.email || 'unknown@example.com',
      };

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSubmitStatus('success');
        // Reset form after short delay
        setTimeout(() => {
          setMessage('');
          setType('idea');
          setSubmitStatus('idle');
          onClose();
        }, 1500);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop with blur - using inline style for better browser support */}
      <div 
        className="absolute inset-0"
        style={{
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
        }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-md mx-4 rounded-xl shadow-2xl"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
            Share Feedback
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--color-text)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Type Dropdown */}
            <div>
              <label 
                htmlFor="feedback-type" 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text)' }}
              >
                What would you like to share?
              </label>
              <select
                id="feedback-type"
                value={type}
                onChange={(e) => setType(e.target.value as FeedbackType)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{ 
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                  backgroundColor: 'var(--color-surface)'
                }}
              >
                <option value="idea">💡 Idea or Feature Request</option>
                <option value="bug">🐛 Bug Report</option>
                <option value="other">💬 Other Feedback</option>
              </select>
            </div>

            {/* Message Textarea */}
            <div>
              <label 
                htmlFor="feedback-message" 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text)' }}
              >
                Your feedback
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share your thoughts, ideas, or report an issue..."
                rows={5}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none"
                style={{ 
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                  backgroundColor: 'var(--color-surface)'
                }}
                required
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Your feedback helps us improve the tool for everyone.
              </p>
            </div>

            {/* Status Messages */}
            {submitStatus === 'success' && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                <p className="text-sm text-green-800 font-medium">
                  ✓ Thank you! Your feedback has been submitted.
                </p>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-800 font-medium">
                  ✗ Failed to submit feedback. Please try again.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg font-medium transition-colors hover:bg-gray-50"
              style={{ 
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="flex-1 px-4 py-2 rounded-lg font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Submit Feedback
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
