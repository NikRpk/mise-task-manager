export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';

export type Priority = 'low' | 'medium' | 'high';

export type ProjectRole = 'VIEW' | 'EDIT' | 'ADMIN';

export interface User {
  uid: string;
  email: string;
  displayName: string;
}

export interface ProjectMember {
  userId: string;
  email: string;
  displayName: string;
  role: ProjectRole;
  addedAt: string;
  addedBy: string;
}

export interface StatusOption {
  id: string;
  label: string;
  color: string;
  isDefault?: boolean; // Cannot be deleted, only renamed/recolored
}

export interface PriorityOption {
  id: string;
  label: string;
  color: string;
  isDefault?: boolean; // Cannot be deleted, only renamed/recolored
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[]; // For select type
  required: boolean;
}

export interface ProjectSettings {
  statusOptions: StatusOption[];
  priorityOptions: PriorityOption[];
  customFields: CustomField[];
}

export interface SubTask {
  id: string;
  description: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string; // Rich text/markdown support
  subTasks: SubTask[];
  deadline: string | null; // ISO date string
  status: TaskStatus;
  links: string[];
  owner: string;
  projectId: string;
  priority: Priority;
  tags: string[];
  images: string[]; // Array of image URLs or base64 data
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  icon: string;
  createdBy: string; // User ID who created the project
  createdAt: string;
  updatedAt: string;
  members: ProjectMember[]; // Array of project members with roles
  settings?: ProjectSettings; // Project-specific settings
}

export interface FilterOptions {
  deadline?: 'overdue' | 'today' | 'this-week' | 'this-month' | 'future';
  status?: TaskStatus[];
  owner?: string[];
  priority?: Priority[];
  tags?: string[];
}
