import { Task } from './task.model';
import { PRIORITY_LABELS, STATUS_LABELS } from './task-labels';

/** Du temps passé sur une tâche, saisi à la main ou issu du chrono. */
export interface TimeLog {
  id: string;
  taskId: string;
  /** Jour du travail, YYYY-MM-DD. */
  date: string;
  minutes: number;
  /** Durée exacte en secondes (chrono) ; absente pour une saisie manuelle, qui vaut `minutes`. */
  seconds?: number;
  /** Heures de début et de fin (HH:mm) quand le temps vient du chrono. */
  start?: string;
  end?: string;
  note?: string;
  createdAt: string;
}

export type GroupBy = 'task' | 'tag' | 'assignee' | 'status' | 'priority' | 'day';

export const GROUP_LABELS: Record<GroupBy, string> = {
  task: 'Tâche',
  tag: 'Étiquette',
  assignee: 'Responsable',
  status: 'Statut',
  priority: 'Priorité',
  day: 'Jour',
};

export const NO_ASSIGNEE = 'Non assigné';

export type Period = 'week' | 'month' | 'all' | 'custom';

export const NO_TAG = 'Sans étiquette';

export interface TimeGroup {
  key: string;
  label: string;
  minutes: number;
  /** Nombre de tâches concernées. */
  tasks: number;
  /** Pour une tâche : estimation (minutes) et temps passé toutes périodes confondues. */
  estimate?: number;
  spentAll?: number;
}

const toKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Bornes (YYYY-MM-DD, incluses) d'une période ; `undefined` = pas de borne. */
export function periodRange(
  period: Period,
  today: Date,
  custom: { from?: string; to?: string } = {},
): { from?: string; to?: string } {
  if (period === 'week') {
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return { from: toKey(monday), to: toKey(sunday) };
  }
  if (period === 'month') {
    return {
      from: toKey(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: toKey(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    };
  }
  return period === 'custom' ? { from: custom.from || undefined, to: custom.to || undefined } : {};
}

export function filterByRange(logs: TimeLog[], range: { from?: string; to?: string }): TimeLog[] {
  return logs.filter(
    (log) => (!range.from || log.date >= range.from) && (!range.to || log.date <= range.to),
  );
}

/** Durée d'une saisie en minutes, avec les secondes du chrono (fractionnaire). */
export const logMinutes = (log: TimeLog) => (log.seconds ?? log.minutes * 60) / 60;

export const totalMinutes = (logs: TimeLog[]) =>
  logs.reduce((sum, log) => sum + logMinutes(log), 0);

/**
 * Temps regroupé par tâche, étiquette, responsable, statut, priorité ou jour. Avec les étiquettes,
 * le temps d'une tâche compte en entier dans chacune de ses étiquettes (les parts peuvent donc
 * dépasser le total). Tâches, étiquettes… : du plus long au plus court ; jours : dans l'ordre.
 * `all` : tous les temps saisis, pour comparer au temps estimé d'une tâche.
 */
export function groupTime(
  logs: TimeLog[],
  tasks: Task[],
  by: GroupBy,
  all: TimeLog[] = logs,
): TimeGroup[] {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const groups = new Map<string, TimeGroup & { ids: Set<string> }>();

  const add = (key: string, label: string, log: TimeLog, extra: Partial<TimeGroup> = {}) => {
    const group = groups.get(key) ?? {
      key,
      label,
      minutes: 0,
      tasks: 0,
      ids: new Set<string>(),
      ...extra,
    };
    group.minutes += logMinutes(log);
    group.ids.add(log.taskId);
    group.tasks = group.ids.size;
    groups.set(key, group);
  };

  for (const log of logs) {
    const task = taskById.get(log.taskId);
    switch (by) {
      case 'task':
        add(log.taskId, task?.title ?? 'Tâche supprimée', log, {
          estimate: task?.estimateHours ? Math.round(task.estimateHours * 60) : undefined,
          spentAll: totalMinutes(all.filter((other) => other.taskId === log.taskId)),
        });
        break;
      case 'tag':
        for (const tag of task?.tags?.length ? task.tags : [NO_TAG]) {
          add(tag, tag, log);
        }
        break;
      case 'assignee': {
        const name = task?.assignedTo?.trim() || NO_ASSIGNEE;
        add(name, name, log);
        break;
      }
      case 'status':
        add(task?.status ?? '?', task ? STATUS_LABELS[task.status] : 'Tâche supprimée', log);
        break;
      case 'priority':
        add(task?.priority ?? '?', task ? PRIORITY_LABELS[task.priority] : 'Tâche supprimée', log);
        break;
      case 'day':
        add(log.date, log.date, log);
        break;
    }
  }
  const list = [...groups.values()].map(({ ids: _ids, ...group }) => group);
  return by === 'day'
    ? list.sort((a, b) => a.key.localeCompare(b.key))
    : list.sort((a, b) => b.minutes - a.minutes || a.label.localeCompare(b.label, 'fr'));
}

/**
 * Lit une durée saisie : « 1h30 », « 1:30 », « 1,5 » (heures), « 45min », « 90 min ».
 * Renvoie des minutes, ou `undefined` si illisible ou nulle.
 */
export function parseDuration(text: string): number | undefined {
  const value = text.trim().toLowerCase().replace(',', '.');
  if (!value) {
    return undefined;
  }
  let minutes: number | undefined;
  let match: RegExpMatchArray | null;
  if ((match = value.match(/^(\d+)\s*(?:h|:)\s*(\d{1,2})?\s*(?:min|m)?$/))) {
    minutes = Number(match[1]) * 60 + Number(match[2] ?? 0);
  } else if ((match = value.match(/^(\d+(?:\.\d+)?)\s*(?:min|m)$/))) {
    minutes = Number(match[1]);
  } else if ((match = value.match(/^\d+(?:\.\d+)?$/))) {
    minutes = Number(value) * 60;
  }
  minutes = minutes === undefined ? undefined : Math.round(minutes);
  return minutes && minutes > 0 ? minutes : undefined;
}

/** « 2h05 » (ou « 45 min » sous l'heure si `short`). */
/** Durée avec secondes : « 1h20m05s », « 20m05s », « 45s » (`minutes` peut être fractionnaire). */
export function formatHms(minutes: number): string {
  const total = Math.max(0, Math.round(minutes * 60));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) {
    return `${h}h${pad(m)}m${pad(s)}s`;
  }
  return m > 0 ? `${m}m${pad(s)}s` : `${s}s`;
}

export function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  return `${Math.floor(rounded / 60)}h${String(rounded % 60).padStart(2, '0')}`;
}

/**
 * Découpe un intervalle de chrono (millisecondes) par jour : un chrono qui passe minuit donne une
 * ligne par jour. Les secondes sont conservées ; seule une durée de moins d'une seconde est ignorée.
 */
export function splitSpan(
  startMs: number,
  endMs: number,
): { date: string; minutes: number; seconds: number; start: string; end: string }[] {
  if (endMs - startMs < 1000) {
    return [];
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  const clock = (ms: number) => `${pad(new Date(ms).getHours())}:${pad(new Date(ms).getMinutes())}`;
  const parts: { date: string; minutes: number; seconds: number; start: string; end: string }[] =
    [];
  for (let from = startMs; from < endMs;) {
    const day = new Date(from);
    const midnight = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime();
    const to = Math.min(endMs, midnight);
    parts.push({
      date: `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`,
      minutes: Math.max(1, Math.round((to - from) / 60000)),
      seconds: Math.max(1, Math.round((to - from) / 1000)),
      start: clock(from),
      end: to === midnight ? '23:59' : clock(to),
    });
    from = to;
  }
  return parts;
}
