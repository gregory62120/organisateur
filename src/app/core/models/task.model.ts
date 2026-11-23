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

/** Un créneau de travail d'une tâche scindée (une partie, un jour, des heures). */
export interface WorkSlot {
  /** Numéro de la partie scindée (à partir de 1) ; 0 pour une tâche non scindée coupée par une pause. */
  part: number;
  date: string;
  start?: string;
  end?: string;
}

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

  /** Date à laquelle la tâche a été prise en charge pour la première fois (passée « En cours »). */
  startedAt?: string;

  /** Charge estimée, en heures : sert au plan du jour. */
  estimateHours?: number;

  /** Période (YYYY-MM-DD) pendant laquelle je compte m'en occuper ; posée par « Planifier ». */
  workStart?: string;

  workEnd?: string;

  /** Heures (HH:mm) de la prise en charge, posées par « Planifier » ; absentes = toute la journée. */
  workStartTime?: string;

  workEndTime?: string;

  /** Tâche scindée : durée en heures de chaque partie (ex. [2, 1.5]) ; la somme remplace l'estimation. */
  split?: number[];

  /** Créneaux planifiés des parties d'une tâche scindée. */
  workSlots?: WorkSlot[];

  /**
   * Interruption voulue : cette tâche est interrompue par la tâche `by` après `afterMinutes` de
   * travail, puis reprise juste après. Le plan place « début de la tâche, l'autre, reprise ».
   */
  interruption?: { by: string; afterMinutes: number };

  /** Peut se faire pendant une réunion : le plan ne la décale pas autour des réunions. */
  duringMeetings?: boolean;

  /** La tâche est écartée du plan suggéré (sans être archivée ni masquée). */
  planIgnored?: boolean;

  /** Date à laquelle la tâche est passée à « Terminé » ; absente pour les tâches terminées avant son introduction. */
  completedAt?: string;

  createdAt: string;

  updatedAt: string;
}
