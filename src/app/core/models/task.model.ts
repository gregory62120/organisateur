import { EditorBlock } from './block-model';

export interface ChecklistItem {
  id: string;

  label: string;

  completed: boolean;
}

export interface Comment {
  id: string;

  author: string;

  message: string;

  date: string;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'VALIDATION' | 'DONE';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  id: string;

  title: string;

  description: string;

  status: TaskStatus;

  priority: Priority;

  startDate?: string;

  dueDate?: string;

  assignedTo?: string;

  checklist: ChecklistItem[];

  comments: Comment[];

  attachments: string[];

  createdAt: string;

  updatedAt: string;
}
