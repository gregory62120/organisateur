import { EditorBlock } from './block-model';

export interface ChecklistItem {
  id: string;

  label: string;

  completed: boolean;

  description?: string;

  assignedTo?: string;

  dueDate?: string;
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

  tags?: string[];

  checklist: ChecklistItem[];

  comments: Comment[];

  attachments: string[];

  /** Affichée dans le Kanban tant que la valeur n'est pas `false`. */
  showInKanban?: boolean;

  /** Une tâche archivée disparaît du Kanban et du Gantt, sauf de leur section « Archivées ». */
  archived?: boolean;

  archivedAt?: string;

  createdAt: string;

  updatedAt: string;
}
