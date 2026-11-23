import { toMinutes } from './schedule';

export type Absence = 'leave' | 'holiday' | 'sick' | 'recovery';

export const ABSENCE_LABELS: Record<Absence, string> = {
  leave: 'Congé',
  holiday: 'Férié',
  sick: 'Maladie',
  recovery: 'Récupération',
};

/** Ce que j'ai fait un jour donné : heures de début et de fin, pause, ou une absence. */
export interface DayEntry {
  /** YYYY-MM-DD */
  date: string;
  /** Matin et après-midi (HH:mm) : la pause du midi est l'écart entre les deux. */
  amStart?: string;
  amEnd?: string;
  pmStart?: string;
  pmEnd?: string;
  /** Ancienne saisie d'une seule plage continue : lue comme le matin (voir `normalizeEntry`). */
  start?: string;
  end?: string;
  /** Autres pauses non travaillées (café…), en minutes, en plus de la pause du midi. */
  breakMinutes?: number;
  absence?: Absence;
  note?: string;
}

/** Durée de travail attendue chaque jour de la semaine, en minutes (lundi → dimanche). */
export interface Contract {
  minutes: number[];
  /** Jours travaillés (lundi → dimanche) : le total hebdomadaire est réparti entre eux. */
  days: boolean[];
}

export const ALL_DAYS = [true, true, true, true, true, true, true];

/** 35 h par semaine, réparties à parts égales sur les 7 jours (5 h par jour) tant qu'on ne choisit pas. */
export const DEFAULT_CONTRACT: Contract = { minutes: splitWeekly(35, ALL_DAYS), days: ALL_DAYS };

/**
 * Total hebdomadaire réparti à parts égales sur les jours choisis (par défaut les 7), en minutes.
 * 39 h sur lundi → vendredi donnent 7,8 h (7h48) par jour ; une minute en trop va aux premiers jours.
 */
export function splitWeekly(hours: number, days: boolean[] = ALL_DAYS): number[] {
  const total = Math.max(0, Math.round(hours * 60));
  const count = days.filter(Boolean).length;
  if (count === 0) {
    return days.map(() => 0);
  }
  const base = Math.floor(total / count);
  let rest = total - base * count;
  return days.map((worked) => {
    if (!worked) {
      return 0;
    }
    const extra = rest > 0 ? 1 : 0;
    rest -= extra;
    return base + extra;
  });
}

export type DayStatus = 'worked' | 'absence' | 'missing' | 'pending';

export interface DayResult {
  date: string;
  /** Durée prévue au contrat ce jour-là, quoi qu'il arrive. */
  contract: number;
  /** Durée due : nulle un jour de congé, férié ou de maladie. */
  expected: number;
  worked: number;
  /** Heures en plus (positif) ou manquantes (négatif). */
  balance: number;
  status: DayStatus;
  /** Les jours à venir sans saisie ne comptent pas encore. */
  counted: boolean;
}

export interface WeekResult {
  days: DayResult[];
  worked: number;
  expected: number;
  balance: number;
}

export const dayIndex = (date: string) => (new Date(`${date}T00:00:00`).getDay() + 6) % 7;

export const toKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const mondayOf = (date: Date): Date => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
};

export const addDaysToKey = (date: string, days: number): string => {
  const copy = new Date(`${date}T00:00:00`);
  copy.setDate(copy.getDate() + days);
  return toKey(copy);
};

/** Une saisie à plage unique (début / fin) devient une plage du matin. */
export function normalizeEntry(entry: DayEntry): DayEntry {
  const { start, end, ...rest } = entry;
  const hasRanges = rest.amStart || rest.amEnd || rest.pmStart || rest.pmEnd;
  return !hasRanges && (start || end) ? { ...rest, amStart: start, amEnd: end } : rest;
}

const range = (from?: string, to?: string) =>
  from && to ? Math.max(0, toMinutes(to) - toMinutes(from)) : 0;

/** Au moins une plage (matin ou après-midi) est complète. */
export function hasWork(entry?: DayEntry): boolean {
  if (!entry) {
    return false;
  }
  const e = normalizeEntry(entry);
  return !!((e.amStart && e.amEnd) || (e.pmStart && e.pmEnd));
}

/** Temps travaillé : matin + après-midi − autres pauses ; une plage incomplète ou à l'envers vaut 0. */
export function workedMinutes(entry?: DayEntry): number {
  if (!entry || entry.absence) {
    return 0;
  }
  const e = normalizeEntry(entry);
  return Math.max(0, range(e.amStart, e.amEnd) + range(e.pmStart, e.pmEnd) - (e.breakMinutes ?? 0));
}

export function dayResult(
  date: string,
  entry: DayEntry | undefined,
  contract: Contract,
  today: string,
): DayResult {
  const planned = contract.minutes[dayIndex(date)] ?? 0;
  const base = { date, contract: planned };

  if (entry?.absence) {
    // Congé, férié, maladie : jour non dû. Une récupération consomme au contraire des heures.
    return entry.absence === 'recovery'
      ? {
          ...base,
          expected: planned,
          worked: 0,
          balance: -planned,
          status: 'absence',
          counted: true,
        }
      : { ...base, expected: 0, worked: 0, balance: 0, status: 'absence', counted: true };
  }
  if (hasWork(entry)) {
    const worked = workedMinutes(entry);
    return {
      ...base,
      expected: planned,
      worked,
      balance: worked - planned,
      status: 'worked',
      counted: true,
    };
  }
  if (date < today && planned > 0) {
    return {
      ...base,
      expected: planned,
      worked: 0,
      balance: -planned,
      status: 'missing',
      counted: true,
    };
  }
  return { ...base, expected: planned, worked: 0, balance: 0, status: 'pending', counted: false };
}

export function weekResult(
  monday: string,
  entries: Map<string, DayEntry>,
  contract: Contract,
  today: string,
): WeekResult {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDaysToKey(monday, i);
    return dayResult(date, entries.get(date), contract, today);
  });
  const counted = days.filter((day) => day.counted);
  return {
    days,
    worked: counted.reduce((sum, day) => sum + day.worked, 0),
    expected: counted.reduce((sum, day) => sum + day.expected, 0),
    balance: counted.reduce((sum, day) => sum + day.balance, 0),
  };
}

/** Solde total depuis la première saisie : heures en plus moins heures manquantes. */
export function cumulativeBalance(entries: DayEntry[], contract: Contract, today: string): number {
  const first = entries.map((entry) => entry.date).sort()[0];
  if (!first) {
    return 0;
  }
  const byDate = new Map(entries.map((entry) => [entry.date, entry]));
  let total = 0;
  let date = first;
  for (let i = 0; i < 3660 && date <= today; i++) {
    total += dayResult(date, byDate.get(date), contract, today).balance;
    date = addDaysToKey(date, 1);
  }
  // Les saisies de jours à venir comptent aussi.
  for (const entry of entries) {
    if (entry.date > today) {
      total += dayResult(entry.date, entry, contract, today).balance;
    }
  }
  return total;
}

/** « 7h30 » ; avec `signed`, « +1h15 » ou « −0h45 » (« 0h00 » si rien). */
export function formatDuration(minutes: number, signed = false): string {
  const sign = minutes > 0 ? '+' : minutes < 0 ? '−' : '';
  const abs = Math.abs(Math.round(minutes));
  const text = `${Math.floor(abs / 60)}h${String(abs % 60).padStart(2, '0')}`;
  return signed ? `${sign}${text}` : text;
}
