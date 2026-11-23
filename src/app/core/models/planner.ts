import { DaySchedule, DEFAULT_SCHEDULE, fromMinutes, toMinutes } from './schedule';
import { Task } from './task.model';
import { taskGroup } from './task-state';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Charge supposée d'une tâche sans estimation ni historique. */
export const DEFAULT_ESTIMATE_HOURS = 2;

const HISTORY_DAYS = 28;

/** Bonus (en points de score) par heure de travail placée : à priorité égale, on préfère remplir la journée. */
const FILL_BONUS_PER_HOUR = 30;

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

  /** Temps déjà passé sur chaque tâche (minutes, par id) : une tâche reprise ne compte que le reste. */
  spent?: Record<string, number>;

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
  /** `schedule` : tout le temps libre des horaires saisis ; `custom` : plafond imposé. */
  capacitySource: 'schedule' | 'custom';
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
}

/** Ce que l'historique apprend : charge habituelle et durée habituelle d'une tâche. */
export function learnFromHistory(tasks: Task[], today: Date): History {
  const since = startOfDay(today).getTime() - HISTORY_DAYS * DAY_MS;
  const finished = tasks.filter(
    (task) =>
      task.status === 'DONE' && task.completedAt && new Date(task.completedAt).getTime() >= since,
  );

  const estimates = tasks
    .filter((task) => task.status === 'DONE' && task.estimateHours)
    .map((task) => task.estimateHours as number);

  const cycles = finished.map((task) => {
    const begin = task.startedAt ?? task.startDate ?? task.createdAt;
    return Math.max(0, diffDays(new Date(task.completedAt as string), new Date(begin)));
  });

  return { medianEstimate: median(estimates), medianCycleDays: median(cycles) };
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

/** Sous-ensemble de poids total ≤ `capacity` qui maximise la valeur (sac à dos, programmation dynamique). */
export function bestSubset(items: { weight: number; value: number }[], capacity: number): number[] {
  const n = items.length;
  const best: number[][] = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    const { weight, value } = items[i - 1];
    for (let c = 0; c <= capacity; c++) {
      best[i][c] = best[i - 1][c];
      if (weight <= c && best[i - 1][c - weight] + value > best[i][c]) {
        best[i][c] = best[i - 1][c - weight] + value;
      }
    }
  }
  const chosen: number[] = [];
  for (let i = n, c = capacity; i > 0; i--) {
    if (best[i][c] !== best[i - 1][c]) {
      chosen.push(i - 1);
      c -= items[i - 1].weight;
    }
  }
  return chosen.reverse();
}

/** Propose quoi faire aujourd'hui et les jours suivants, à partir des tâches et de leur historique. */
export function buildPlan(allTasks: Task[], options: PlanOptions): Plan {
  const history = learnFromHistory(allTasks, options.today);
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
      // Temps déjà passé : on ne replanifie que le reste (au moins 15 min).
      const doneHours = (options.spent?.[task.id] ?? 0) / 60;
      const resumed =
        doneHours > 0 ? [`Reprise : déjà ${Math.round(doneHours * 10) / 10} h faites`] : [];
      if (task.split && task.split.length > 1) {
        // Tâche scindée : chaque partie est placée séparément, dans l'ordre.
        let rest = doneHours;
        return task.split.flatMap((hours, index) => {
          const left = Math.max(0, hours - rest);
          rest = Math.max(0, rest - hours);
          return left < 0.25 && rest > 0
            ? []
            : [
                {
                  task,
                  score,
                  reasons: [`Partie ${index + 1}/${task.split?.length}`, ...resumed, ...reasons],
                  hours: Math.max(0.25, left),
                  part: index + 1,
                  parts: task.split?.length,
                },
              ];
        });
      }
      const estimate = task.estimateHours ?? history.medianEstimate ?? DEFAULT_ESTIMATE_HOURS;
      return [
        {
          task,
          score,
          reasons: [...resumed, ...reasons],
          hours: Math.max(0.25, estimate - doneHours),
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
    // Capacité = tout le temps libre de la journée (horaires saisis, pauses et réunions déduites).
    // On ne la bride plus par une capacité « apprise » : elle laissait des tâches au lendemain
    // alors qu'il restait de la place.
    day.capacity = off
      ? 0
      : options.capacityHours !== undefined
        ? Math.min(options.capacityHours, free / 60)
        : free / 60;
  }

  const later: PlanItem[] = [];
  /** Où s'est terminée la partie précédente d'une tâche scindée (la suivante vient après). */
  const lastPart = new Map<string, { date: string; end: number }>();

  // Tâches déjà planifiées (aujourd'hui ou plus tard) : leur créneau est conservé tel quel, et les
  // autres tâches se placent autour. Une planification passée est périmée : la tâche est replacée.
  /** Un créneau déjà planifié reste valable s'il est dans les horaires du jour, hors pause. */
  const fitsSchedule = (date: string, segments: { start: string; end: string }[]) => {
    const schedule = scheduleOf(date);
    if (schedule.off) {
      return false;
    }
    const open = toMinutes(schedule.start);
    const close = toMinutes(schedule.end);
    return segments.every((segment) => {
      const from = toMinutes(segment.start);
      const to = toMinutes(segment.end);
      return (
        from >= open &&
        to <= close &&
        !schedule.breaks.some((b) => from < toMinutes(b.end) && to > toMinutes(b.start))
      );
    });
  };
  const plannedSlotRaw = (item: PlanItem) => {
    const task = item.task;
    const slots = (task.workSlots ?? []).filter(
      (slot) => slot.part === (item.part ?? 0) && slot.date >= todayKey && slot.start && slot.end,
    );
    // Une tâche non scindée enregistrée en plusieurs créneaux (interrompue puis reprise).
    if (slots.length === 0 && item.part === undefined && !task.split && task.workSlots?.length) {
      const upcoming = task.workSlots.filter(
        (slot) => slot.date >= todayKey && slot.start && slot.end,
      );
      if (upcoming.length > 0) {
        const date = upcoming[0].date;
        return {
          date,
          segments: upcoming
            .filter((slot) => slot.date === date)
            .map((slot) => ({ start: slot.start as string, end: slot.end as string })),
        };
      }
    }
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
  // Horaires modifiés depuis la planification : un créneau hors des horaires est replanifié.
  const plannedSlot = (item: PlanItem) => {
    const planned = plannedSlotRaw(item);
    return planned && fitsSchedule(planned.date, planned.segments) ? planned : undefined;
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

  /** Place une tâche dans le premier jour (ou seulement `onlyDay`) où elle tient ; `false` sinon. */
  const tryPlace = (
    item: PlanItem,
    onlyDay?: PlanDay,
    after?: { date: string; end: number },
  ): { date: string; end: number } | undefined => {
    // Une tâche ne démarre pas avant sa date de début ni avant le début de sa période prévue.
    const earliest = [item.task.startDate, item.task.workStart].filter(Boolean).sort().pop();
    const minutes = Math.round(item.hours * 60);
    let placed: { start: number; end: number }[] | undefined;
    const slot = days.find((day) => {
      if (onlyDay && day !== onlyDay) {
        return false;
      }
      if (earliest && earliest > day.date) {
        return false;
      }
      if (day.off || (day.hours + item.hours > day.capacity && day.items.length > 0)) {
        return false;
      }
      const previous = (item.part ?? 1) > 1 ? lastPart.get(item.task.id) : undefined;
      if ((item.part ?? 1) > 1 && !previous) {
        return false;
      }
      // Contrainte d'ordre : après la partie précédente, et après la tâche qui interrompt.
      const before =
        previous && after
          ? previous.date > after.date || (previous.date === after.date && previous.end > after.end)
            ? previous
            : after
          : (previous ?? after);
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
    if (!slot || !placed) {
      return undefined;
    }
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
    return { date: slot.date, end: segments[segments.length - 1].end };
  };

  // 0) Interruptions voulues : « début de A, B, reprise de A ». B (la tâche qui interrompt) est
  //    placée juste après le début de A, puis A reprend après B. Placées avant le reste.
  const chained = new Set<PlanItem>();
  for (const a of toPlace) {
    const interruption = a.task.interruption;
    if (!interruption || a.part !== undefined || chained.has(a)) {
      continue;
    }
    const b = toPlace.find(
      (item) =>
        item !== a &&
        item.part === undefined &&
        !chained.has(item) &&
        item.task.id === interruption.by,
    );
    if (!b) {
      continue;
    }
    chained.add(a);
    chained.add(b);
    const firstHours = Math.min(Math.max(0, interruption.afterMinutes / 60), a.hours - 0.25);
    const hasFirst = firstHours >= 0.25;
    const first: PlanItem | undefined = hasFirst
      ? {
          ...a,
          hours: firstHours,
          part: 1,
          parts: 2,
          reasons: [`Interrompue par « ${b.task.title} »`, ...a.reasons],
        }
      : undefined;
    const interrupter: PlanItem = {
      ...b,
      reasons: [`Interrompt « ${a.task.title} »`, ...b.reasons],
    };
    const resume: PlanItem = {
      ...a,
      hours: a.hours - (hasFirst ? firstHours : 0),
      part: hasFirst ? 2 : undefined,
      parts: hasFirst ? 2 : undefined,
      reasons: [`Reprise après « ${b.task.title} »`, ...a.reasons],
    };
    const firstEnd = first ? tryPlace(first) : undefined;
    if (first && !firstEnd) {
      later.push(first, interrupter, resume);
      continue;
    }
    const interrupterEnd = tryPlace(interrupter, undefined, firstEnd);
    if (!interrupterEnd) {
      later.push(interrupter, resume);
      continue;
    }
    if (!tryPlace(resume, undefined, interrupterEnd)) {
      later.push(resume);
    }
  }
  const pool = toPlace.filter((item) => !chained.has(item));

  // 1) Les tâches « rigides » d'abord : échéance dans la période (ou dépassée) et parties d'une
  //    tâche scindée. Par échéance croissante, pour tenir un maximum d'échéances (EDF).
  const lastDay = days[days.length - 1]?.date ?? '';
  const isRigid = (item: PlanItem) =>
    item.part !== undefined || (!!item.task.dueDate && item.task.dueDate <= lastDay);
  const rigid = pool
    .filter(isRigid)
    .sort(
      (a, b) =>
        (a.task.dueDate ?? '9999').localeCompare(b.task.dueDate ?? '9999') ||
        b.score - a.score ||
        (a.task === b.task ? (a.part ?? 0) - (b.part ?? 0) : a.hours - b.hours),
    );
  for (const item of rigid) {
    if (!tryPlace(item)) {
      later.push(item);
    }
  }

  // 2) Les autres, jour par jour : on choisit les tâches qui remplissent le mieux le temps restant
  //    (sac à dos, au quart d'heure), en favorisant les scores élevés, au lieu de prendre la
  //    première qui tient. Une grosse tâche ne bloque plus la journée en laissant des trous.
  let flexible = pool.filter((item) => !isRigid(item));
  for (const day of days) {
    if (day.off || flexible.length === 0) {
      continue;
    }
    const eligible = flexible.filter((item) => {
      const earliest = [item.task.startDate, item.task.workStart].filter(Boolean).sort().pop();
      return !earliest || earliest <= day.date;
    });
    const capacityUnits = Math.floor(Math.max(0, day.capacity - day.hours) * 4);
    const chosen = bestSubset(
      eligible.map((item) => ({
        weight: Math.max(1, Math.ceil(item.hours * 4)),
        value: Math.pow(item.score, 1.5) + FILL_BONUS_PER_HOUR * item.hours,
      })),
      capacityUnits,
    ).map((index) => eligible[index]);
    chosen.sort((a, b) => b.score - a.score);
    for (const item of chosen) {
      if (tryPlace(item, day)) {
        flexible = flexible.filter((other) => other !== item);
      }
    }
    // Journée encore vide : une tâche plus longue que la capacité y est quand même placée.
    if (day.items.length === 0) {
      const biggest = eligible.filter((item) => flexible.includes(item))[0];
      if (biggest && tryPlace(biggest, day)) {
        flexible = flexible.filter((other) => other !== biggest);
      }
    }
  }
  later.push(...flexible);

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
    capacityHours: options.capacityHours ?? Math.max(0, ...days.map((day) => day.capacity)),
    capacitySource: options.capacityHours !== undefined ? 'custom' : 'schedule',
    insights,
  };
}
