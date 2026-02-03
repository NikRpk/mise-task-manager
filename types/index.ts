export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';

export type Priority = 'low' | 'medium' | 'high';

export interface SubTask {
  id: string;
  description: string;
  completed: boolean;
}

export interface Task {
  id: string;
  description: string; // Rich text/markdown support
  subTasks: SubTask[];
  deadline: string | null; // ISO date string
  status: TaskStatus;
  links: string[];
  owner: string;
  projectId: string;
  priority: Priority;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface FilterOptions {
  deadline?: 'overdue' | 'today' | 'this-week' | 'this-month' | 'future';
  status?: TaskStatus[];
  owner?: string[];
  priority?: Priority[];
  tags?: string[];
}
