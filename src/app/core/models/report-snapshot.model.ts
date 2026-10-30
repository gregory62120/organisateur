import { Priority } from './task.model';

/** Nombre de tâches par statut dans un groupe (un responsable, une priorité). */
export interface StatusCounts {
  todo: number;
  inProgress: number;
  validation: number;
  done: number;
}

export interface AssigneeLoad extends StatusCounts {
  name: string;
}

export interface PriorityLoad extends StatusCounts {
  priority: Priority;
}

export interface Burnup {
  unit: 'week' | 'month';
  /** Périodes écoulées, puis périodes de prévision. */
  labels: string[];
  /** Tâches créées, cumulées (le périmètre) ; une valeur par période écoulée. */
  scope: number[];
  /** Tâches terminées, cumulées ; une valeur par période écoulée. */
  done: number[];
  /** Prolongement du rythme actuel après la dernière période, jusqu'à rattraper le périmètre. */
  forecast: number[];
  remaining: number;
  /** Tâches terminées par période, en moyenne sur les dernières périodes complètes. */
  rate: number;
  /** Périodes restantes au rythme actuel ; 0 si tout est terminé, null si le rythme est nul. */
  periodsLeft: number | null;
  /** « semaine du 14 déc. » ou « déc. 2026 » ; null sans prévision possible. */
  endLabel: string | null;
}

export interface LoadBucket {
  label: string;
  count: number;
  kind: 'overdue' | 'week' | 'later' | 'none';
}

export interface CycleTimes {
  buckets: { label: string; count: number }[];
  /** Délai médian de réalisation en jours ; null sans tâche terminée. */
  median: number | null;
}

/** Activité de terminaison sur des semaines pleines, pour le calendrier d'activité. */
export interface ActivitySnapshot {
  /** Lundi de la première semaine, au format YYYY-MM-DD. */
  start: string;
  /** Aujourd'hui, au format YYYY-MM-DD : les jours qui suivent ne sont pas encore arrivés. */
  today: string;
  /** Tâches terminées, une colonne par semaine et une valeur par jour (lundi → dimanche). */
  counts: number[][];
  /** Mois affiché au-dessus de la première colonne de chaque mois, null ailleurs. */
  months: (string | null)[];
  max: number;
  total: number;
}

/** Tâches créées et terminées par période, pour les graphiques de vitesse. */
export interface FlowSnapshot {
  unit: 'week' | 'month';
  labels: string[];
  created: number[];
  completed: number[];
}

/**
 * Les chiffres qui alimentent tous les graphiques d'un rapport, calculés une fois : de simples nombres
 * et textes, enregistrables tels quels pour figer les graphiques d'un résumé.
 */
export interface ReportSnapshot {
  /** Date du calcul, en ISO. */
  generatedAt: string;
  status: StatusCounts;
  priorities: PriorityLoad[];
  assignees: AssigneeLoad[];
  flow: FlowSnapshot;
  burnup: Burnup;
  load: LoadBucket[];
  cycle: CycleTimes;
  activity: ActivitySnapshot;
}

/** Les graphiques d'un rapport, qu'un résumé peut inclure ou non. */
export type ChartKey =
  'status' | 'priority' | 'burnup' | 'load' | 'velocity' | 'cycle' | 'activity' | 'assignee';

export const CHART_LABELS: Record<ChartKey, string> = {
  status: 'Répartition par statut',
  priority: 'Répartition par priorité',
  burnup: 'Burn-up et prévision',
  load: 'Charge à venir',
  velocity: 'Vitesse',
  cycle: 'Délais de réalisation',
  activity: "Calendrier d'activité",
  assignee: 'Charge par responsable',
};

export const CHART_KEYS = Object.keys(CHART_LABELS) as ChartKey[];
