import { DaySchedule, DEFAULT_SCHEDULE, fromMinutes, toMinutes } from './schedule';
import { Task } from './task.model';
import { taskGroup } from './task-state';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Charge supposée d'une tâche sans estimation ni historique. */
export const DEFAULT_ESTIMATE_HOURS = 2;

/** Capacité journalière supposée tant que l'historique est trop court pour l'apprendre. */
export const DEFAULT_CAPACITY_HOURS = 6;

const HISTORY_DAYS = 28;

/** Durée minimale (minutes) d'un morceau quand une tâche est coupée par une pause. */
const MIN_SEGMENT = 30;

const PRIORITY_SCORE = { LOW: 10, MEDIUM: 25, HIGH: 45 } as const;

export interface PlanOptions {
  /** Jour de départ (le jour même est proposé en premier). */
  today: Date;

  /** Nombre de jours ouvrés à planifier. */
  days: number;

  /** Ne retient que les tâches de cette personne (et celles sans responsable). */
  assignee?: string;

  /** Imposer la capacité au lieu de l'apprendre de l'historique. */
  capacityHours?: number;

  /** Plages déjà occupées par jour (réunions…), en minutes depuis minuit, indexées par YYYY-MM-DD. */
  busy?: Record<string, { start: number; end: number }[]>;

  /** Horaires de travail d'un jour (YYYY-MM-DD) ; par défaut 9 h – 18 h avec une pause déjeuner. */
  schedule?: (date: string) => DaySchedule;
}

export const formatMinutes = fromMinutes;

export interface PlanItem {
  task: Task;
  hours: number;
  /** Créneau proposé (HH:mm), une fois la tâche placée dans une journée. */
  start?: string;
  end?: string;
  /** Créneau déjà planifié par l'utilisateur : conservé, les autres tâches se placent autour. */
  fixed?: boolean;
  /** Plages de travail proposées : plusieurs quand une pause ou une réunion coupe la tâche. */
  segments?: { start: string; end: string }[];
  /** Partie d'une tâche scindée (à partir de 1) et nombre total de parties. */
  part?: number;
  parts?: number;
  score: number;
  reasons: string[];
}

export interface PlanDay {
  /** YYYY-MM-DD */
  date: string;
  items: PlanItem[];
  hours: number;
  /** Heures qu'on peut y consacrer : capacité apprise, limitée par les horaires et réunions du jour. */
  capacity: number;
  /** Journée sans travail. */
  off: boolean;
}

export interface Plan {
  days: PlanDay[];
  /** Tâches qui ne tiennent pas dans la période demandée. */
  later: PlanItem[];
  /** Tâches écartées du plan par l'utilisateur (non terminées, non archivées). */
  ignored: Task[];
  capacityHours: number;
  capacitySource: 'history' | 'default' | 'custom';
  /** Constats lisibles (retards, surcharge…). */
  insights: string[];
}

export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

/** Jours ouvrés (du lundi au vendredi) à partir de `from` inclus ; si `from` tombe un week-end, on part du lundi. */
export function workingDays(from: Date, count: number): Date[] {
  const days: Date[] = [];
  const cursor = startOfDay(from);
  while (days.length < count) {
    if (!isWeekend(cursor)) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

const median = (values: number[]) => {
  if (!values.length) {
    return undefined;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** Jours entiers entre `from` et `to` (négatif si `to` est avant). */
const diffDays = (to: Date, from: Date) =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);

const dateOf = (key: string) => new Date(`${key}T00:00:00`);

interface History {
  /** Charge médiane des tâches déjà terminées, quand elles ont une estimation. */
  medianEstimate?: number;
  /** Durée médiane (jours) entre la prise en charge et la fin. */
  medianCycleDays?: number;
  capacityHours: number;
  capacitySource: Plan['capacitySource'];
}

/** Ce que l'historique apprend : charge habituelle, durée habituelle et capacité par jour. */
export function learnFromHistory(tasks: Task[], today: Date, custom?: number): History {
  const since = startOfDay(today).getTime() - HISTORY_DAYS * DAY_MS;
  const finished = tasks.filter(
    (task) =>
      task.status === 'DONE' && task.completedAt && new Date(task.completedAt).getTime() >= since,
  );

  const estimates = tasks
    .filter((task) => task.status === 'DONE' && task.estimateHours)
    .map((task) => task.estimateHours as number);
  const medianEstimate = median(estimates);

  const cycles = finished.map((task) => {
    const begin = task.startedAt ?? task.startDate ?? task.createdAt;
    return Math.max(0, diffDays(new Date(task.completedAt as string), new Date(begin)));
  });

  const base: Omit<History, 'capacityHours' | 'capacitySource'> = {
    medianEstimate,
    medianCycleDays: median(cycles),
  };

  if (custom) {
    return { ...base, capacityHours: custom, capacitySource: 'custom' };
  }
  // Assez d'historique : capacité = charge terminée sur la période / jours ouvrés de la période.
  if (finished.length >= 5) {
    const effort = finished.reduce(
      (sum, task) => sum + (task.estimateHours ?? medianEstimate ?? DEFAULT_ESTIMATE_HOURS),
      0,
    );
    const businessDays = Math.max(
      1,
      Array.from({ length: HISTORY_DAYS }, (_, i) => new Date(since + i * DAY_MS)).filter(
        (day) => !isWeekend(day),
      ).length,
    );
    const capacity = Math.min(8, Math.max(2, Math.round((effort / businessDays) * 2) / 2));
    return { ...base, capacityHours: capacity, capacitySource: 'history' };
  }
  return { ...base, capacityHours: DEFAULT_CAPACITY_HOURS, capacitySource: 'default' };
}

function scoreTask(
  task: Task,
  today: Date,
  history: History,
): { score: number; reasons: string[] } {
  let score = PRIORITY_SCORE[task.priority];
  const reasons: string[] = [];

  if (task.priority === 'HIGH') {
    reasons.push('Priorité haute');
  }

  if (task.dueDate) {
    const left = diffDays(dateOf(task.dueDate), today);
    if (left < 0) {
      score += 100 + Math.min(30, -left * 5);
      reasons.unshift(`En retard de ${-left} j`);
    } else if (left === 0) {
      score += 80;
      reasons.unshift("Échéance aujourd'hui");
    } else if (left === 1) {
      score += 60;
      reasons.unshift('Échéance demain');
    } else if (left <= 3) {
      score += 40;
      reasons.unshift(`Échéance dans ${left} j`);
    } else if (left <= 7) {
      score += 20;
      reasons.unshift(`Échéance dans ${left} j`);
    }
  }

  if (task.status === 'IN_PROGRESS') {
    score += 30;
    reasons.push('Déjà en cours : à terminer');
    if (task.startedAt && history.medianCycleDays !== undefined) {
      const age = diffDays(today, new Date(task.startedAt));
      if (age > Math.max(2, history.medianCycleDays * 2)) {
        score += 10;
        reasons.push(
          `Traîne depuis ${age} j (habituellement ${Math.round(history.medianCycleDays)} j)`,
        );
      }
    }
  } else if (task.status === 'VALIDATION') {
    score += 15;
    reasons.push('En revue : à boucler');
  }

  if (task.workSlots?.some((slot) => slot.date === toDateKey(today))) {
    score += 35;
    reasons.push('Prévue pour aujourd’hui');
  } else if (
    task.workStart &&
    task.workEnd &&
    task.workStart <= toDateKey(today) &&
    toDateKey(today) <= task.workEnd
  ) {
    score += 35;
    reasons.push('Prévue pour aujourd’hui');
  }

  if (task.startDate && task.startDate <= toDateKey(today) && task.status === 'TODO') {
    score += 10;
    reasons.push('Date de début atteinte');
  }

  const subtasks = task.checklist.length;
  const done = task.checklist.filter((item) => item.completed).length;
  if (subtasks > 0 && done > 0 && done < subtasks) {
    score += 8;
    reasons.push(`Sous-tâches ${done}/${subtasks}`);
  }

  return { score, reasons };
}

/** Propose quoi faire aujourd'hui et les jours suivants, à partir des tâches et de leur historique. */
export function buildPlan(allTasks: Task[], options: PlanOptions): Plan {
  const history = learnFromHistory(allTasks, options.today, options.capacityHours);
  const days = workingDays(options.today, options.days).map<PlanDay>((date) => ({
    date: toDateKey(date),
    items: [],
    hours: 0,
    capacity: 0,
    off: false,
  }));

  const me = options.assignee?.trim().toLowerCase();
  const candidates = allTasks
    .filter((task) => task.status !== 'DONE' && taskGroup(task) === 'sprint' && !task.planIgnored)
    .filter(
      (task) => !me || !task.assignedTo?.trim() || task.assignedTo.trim().toLowerCase() === me,
    )
    .flatMap<PlanItem>((task) => {
      const { score, reasons } = scoreTask(task, options.today, history);
      if (task.split && task.split.length > 1) {
        // Tâche scindée : chaque partie est placée séparément, dans l'ordre.
        return task.split.map((hours, index) => ({
          task,
          score,
          reasons: [`Partie ${index + 1}/${task.split?.length}`, ...reasons],
          hours,
          part: index + 1,
          parts: task.split?.length,
        }));
      }
      return [
        {
          task,
          score,
          reasons,
          hours: task.estimateHours ?? history.medianEstimate ?? DEFAULT_ESTIMATE_HOURS,
        },
      ];
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.task === b.task ? (a.part ?? 0) - (b.part ?? 0) : a.hours - b.hours),
    );

  // Plages occupées par jour : pauses, réunions du calendrier, puis tâches déjà placées.
  const todayKey = toDateKey(options.today);
  const nowMinutes = options.today.getHours() * 60 + options.today.getMinutes();
  const scheduleOf = (date: string) => options.schedule?.(date) ?? DEFAULT_SCHEDULE;
  const occupied = new Map<string, { start: number; end: number }[]>(
    days.map((day) => [
      day.date,
      [
        ...scheduleOf(day.date).breaks.map((b) => ({
          start: toMinutes(b.start),
          end: toMinutes(b.end),
        })),
      ],
    ]),
  );
  /** Libre de pause et de tâche ; les réunions comptent aussi, sauf si `overMeetings`. */
  const isFree = (date: string, from: number, to: number, overMeetings = false) =>
    !(occupied.get(date) ?? []).some((block) => from < block.end && to > block.start) &&
    (overMeetings ||
      !(options.busy?.[date] ?? []).some((meeting) => from < meeting.end && to > meeting.start));
  /** Première minute (au quart d'heure) où le jour est ouvert au travail. */
  const windowOf = (date: string) => {
    const schedule = scheduleOf(date);
    const open = toMinutes(schedule.start);
    const floor = date === todayKey ? Math.max(open, Math.ceil(nowMinutes / 15) * 15) : open;
    return { floor, close: toMinutes(schedule.end), off: !!schedule.off };
  };
  /**
   * Segments où placer `minutes` de travail dans la journée : on commence à la première plage libre
   * et, quand une pause ou une réunion l'interrompt, on reprend à la plage libre suivante pour le
   * temps restant. Les plages de moins de 30 min sont ignorées (sauf pour finir). Renvoie `undefined`
   * si la journée n'a pas assez de temps libre, sauf si `partial` : on place alors ce qui tient.
   */
  const findSegments = (
    date: string,
    minutes: number,
    minStart: number,
    partial: boolean,
    overMeetings: boolean,
  ): { start: number; end: number }[] | undefined => {
    const { floor: open, close, off } = windowOf(date);
    if (off) {
      return undefined;
    }
    const floor = Math.max(open, Math.ceil(minStart / 15) * 15);
    // Plages libres, au quart d'heure.
    const runs: { start: number; end: number }[] = [];
    for (let t = floor; t < close; t += 15) {
      if (!isFree(date, t, t + 15, overMeetings)) {
        continue;
      }
      const last = runs[runs.length - 1];
      if (last && last.end === t) {
        last.end = t + 15;
      } else {
        runs.push({ start: t, end: t + 15 });
      }
    }
    const segments: { start: number; end: number }[] = [];
    let left = minutes;
    for (const run of runs) {
      const length = run.end - run.start;
      if (length < MIN_SEGMENT && length < left) {
        continue;
      }
      const take = Math.min(length, left);
      segments.push({ start: run.start, end: run.start + take });
      left -= take;
      if (left <= 0) {
        return segments;
      }
    }
    return partial && segments.length > 0 ? segments : undefined;
  };
  // Capacité de chaque jour : celle apprise, limitée par le temps réellement libre.
  for (const day of days) {
    const { floor, close, off } = windowOf(day.date);
    let free = 0;
    for (let t = floor; t < close && !off; t += 15) {
      if (isFree(day.date, t, t + 15)) {
        free += 15;
      }
    }
    day.off = off;
    day.capacity = off ? 0 : Math.min(history.capacityHours, free / 60);
  }

  const later: PlanItem[] = [];
  /** Où s'est terminée la partie précédente d'une tâche scindée (la suivante vient après). */
  const lastPart = new Map<string, { date: string; end: number }>();

  // Tâches déjà planifiées (aujourd'hui ou plus tard) : leur créneau est conservé tel quel, et les
  // autres tâches se placent autour. Une planification passée est périmée : la tâche est replacée.
  const plannedSlot = (item: PlanItem) => {
    const task = item.task;
    const slots = (task.workSlots ?? []).filter(
      (slot) => slot.part === (item.part ?? 0) && slot.date >= todayKey && slot.start && slot.end,
    );
    if (slots.length > 0) {
      const date = slots[0].date;
      return {
        date,
        segments: slots
          .filter((slot) => slot.date === date)
          .map((slot) => ({ start: slot.start as string, end: slot.end as string })),
      };
    }
    if (
      item.part === undefined &&
      !task.workSlots?.length &&
      task.workStart &&
      task.workStart === task.workEnd &&
      task.workStart >= todayKey &&
      task.workStartTime &&
      task.workEndTime
    ) {
      return {
        date: task.workStart,
        segments: [{ start: task.workStartTime, end: task.workEndTime }],
      };
    }
    return undefined;
  };
  const toPlace: PlanItem[] = [];
  for (const item of candidates) {
    const planned = plannedSlot(item);
    const day = planned && days.find((d) => d.date === planned.date);
    if (!planned || !day) {
      toPlace.push(item);
      continue;
    }
    item.segments = planned.segments;
    item.start = planned.segments[0].start;
    item.end = planned.segments[planned.segments.length - 1].end;
    item.fixed = true;
    item.reasons = [
      'Planifiée',
      ...item.reasons.filter((reason) => reason !== 'Prévue pour aujourd’hui'),
    ];
    occupied
      .get(day.date)
      ?.push(
        ...planned.segments.map((s) => ({ start: toMinutes(s.start), end: toMinutes(s.end) })),
      );
    lastPart.set(item.task.id, {
      date: day.date,
      end: toMinutes(planned.segments[planned.segments.length - 1].end),
    });
    day.items.push(item);
    day.hours += item.hours;
  }

  for (const item of toPlace) {
    // Une tâche ne démarre pas avant sa date de début ni avant le début de sa période prévue.
    const earliest = [item.task.startDate, item.task.workStart].filter(Boolean).sort().pop();
    const minutes = Math.round(item.hours * 60);
    let placed: { start: number; end: number }[] | undefined;
    const slot = days.find((day) => {
      if (earliest && earliest > day.date) {
        return false;
      }
      if (day.off || (day.hours + item.hours > day.capacity && day.items.length > 0)) {
        return false;
      }
      const before = (item.part ?? 1) > 1 ? lastPart.get(item.task.id) : undefined;
      if ((item.part ?? 1) > 1 && !before) {
        return false;
      }
      if (before && day.date < before.date) {
        return false;
      }
      const minStart = before && day.date === before.date ? before.end : 0;
      placed = findSegments(
        day.date,
        minutes,
        minStart,
        day.items.length === 0,
        !!item.task.duringMeetings,
      );
      return placed !== undefined;
    });
    if (slot && placed) {
      const segments = placed as { start: number; end: number }[];
      item.segments = segments.map((segment) => ({
        start: formatMinutes(segment.start),
        end: formatMinutes(Math.min(segment.end, 24 * 60 - 1)),
      }));
      item.start = item.segments[0].start;
      item.end = item.segments[item.segments.length - 1].end;
      occupied.get(slot.date)?.push(...segments);
      lastPart.set(item.task.id, { date: slot.date, end: segments[segments.length - 1].end });
      slot.items.push(item);
      slot.hours += item.hours;
    } else {
      later.push(item);
    }
  }

  // Chaque jour est affiché dans l'ordre des horaires.
  for (const day of days) {
    day.items.sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''));
  }

  const insights: string[] = [];
  const overdue = candidates.filter((item) => item.reasons.some((r) => r.startsWith('En retard')));
  if (overdue.length) {
    insights.push(`${overdue.length} tâche(s) en retard, placées en premier.`);
  }
  const first = days[0];
  if (first && !first.off && first.hours > first.capacity) {
    insights.push(
      `Aujourd'hui dépasse votre capacité (${first.hours} h pour ${first.capacity} h) : une tâche prioritaire occupe seule la journée.`,
    );
  }
  const dueButLate = days.flatMap((day) =>
    day.items.filter((item) => item.task.dueDate && item.task.dueDate < day.date),
  );
  if (dueButLate.length) {
    insights.push(
      `${dueButLate.length} tâche(s) ne peuvent pas être terminées avant leur échéance.`,
    );
  }
  if (later.length) {
    insights.push(`${later.length} tâche(s) ne tiennent pas dans cette période.`);
  }

  return {
    days,
    later,
    ignored: allTasks.filter(
      (task) => task.planIgnored && task.status !== 'DONE' && taskGroup(task) === 'sprint',
    ),
    capacityHours: history.capacityHours,
    capacitySource: history.capacitySource,
    insights,
  };
}
