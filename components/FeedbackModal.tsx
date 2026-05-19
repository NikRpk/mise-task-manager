/**
 * Feedback Modal Component
 * Allows users to submit feedback, ideas, or bug reports via Slack.
 * Feedback is posted to #mise-task-management-tool.
 */

'use client';

import { useState } from 'react';
import { X, Send, CheckCircle, Hash } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { authenticatedFetch } from '@/lib/api-client';
import { logger } from '@/lib/logger';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = 'idea' | 'bug' | 'other';

const SLACK_CHANNEL_NAME = 'mise-task-management-tool';
const SLACK_CHANNEL_URL = `https://hellofresh.slack.com/channels/${SLACK_CHANNEL_NAME}`;

function SlackChannelBadge() {
  return (
    <a
      href={SLACK_CHANNEL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors hover:opacity-80"
      style={{
        backgroundColor: '#f0fdf4',
        color: '#166534',
        border: '1px solid #bbf7d0',
      }}
    >
      <Hash size={12} strokeWidth={2.5} />
      {SLACK_CHANNEL_NAME}
    </a>
  );
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user } = useAuth();
  const [type, setType] = useState<FeedbackType>('idea');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const resetForm = () => {
    setMessage('');
    setType('idea');
    setSubmitStatus('idle');
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const payload = {
        tool: 'Mise - Task and Notes',
        type: type.charAt(0).toUpperCase() + type.slice(1),
        message: message.trim(),
        user: user?.email || 'unknown@example.com',
      };

      const response = await authenticatedFetch('/api/feedback', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSubmitStatus('success');
      } else {
        const data = await response.json().catch(() => ({}));
        setErrorMessage(data.error || 'Failed to submit feedback. Please try again.');
        setSubmitStatus('error');
      }
    } catch (error) {
      logger.error('Error submitting feedback', error as Error);
      setErrorMessage('Could not reach the server. Check your connection and try again.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
        }}
        onClick={handleClose}
      />

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
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--color-text)' }}
          >
            <X size={20} />
          </button>
        </div>

        {submitStatus === 'success' ? (
          /* Success screen */
          <div className="p-8 flex flex-col items-center text-center gap-5">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-50">
              <CheckCircle size={32} className="text-green-600" />
            </div>

            <div className="space-y-1.5">
              <p className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                Thanks for the feedback!
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Your message has been posted to Slack. Join the channel to follow the conversation.
              </p>
            </div>

            <SlackChannelBadge />

            <div className="flex gap-3 w-full pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border rounded-lg font-medium transition-colors hover:bg-gray-50"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-2 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-colors"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Send size={15} />
                Submit Another
              </button>
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              {/* Slack channel destination */}
              <div
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
              >
                <span style={{ color: 'var(--color-text-secondary)' }}>Posts to</span>
                <SlackChannelBadge />
              </div>

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
                    backgroundColor: 'var(--color-surface)',
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
                    backgroundColor: 'var(--color-surface)',
                  }}
                  required
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Sent as {user?.email ?? 'you'}.
                </p>
              </div>

              {submitStatus === 'error' && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-800 font-medium">
                    ✗ {errorMessage || 'Failed to submit feedback. Please try again.'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border rounded-lg font-medium transition-colors hover:bg-gray-50"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
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
        )}
      </div>
    </div>
  );
}
