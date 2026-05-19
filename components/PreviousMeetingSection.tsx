/**
 * PreviousMeetingSection Component
 * Displays up to 5 previous instances of a recurring meeting,
 * each as an independently expandable row.
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Calendar, User, CalendarDays } from 'lucide-react';
import { Note, NoteTask } from '@/types';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

interface PreviousMeetingSectionProps {
  previousNotes: Note[];
  userTimezone?: string;
}

function formatNoteDate(note: Note, userTimezone: string): string {
  const rawDate = note.recurringInstanceDate || note.createdAt;
  return format(toZonedTime(new Date(rawDate), userTimezone), 'dd.MM.yyyy, HH:mm');
}

interface NoteRowProps {
  note: Note;
  userTimezone: string;
  isExpanded: boolean;
  onToggle: () => void;
  isLast: boolean;
}

function NoteRow({ note, userTimezone, isExpanded, onToggle, isLast }: NoteRowProps) {
  const hasTasks = note.tasks && note.tasks.length > 0;

  // Parse agenda: stored as JSON array or legacy HTML
  let agendaItems: string[] = [];
  if (note.agenda && note.agenda.trim() !== '') {
    try {
      const parsed = JSON.parse(note.agenda);
      agendaItems = Array.isArray(parsed) ? parsed.filter((i: string) => i.trim() !== '') : [];
    } catch {
      agendaItems = note.agenda.split('\n').filter(l => l.trim() !== '');
    }
  }
  const hasAgenda = agendaItems.length > 0;

  const hasContent =
    note.content &&
    typeof note.content === 'string' &&
    note.content.trim() !== '' &&
    note.content !== '<p></p>';

  return (
    <div className={!isLast ? 'border-b' : ''} style={{ borderColor: 'var(--color-border)' }}>
      {/* Row header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown size={18} className="text-gray-500 flex-shrink-0" />
          ) : (
            <ChevronRight size={18} className="text-gray-500 flex-shrink-0" />
          )}
          <Calendar size={16} className="text-blue-500 flex-shrink-0" />
          <p className="text-xs text-gray-600 flex items-center gap-1">
            <CalendarDays size={11} />
            {formatNoteDate(note, userTimezone)}
          </p>
        </div>
        {hasTasks && (
          <span className="text-xs text-gray-500 font-medium flex-shrink-0">
            {note.tasks.length} task{note.tasks.length !== 1 ? 's' : ''}
          </span>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-6 pb-5 space-y-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          {/* Agenda */}
          {hasAgenda && (
            <div className="pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Agenda
              </h4>
              <div className="bg-white rounded-lg border px-4 py-3 space-y-1.5" style={{ borderColor: '#e2e8f0' }}>
                {agendaItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-gray-400 mt-1 flex-shrink-0" style={{ fontSize: '0.55rem' }}>●</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {hasContent && (
            <div className={hasAgenda ? '' : 'pt-4'}>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Notes
              </h4>
              <div
                className="bg-white rounded-lg p-4 border previous-note-content"
                style={{ borderColor: '#e2e8f0', fontSize: '0.875rem', lineHeight: '1.5' }}
              >
                <div dangerouslySetInnerHTML={{ __html: note.content }} />
              </div>
              <style jsx>{`
                .previous-note-content :global(p) { margin: 0.5rem 0; color: #374151; }
                .previous-note-content :global(p:first-child) { margin-top: 0; }
                .previous-note-content :global(p:last-child) { margin-bottom: 0; }
                .previous-note-content :global(strong) { font-weight: 600; color: #1f2937; }
                .previous-note-content :global(em) { font-style: italic; }
                .previous-note-content :global(u) { text-decoration: underline; }
                .previous-note-content :global(a) { color: #3b82f6; text-decoration: underline; }
                .previous-note-content :global(h1) { font-size: 1.5rem; font-weight: 600; margin: 1rem 0 0.5rem; color: #111827; }
                .previous-note-content :global(h2) { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; color: #111827; }
                .previous-note-content :global(h3) { font-size: 1.1rem; font-weight: 600; margin: 1rem 0 0.5rem; color: #111827; }
                .previous-note-content :global(ul),
                .previous-note-content :global(ol) { padding-left: 1.5rem; margin: 0.5rem 0; color: #374151; }
                .previous-note-content :global(ul) { list-style-type: disc; }
                .previous-note-content :global(ol) { list-style-type: decimal; }
                .previous-note-content :global(li) { margin: 0.25rem 0; }
                .previous-note-content :global(ul[data-type="taskList"]) { list-style: none; padding-left: 0; }
                .previous-note-content :global(ul[data-type="taskList"] li) { display: flex; align-items: flex-start; gap: 0.5rem; }
                .previous-note-content :global(ul[data-type="taskList"] input[type="checkbox"]) { margin-top: 0.25rem; }
                .previous-note-content :global(pre) { background: #f1f5f9; padding: 0.75rem; border-radius: 0.375rem; font-family: 'Courier New', monospace; font-size: 0.875rem; overflow-x: auto; margin: 0.75rem 0; border: 1px solid #e2e8f0; }
                .previous-note-content :global(code) { background: #f1f5f9; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-family: 'Courier New', monospace; font-size: 0.875rem; color: #1e293b; }
                .previous-note-content :global(pre code) { background: transparent; padding: 0; }
                .previous-note-content :global(hr) { border: none; border-top: 2px solid #e2e8f0; margin: 1.5rem 0; }
                .previous-note-content :global(img) { max-width: 100%; height: auto; border-radius: 0.375rem; margin: 0.5rem 0; }
                .previous-note-content :global(.mention) { background: #dbeafe; color: #1e40af; padding: 0.1rem 0.3rem; border-radius: 0.25rem; font-weight: 500; }
              `}</style>
            </div>
          )}

          {hasTasks && (
            <div className={(hasAgenda || hasContent) ? '' : 'pt-4'}>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Tasks
              </h4>
              <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ backgroundColor: '#fafafa', borderColor: '#e2e8f0' }}>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600" style={{ width: '50%' }}>Task</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600" style={{ width: '25%' }}>Owner</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600" style={{ width: '25%' }}>Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {note.tasks.map((task: NoteTask, index: number) => (
                      <tr
                        key={task.id || index}
                        className="border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                        style={{ borderColor: '#f1f5f9' }}
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-start gap-2">
                            {task.createdTaskId && (
                              <span className="text-green-600 text-xs" title="Task created">✓</span>
                            )}
                            <span className="text-gray-800">{task.title || 'Untitled task'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {task.owner && (
                            <div className="flex items-center gap-1.5 text-gray-700">
                              <User size={12} className="text-gray-400" />
                              <span className="text-xs">{task.owner}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-600">
                          {task.deadline ? format(new Date(task.deadline), 'dd.MM.yyyy') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!hasAgenda && !hasContent && !hasTasks && (
            <p className="text-sm text-gray-500 text-center py-4">
              No content or tasks in this meeting
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PreviousMeetingSection({
  previousNotes,
  userTimezone = DEFAULT_TIMEZONE,
}: PreviousMeetingSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (previousNotes.length === 0) return null;

  const toggle = (id: string) => setExpandedId(prev => (prev === id ? null : id));

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: '#f8fafc', borderColor: 'var(--color-border)' }}
    >
      {/* Section label */}
      <div className="px-6 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Previous Meetings{previousNotes.length > 1 ? ` (${previousNotes.length})` : ''}
        </span>
      </div>

      {previousNotes.map((note, index) => (
        <NoteRow
          key={note.id}
          note={note}
          userTimezone={userTimezone}
          isExpanded={expandedId === note.id}
          onToggle={() => toggle(note.id)}
          isLast={index === previousNotes.length - 1}
        />
      ))}
    </div>
  );
}
