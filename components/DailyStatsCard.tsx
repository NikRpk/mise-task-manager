'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface DailyStatsCardProps {
  completedToday: number;
  totalTasks: number;
  percentComplete: number;
}

export default function DailyStatsCard({ completedToday, totalTasks, percentComplete }: DailyStatsCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [prevCount, setPrevCount] = useState(completedToday);

  // Trigger animation when count increases
  useEffect(() => {
    if (completedToday > prevCount) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 600);
      setPrevCount(completedToday);
      return () => clearTimeout(timer);
    }
    setPrevCount(completedToday);
  }, [completedToday, prevCount]);

  return (
    <div 
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md transition-all duration-200"
      style={{ 
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text)',
      }}
      title={`${completedToday} ${completedToday === 1 ? 'task' : 'tasks'} completed today (${percentComplete}% of ${totalTasks})`}
    >
      <CheckCircle2 
        size={16} 
        style={{ color: 'var(--color-success)' }}
        className={isAnimating ? 'animate-pulse' : ''}
      />
      <span className="font-medium">{completedToday}</span>
      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>today</span>
    </div>
  );
}
