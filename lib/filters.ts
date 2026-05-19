import { Task, FilterOptions } from '@/types';

export function filterTasks(tasks: Task[], filters: FilterOptions): Task[] {
  return tasks.filter(task => {
    // Deadline filter
    if (filters.deadline && task.deadline) {
      const deadline = new Date(task.deadline);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const monthFromNow = new Date(today);
      monthFromNow.setMonth(monthFromNow.getMonth() + 1);

      switch (filters.deadline) {
        case 'overdue':
          if (deadline >= now || task.status === 'done') return false;
          break;
        case 'today':
          // Include overdue tasks (not done) + tasks due today
          if (task.status !== 'done' && deadline < today) break;
          if (deadline < today || deadline >= tomorrow) return false;
          break;
        case 'this-week':
          // Include overdue tasks (not done) + tasks due within the week
          if (task.status !== 'done' && deadline < today) break;
          if (deadline < today || deadline >= weekFromNow) return false;
          break;
        case 'this-month':
          // Include overdue tasks (not done) + tasks due within the month
          if (task.status !== 'done' && deadline < today) break;
          if (deadline < today || deadline >= monthFromNow) return false;
          break;
        case 'future':
          if (deadline < now) return false;
          break;
      }
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(task.status)) return false;
    }

    // Owner filter
    if (filters.owner && filters.owner.length > 0) {
      if (!filters.owner.includes(task.owner)) return false;
    }

    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      if (!filters.priority.includes(task.priority)) return false;
    }

    // Topic filter
    if (filters.topic && filters.topic.length > 0) {
      if (!task.topicId || !filters.topic.includes(task.topicId)) return false;
    }

    return true;
  });
}
