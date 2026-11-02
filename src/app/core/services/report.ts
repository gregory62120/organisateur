import {
  ActivitySnapshot,
  AssigneeLoad,
  Burnup,
  CycleTimes,
  LoadBucket,
  PriorityLoad,
  ReportSnapshot,
  StatusCounts,
} from '../models/report-snapshot.model';
import { SummaryStats } from '../models/summary.model';
import { Priority, Task } from '../models/task.model';
import { isOverdue } from '../models/task-labels';

export type { AssigneeLoad, Burnup, CycleTimes, LoadBucket, PriorityLoad, StatusCounts };

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

/** Au-delà de cette durée (en semaines), la montée en charge est regroupée par mois. */
const MAX_WEEKS = 26;

/** Nombre minimal de semaines affichées : avec moins, la courbe se réduit à un point et ne dit rien. */
const MIN_WEEKS = 6;

const sameLabel = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Étiquettes utilisées par les tâches, avec leur nombre de tâches, par ordre alphabétique. */
export function labelsOf(tasks: Task[]): { label: string; count: number }[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const task of tasks) {
    for (const raw of task.tags ?? []) {
      const key = raw.trim().toLowerCase();
      if (key) {
        const entry = counts.get(key) ?? { label: raw.trim(), count: 0 };
        entry.count++;
        counts.set(key, entry);
      }
    }
  }
  return [...counts.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

/** Toutes les tâches portant cette étiquette, archivées comprises (casse et espaces ignorés). */
export function tasksWithLabel(tasks: Task[], label: string): Task[] {
  return label.trim()
    ? tasks.filter((t) => (t.tags ?? []).some((tag) => sameLabel(tag, label)))
    : [];
}

/** Date de fin d'une tâche terminée : celle enregistrée, sinon la dernière modification. */
export function completionDate(task: Task): Date | null {
  if (task.status !== 'DONE') {
    return null;
  }
  const date = new Date(task.completedAt ?? task.updatedAt);
  return isNaN(date.getTime()) ? null : date;
}

export type ReportStats = SummaryStats;

export function reportStats(tasks: Task[], now = new Date()): ReportStats {
  const count = (status: Task['status']) => tasks.filter((t) => t.status === status).length;
  const durations = tasks.flatMap((t) => {
    const end = completionDate(t);
    const days = end ? (end.getTime() - new Date(t.createdAt).getTime()) / DAY_MS : NaN;
    return days >= 0 ? [days] : [];
  });
  const checklist = tasks.flatMap((t) => t.checklist ?? []);

  return {
    total: tasks.length,
    todo: count('TODO'),
    inProgress: count('IN_PROGRESS'),
    validation: count('VALIDATION'),
    done: count('DONE'),
    overdue: tasks.filter((t) => isOverdue(t, now)).length,
    archived: tasks.filter((t) => t.archived).length,
    completionRate: tasks.length ? Math.round((count('DONE') / tasks.length) * 100) : 0,
    subtasksDone: checklist.filter((c) => c.completed).length,
    subtasksTotal: checklist.length,
    averageDays: durations.length
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
      : null,
  };
}

export interface Timeline {
  unit: 'week' | 'month';
  /** Début de chaque période (lundi, ou premier du mois). */
  starts: Date[];
  labels: string[];
  created: number[];
  completed: number[];
  cumulativeCreated: number[];
  cumulativeCompleted: number[];
  /** Tâches ouvertes à la fin de chaque période : la charge qui reste à absorber. */
  open: number[];
}

const startOfWeek = (date: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};

/**
 * Ajoute des semaines en jours calendaires. Additionner des millisecondes se tromperait d'une heure
 * au changement d'heure, et le lundi minuit se retrouverait la veille à 23 h.
 */
const addWeeks = (date: Date, weeks: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
};

/** « 26 oct. » pour une semaine (son lundi), « oct. 2026 » pour un mois. */
function periodLabel(date: Date, unit: 'week' | 'month'): string {
  return unit === 'week'
    ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
}

/**
 * Montée en charge : tâches créées et terminées par période, puis cumulées, depuis la première
 * création jusqu'à aujourd'hui. Par semaine (au moins 6, pour que la courbe ait un début), ou par mois
 * quand la période dépasse 26 semaines.
 */
export function timeline(tasks: Task[], now = new Date()): Timeline {
  const created = tasks.map((t) => new Date(t.createdAt)).filter((d) => !isNaN(d.getTime()));
  const empty: Timeline = {
    unit: 'week',
    starts: [],
    labels: [],
    created: [],
    completed: [],
    cumulativeCreated: [],
    cumulativeCompleted: [],
    open: [],
  };
  if (!created.length) {
    return empty;
  }

  const currentWeek = startOfWeek(now);
  const firstCreated = Math.min(...created.map((d) => d.getTime()));
  const first = new Date(Math.min(firstCreated, addWeeks(currentWeek, 1 - MIN_WEEKS).getTime()));
  const weekSpan = Math.round((currentWeek.getTime() - startOfWeek(first).getTime()) / WEEK_MS);
  const unit: Timeline['unit'] = weekSpan + 1 > MAX_WEEKS ? 'month' : 'week';

  const count =
    unit === 'week'
      ? weekSpan + 1
      : (now.getFullYear() - first.getFullYear()) * 12 + now.getMonth() - first.getMonth() + 1;

  const indexOf = (date: Date) => {
    const index =
      unit === 'week'
        ? Math.round((startOfWeek(date).getTime() - startOfWeek(first).getTime()) / WEEK_MS)
        : (date.getFullYear() - first.getFullYear()) * 12 + date.getMonth() - first.getMonth();
    return Math.min(Math.max(index, 0), count - 1);
  };

  const starts = Array.from({ length: count }, (_, i) =>
    unit === 'week'
      ? addWeeks(startOfWeek(first), i)
      : new Date(first.getFullYear(), first.getMonth() + i, 1),
  );
  const labels = starts.map((date) => periodLabel(date, unit));

  const createdPerPeriod = new Array<number>(count).fill(0);
  const completedPerPeriod = new Array<number>(count).fill(0);
  created.forEach((date) => createdPerPeriod[indexOf(date)]++);
  for (const task of tasks) {
    const end = completionDate(task);
    if (end) {
      // Une fin antérieure à la création est une anomalie de données : on la compte à la création,
      // pour que la charge ouverte ne devienne jamais négative.
      const created = new Date(task.createdAt);
      completedPerPeriod[indexOf(end < created ? created : end)]++;
    }
  }

  const cumulate = (values: number[]) =>
    values.map((_, i) => values.slice(0, i + 1).reduce((a, b) => a + b, 0));
  const cumulativeCreated = cumulate(createdPerPeriod);
  const cumulativeCompleted = cumulate(completedPerPeriod);

  return {
    unit,
    starts,
    labels,
    created: createdPerPeriod,
    completed: completedPerPeriod,
    cumulativeCreated,
    cumulativeCompleted,
    open: cumulativeCreated.map((c, i) => c - cumulativeCompleted[i]),
  };
}

const emptyCounts = (): StatusCounts => ({ todo: 0, inProgress: 0, validation: 0, done: 0 });

const countInto = (counts: StatusCounts, status: Task['status']) => {
  const key = { TODO: 'todo', IN_PROGRESS: 'inProgress', VALIDATION: 'validation', DONE: 'done' }[
    status
  ] as keyof StatusCounts;
  counts[key]++;
};

const totalOf = (counts: StatusCounts) =>
  counts.todo + counts.inProgress + counts.validation + counts.done;

/** Charge par responsable, par statut ; les plus chargés d'abord et « Non assigné » en dernier. */
export function byAssignee(tasks: Task[]): AssigneeLoad[] {
  const map = new Map<string, AssigneeLoad>();
  for (const task of tasks) {
    const name = task.assignedTo?.trim() || 'Non assigné';
    const entry = map.get(name) ?? { name, ...emptyCounts() };
    countInto(entry, task.status);
    map.set(name, entry);
  }
  return [...map.values()].sort(
    (a, b) =>
      Number(a.name === 'Non assigné') - Number(b.name === 'Non assigné') ||
      totalOf(b) - totalOf(a) ||
      a.name.localeCompare(b.name, 'fr'),
  );
}

/** Charge par priorité, par statut, de la plus haute à la plus basse. */
export function byPriority(tasks: Task[]): PriorityLoad[] {
  return (['HIGH', 'MEDIUM', 'LOW'] as Priority[]).map((priority) => {
    const counts = emptyCounts();
    tasks.filter((t) => t.priority === priority).forEach((t) => countInto(counts, t.status));
    return { priority, ...counts };
  });
}

// --- Burn-up et prévision ---------------------------------------------------------------

/** Nombre maximal de périodes de prévision dessinées après aujourd'hui. */
const MAX_FORECAST = 12;

/** Nombre de dernières périodes complètes qui donnent le rythme moyen pour la prévision. */
const FORECAST_WINDOW = 4;

/**
 * Burn-up : le périmètre (tâches créées, cumulées) et l'avancement (tâches terminées, cumulées),
 * puis une prévision qui prolonge le rythme moyen des dernières périodes. La prévision suppose que le
 * périmètre ne grandit plus.
 */
export function burnup(tasks: Task[], now = new Date()): Burnup {
  const flow = timeline(tasks, now);
  const actual = flow.labels.length;
  const empty: Burnup = {
    unit: flow.unit,
    labels: [],
    scope: [],
    done: [],
    forecast: [],
    remaining: 0,
    rate: 0,
    periodsLeft: null,
    endLabel: null,
  };
  if (!actual) {
    return empty;
  }

  const scopeNow = flow.cumulativeCreated[actual - 1];
  const doneNow = flow.cumulativeCompleted[actual - 1];
  const remaining = scopeNow - doneNow;
  // Les périodes d'avant la première tâche terminée (projet pas encore démarré) ne disent rien du
  // rythme : les compter tirerait la prévision vers le bas.
  const firstDone = flow.completed.findIndex((n) => n > 0);
  const average = (values: number[]) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  let rateRaw = 0;
  if (firstDone >= 0) {
    // La période en cours n'est pas terminée : on ne la compte que si, même partielle, elle dépasse
    // déjà le rythme des périodes complètes (sinon elle le tirerait artificiellement vers le bas).
    const full = flow.completed.slice(firstDone, actual - 1);
    const recentFull = full.slice(-FORECAST_WINDOW);
    const withCurrent = flow.completed.slice(firstDone).slice(-FORECAST_WINDOW);
    rateRaw = Math.max(average(recentFull), average(withCurrent));
  }
  const rate = Math.round(rateRaw * 10) / 10;

  const result: Burnup = {
    unit: flow.unit,
    labels: flow.labels,
    scope: flow.cumulativeCreated,
    done: flow.cumulativeCompleted,
    forecast: [],
    remaining,
    rate,
    periodsLeft: remaining <= 0 ? 0 : rate > 0 ? Math.ceil(remaining / rate) : null,
    endLabel: null,
  };

  if (result.periodsLeft === null || result.periodsLeft === 0) {
    return result;
  }

  const last = flow.starts[actual - 1];
  const startAfter = (n: number) =>
    flow.unit === 'week' ? addWeeks(last, n) : new Date(last.getFullYear(), last.getMonth() + n, 1);

  const steps = Math.min(result.periodsLeft, MAX_FORECAST);
  for (let k = 1; k <= steps; k++) {
    result.forecast.push(Math.min(doneNow + rate * k, scopeNow));
    result.labels = [...result.labels, periodLabel(startAfter(k), flow.unit)];
  }
  const end = periodLabel(startAfter(result.periodsLeft), flow.unit);
  result.endLabel = flow.unit === 'week' ? `semaine du ${end}` : end;
  return result;
}

// --- Charge à venir ---------------------------------------------------------------------

/** Nombre de semaines d'échéance détaillées ; au-delà, les tâches sont regroupées dans « Plus tard ». */
const LOAD_WEEKS = 8;

const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Jour d'une échéance au format YYYY-MM-DD ; null si elle est absente ou invalide. */
function dueDay(due?: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(due ?? '');
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

/**
 * Charge à venir : les tâches encore ouvertes (archivées exclues), rangées par semaine d'échéance.
 * D'abord celles en retard, puis chaque semaine à partir de celle-ci (8 au plus), « Plus tard »,
 * et enfin celles qui n'ont pas d'échéance.
 */
export function upcomingLoad(tasks: Task[], now = new Date()): LoadBucket[] {
  const today = dayStart(now);
  const currentWeek = startOfWeek(today);
  const open = tasks.filter((t) => t.status !== 'DONE' && !t.archived);

  const buckets: LoadBucket[] = [{ label: 'En retard', count: 0, kind: 'overdue' }];
  const weeks: LoadBucket[] = Array.from({ length: LOAD_WEEKS }, (_, i) => ({
    label: i === 0 ? 'Cette sem.' : periodLabel(addWeeks(currentWeek, i), 'week'),
    count: 0,
    kind: 'week' as const,
  }));
  const later: LoadBucket = { label: 'Plus tard', count: 0, kind: 'later' };
  const none: LoadBucket = { label: 'Sans date', count: 0, kind: 'none' };

  for (const task of open) {
    const due = dueDay(task.dueDate);
    if (!due) {
      none.count++;
    } else if (due < today) {
      buckets[0].count++;
    } else {
      const index = Math.round((startOfWeek(due).getTime() - currentWeek.getTime()) / WEEK_MS);
      (index < LOAD_WEEKS ? weeks[index] : later).count++;
    }
  }

  // On s'arrête à la dernière semaine utile pour ne pas étirer le graphique de semaines vides.
  const lastUsed = weeks.reduce((last, week, i) => (week.count ? i : last), 0);
  return [...buckets, ...weeks.slice(0, Math.max(lastUsed + 1, 4)), later, none].filter(
    (b) => b.kind !== 'later' || b.count > 0,
  );
}

// --- Vitesse et délais ------------------------------------------------------------------

/** Moyenne glissante sur `window` valeurs (moins au début), arrondie au dixième. */
export function movingAverage(values: number[], window = 3): number[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    return Math.round((slice.reduce((a, b) => a + b, 0) / slice.length) * 10) / 10;
  });
}

const CYCLE_BUCKETS: { label: string; max: number }[] = [
  { label: '1 j ou moins', max: 1 },
  { label: '2 à 3 j', max: 3 },
  { label: '4 à 7 j', max: 7 },
  { label: '8 à 14 j', max: 14 },
  { label: 'Plus de 14 j', max: Infinity },
];

/** Délais de réalisation (création → fin) des tâches terminées, par tranche, et leur médiane. */
export function cycleTimes(tasks: Task[]): CycleTimes {
  const days = tasks
    .flatMap((t) => {
      const end = completionDate(t);
      const d = end ? (end.getTime() - new Date(t.createdAt).getTime()) / DAY_MS : NaN;
      return d >= 0 ? [d] : [];
    })
    .sort((a, b) => a - b);

  const buckets = CYCLE_BUCKETS.map((b) => ({ label: b.label, count: 0 }));
  for (const d of days) {
    buckets[CYCLE_BUCKETS.findIndex((b) => d <= b.max)].count++;
  }

  const middle = Math.floor(days.length / 2);
  const median = days.length
    ? Math.round((days.length % 2 ? days[middle] : (days[middle - 1] + days[middle]) / 2) * 10) / 10
    : null;
  return { buckets, median };
}

// --- Calendrier d'activité --------------------------------------------------------------

export interface ActivityDay {
  date: Date;
  /** Tâches terminées ce jour-là. */
  count: number;
  /** Jour qui n'est pas encore arrivé. */
  future: boolean;
}

export interface ActivityGrid {
  /** Une colonne par semaine, du lundi au dimanche. */
  weeks: ActivityDay[][];
  /** Mois affiché au-dessus de la première colonne de chaque mois, null ailleurs. */
  months: (string | null)[];
  max: number;
  total: number;
}

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Tâches terminées par jour sur les `weeks` dernières semaines, pour un calendrier façon GitHub. */
export function activityGrid(tasks: Task[], now = new Date(), weeks = 20): ActivityGrid {
  const today = dayStart(now);
  const perDay = new Map<string, number>();
  for (const task of tasks) {
    const end = completionDate(task);
    if (end) {
      perDay.set(dayKey(end), (perDay.get(dayKey(end)) ?? 0) + 1);
    }
  }

  const first = addWeeks(startOfWeek(today), 1 - weeks);
  const columns = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + w * 7 + d);
      return { date, count: perDay.get(dayKey(date)) ?? 0, future: date > today };
    }),
  );

  const counts = columns.flat().map((day) => day.count);
  return {
    weeks: columns,
    months: columns.map((column, w) =>
      w === 0 || column[0].date.getMonth() !== columns[w - 1][0].date.getMonth()
        ? column[0].date.toLocaleDateString('fr-FR', { month: 'short' })
        : null,
    ),
    max: Math.max(0, ...counts),
    total: counts.reduce((a, b) => a + b, 0),
  };
}

// --- Instantané ------------------------------------------------------------------------

/** Format serrable de la grille d'activité : des nombres et des dates, sans objet `Date`. */
function activitySnapshot(tasks: Task[], now: Date): ActivitySnapshot {
  const grid = activityGrid(tasks, now);
  return {
    start: dayKey(grid.weeks[0][0].date),
    today: dayKey(dayStart(now)),
    counts: grid.weeks.map((week) => week.map((day) => day.count)),
    months: grid.months,
    max: grid.max,
    total: grid.total,
  };
}

/**
 * Calcule en une fois les chiffres de tous les graphiques d'un rapport. Le résultat ne contient que des
 * nombres et des textes : on peut l'enregistrer tel quel dans un résumé pour figer ses graphiques.
 */
export function buildSnapshot(tasks: Task[], now = new Date()): ReportSnapshot {
  const flow = timeline(tasks, now);
  return {
    generatedAt: now.toISOString(),
    status: {
      todo: tasks.filter((t) => t.status === 'TODO').length,
      inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      validation: tasks.filter((t) => t.status === 'VALIDATION').length,
      done: tasks.filter((t) => t.status === 'DONE').length,
    },
    priorities: byPriority(tasks),
    assignees: byAssignee(tasks),
    flow: {
      unit: flow.unit,
      labels: flow.labels,
      created: flow.created,
      completed: flow.completed,
    },
    burnup: burnup(tasks, now),
    load: upcomingLoad(tasks, now),
    cycle: cycleTimes(tasks),
    activity: activitySnapshot(tasks, now),
  };
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const plural = (n: number, singular: string, pluralForm = `${singular}s`) =>
  `${n} ${n > 1 ? pluralForm : singular}`;

/**
 * Brouillon de résumé en HTML à partir des chiffres d'une étiquette : un point d'ensemble, la
 * répartition, puis les points d'attention. Il sert de base à retravailler.
 */
export function draftHtml(label: string, stats: ReportStats, date = new Date()): string {
  const when = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const open = stats.total - stats.done;
  const lines = [
    `<h2>Résumé « ${escapeHtml(label)} » au ${when}</h2>`,
    stats.total
      ? `<p>${plural(stats.done, 'tâche terminée', 'tâches terminées')} sur ${stats.total} (${stats.completionRate} %), ` +
        `${plural(open, 'restante')}.</p>`
      : '<p>Aucune tâche pour cette étiquette.</p>',
  ];

  if (stats.total) {
    lines.push(
      '<ul>',
      `<li>À faire : ${stats.todo}</li>`,
      `<li>En cours : ${stats.inProgress}</li>`,
      `<li>En revue : ${stats.validation}</li>`,
      `<li>Terminées : ${stats.done}</li>`,
      '</ul>',
    );
    const attention: string[] = [];
    if (stats.overdue) {
      attention.push(`${plural(stats.overdue, 'tâche en retard', 'tâches en retard')}`);
    }
    if (stats.subtasksTotal) {
      attention.push(`sous-tâches : ${stats.subtasksDone}/${stats.subtasksTotal} terminées`);
    }
    if (stats.averageDays !== null) {
      attention.push(`durée moyenne de réalisation : ${stats.averageDays} j`);
    }
    if (attention.length) {
      lines.push(`<p><strong>À noter :</strong> ${attention.join(' ; ')}.</p>`);
    }
  }
  lines.push('<p></p>');
  return lines.join('');
}
