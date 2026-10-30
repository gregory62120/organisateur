import { Priority, Task, TaskStatus } from './task.model';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  VALIDATION: 'En revue',
  DONE: 'Terminé',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
};

export const STATUSES = Object.keys(STATUS_LABELS) as TaskStatus[];

export const PRIORITIES = Object.keys(PRIORITY_LABELS) as Priority[];

export function initials(name?: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return '';
  }
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export function formatDueDate(date?: string): string {
  if (!date) {
    return '';
  }
  const parsed = new Date(date);
  return isNaN(parsed.getTime())
    ? ''
    : parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function isOverdue(task: Task, now = new Date()): boolean {
  if (!task.dueDate || task.status === 'DONE') {
    return false;
  }
  const due = new Date(task.dueDate);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < now.getTime();
}

export type TaskSort = 'manual' | 'priority' | 'dueDate' | 'title';

export const SORT_LABELS: Record<TaskSort, string> = {
  manual: 'Manuel',
  priority: 'Priorité',
  dueDate: 'Échéance',
  title: 'Titre',
};

export const SORTS = Object.keys(SORT_LABELS) as TaskSort[];

const PRIORITY_RANK: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export function compareTasks(sort: TaskSort): ((a: Task, b: Task) => number) | null {
  switch (sort) {
    case 'priority':
      return (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    case 'dueDate':
      // Les tâches sans échéance passent en dernier.
      return (a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
    case 'title':
      return (a, b) => a.title.localeCompare(b.title, 'fr');
    default:
      return null;
  }
}

const TAG_TONES = [
  { bg: '#e6edff', fg: '#2f55d4' },
  { bg: '#f1e8ff', fg: '#7a3fe0' },
  { bg: '#e2f6ec', fg: '#12805a' },
  { bg: '#fff0d9', fg: '#b86a00' },
  { bg: '#ffe7ea', fg: '#c92f40' },
  { bg: '#def5f8', fg: '#0e7a8c' },
];

function hash(value: string): number {
  let h = 0;
  for (const char of value.toLowerCase()) {
    h = (h * 31 + char.charCodeAt(0)) >>> 0;
  }
  return h;
}

/** Couleur stable d'une étiquette : une même étiquette a toujours la même teinte. */
export function tagTone(tag: string): { bg: string; fg: string } {
  return TAG_TONES[hash(tag) % TAG_TONES.length];
}

const AVATAR_COLORS = ['#2f6bff', '#8b5cf6', '#19b36b', '#ff9f1a', '#ef4452', '#0e9fb3'];

export function avatarColor(name?: string): string {
  return AVATAR_COLORS[hash(name ?? '') % AVATAR_COLORS.length];
}

/** Date courte pour les tableaux : « 17 oct. », avec l'année seulement si ce n'est pas l'année en cours. */
export function formatShortDate(date?: string, now = new Date()): string {
  if (!date) {
    return '';
  }
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    return '';
  }
  return parsed.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    ...(parsed.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  });
}
