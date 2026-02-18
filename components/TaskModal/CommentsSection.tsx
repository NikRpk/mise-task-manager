/**
 * Comments Section Component
 * Manages task comments with add, edit, and delete functionality
 */

'use client';

import { useState } from 'react';
import { Send, Edit2, Check, Trash2 } from 'lucide-react';
import { Comment } from '@/types';

interface CommentsSectionProps {
  comments: Comment[];
  newComment: string;
  onNewCommentChange: (value: string) => void;
  onAddComment: () => void;
  onEditComment: (id: string, text: string) => void;
  onDeleteComment: (id: string) => void;
}

export function CommentsSection({
  comments,
  newComment,
  onNewCommentChange,
  onAddComment,
  onEditComment,
  onDeleteComment,
}: CommentsSectionProps) {
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  const startEdit = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
  };

  const saveEdit = () => {
    if (editingCommentId && editingCommentText.trim()) {
      onEditComment(editingCommentId, editingCommentText);
      setEditingCommentId(null);
      setEditingCommentText('');
    }
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onAddComment();
    }
  };

  return (
    <div className="pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
      <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#0f172a', letterSpacing: '0.5px' }}>
        Comments
      </label>
      
      {/* Existing Comments */}
      <div className="space-y-3 mb-3 max-h-60 overflow-y-auto">
        {comments && comments.length > 0 ? (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: '#f8fafc',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {comment.author}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {new Date(comment.createdAt).toLocaleString('de-DE', {
                      timeZone: 'Europe/Berlin',
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
                <div className="flex gap-2">
                  {editingCommentId !== comment.id && (
                    <button
                      type="button"
                      onClick={() => startEdit(comment)}
                      className="transition-colors"
                      style={{ color: 'var(--color-primary)' }}
                      title="Edit comment"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDeleteComment(comment.id)}
                    className="transition-colors"
                    style={{ color: '#f30047' }}
                    title="Delete comment"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {editingCommentId === comment.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editingCommentText}
                    onChange={(e) => setEditingCommentText(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm resize-none"
                    style={{
                      borderColor: 'var(--color-border)',
                    }}
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-3 py-1 text-sm rounded-md border"
                      style={{
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="px-3 py-1 text-sm rounded-md flex items-center gap-1"
                      style={{
                        backgroundColor: 'var(--color-primary)',
                        color: '#ffffff',
                      }}
                    >
                      <Check size={14} />
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {comment.text}
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>
            No comments yet
          </p>
        )}
      </div>

      {/* Add New Comment */}
      <div className="flex gap-2">
        <textarea
          value={newComment}
          onChange={(e) => onNewCommentChange(e.target.value)}
          onKeyDown={handleKeyPress}
          className="flex-1 px-3 py-2 border rounded-md text-sm resize-none"
          style={{
            borderColor: 'var(--color-border)',
          }}
          placeholder="Add a comment... (Ctrl/Cmd + Enter to post)"
          rows={2}
        />
        <button
          type="button"
          onClick={onAddComment}
          className="px-4 py-2 rounded-md transition-colors flex items-center gap-2"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
          }}
          disabled={!newComment.trim()}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
