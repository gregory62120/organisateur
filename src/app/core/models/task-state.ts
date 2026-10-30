import { Task } from './task.model';

/**
 * Où se trouve une tâche dans le Kanban et le Gantt :
 * - `sprint` : affichée dans le tableau principal ;
 * - `hidden` : sortie du sprint, dans la section « masquées » ;
 * - `archived` : dans la section « archivées » (prioritaire sur le reste).
 */
export type TaskGroup = 'sprint' | 'hidden' | 'archived';

export function taskGroup(task: Task): TaskGroup {
  if (task.archived) {
    return 'archived';
  }
  return task.showInKanban === false ? 'hidden' : 'sprint';
}

/** Fait passer une tâche du sprint au groupe masqué, ou l'inverse. */
export function toggleSprint(task: Task): Task {
  return { ...task, showInKanban: task.showInKanban === false };
}

/** Archive la tâche, ou la restaure si elle l'est déjà. */
export function toggleArchived(task: Task, now = new Date()): Task {
  return task.archived
    ? { ...task, archived: false, archivedAt: undefined }
    : { ...task, archived: true, archivedAt: now.toISOString() };
}

/** Nombre de tâches par groupe. */
export function countByGroup(tasks: Task[]): Record<TaskGroup, number> {
  const counts: Record<TaskGroup, number> = { sprint: 0, hidden: 0, archived: 0 };
  for (const task of tasks) {
    counts[taskGroup(task)]++;
  }
  return counts;
}

/** Responsables distincts, triés par ordre alphabétique. */
export function uniqueAssignees(tasks: Task[]): string[] {
  return [...new Set(tasks.map((t) => t.assignedTo?.trim()))]
    .filter((a): a is string => !!a)
    .sort((a, b) => a.localeCompare(b));
}
