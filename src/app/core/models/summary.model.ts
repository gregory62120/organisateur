import { ChartKey, ReportSnapshot } from './report-snapshot.model';

/** Chiffres d'une étiquette à un instant donné. */
export interface SummaryStats {
  total: number;
  todo: number;
  inProgress: number;
  validation: number;
  done: number;
  overdue: number;
  archived: number;
  /** Part de tâches terminées, de 0 à 100. */
  completionRate: number;
  subtasksDone: number;
  subtasksTotal: number;
  /** Durée moyenne (jours) entre la création et la fin des tâches terminées ; null sans tâche terminée. */
  averageDays: number | null;
}

/** Un résumé rédigé à propos d'une étiquette, conservé avec les chiffres du moment. */
export interface Summary {
  id: string;

  title: string;

  /** Étiquette des tâches résumées. */
  label: string;

  /** Texte du résumé, en HTML (produit par l'éditeur). */
  content: string;

  /** Chiffres figés au moment de la rédaction ; actualisables à la demande. */
  stats: SummaryStats;

  /** Chiffres des graphiques au moment de la rédaction ; absents des résumés écrits avant les graphiques. */
  snapshot?: ReportSnapshot;

  /** Graphiques du rapport inclus dans le résumé. */
  charts?: ChartKey[];

  createdAt: string;

  updatedAt: string;
}
