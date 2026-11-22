import { Injectable, signal } from '@angular/core';
import { DaySchedule, DEFAULT_SCHEDULE, TimeRange } from '../models/schedule';

const KEY = 'tf-planner-schedule';

interface Stored {
  defaults: DaySchedule;
  /** Horaires propres à un jour (YYYY-MM-DD), qui remplacent ceux par défaut. */
  overrides: Record<string, DaySchedule>;
}

/** Horaires de travail saisis par l'utilisateur : par défaut, puis jour par jour. Propres au navigateur. */
@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly state = signal<Stored>(this.restore());

  readonly defaults = () => this.state().defaults;

  /** Horaires effectifs d'un jour. */
  forDay = (date: string): DaySchedule => this.state().overrides[date] ?? this.state().defaults;

  hasOverride(date: string): boolean {
    return !!this.state().overrides[date];
  }

  /** `key` : `null` pour les horaires par défaut, sinon un jour YYYY-MM-DD. */
  update(key: string | null, change: (schedule: DaySchedule) => DaySchedule) {
    this.state.update((state) => {
      const current = key ? this.forDayOf(state, key) : state.defaults;
      const next = this.clean(change(structuredClone(current)));
      return key
        ? { ...state, overrides: { ...state.overrides, [key]: next } }
        : { ...state, defaults: next };
    });
    this.save();
  }

  setTime(key: string | null, field: 'start' | 'end', value: string) {
    if (value) {
      this.update(key, (s) => ({ ...s, [field]: value }));
    }
  }

  setOff(key: string | null, off: boolean) {
    this.update(key, (s) => ({ ...s, off }));
  }

  addBreak(key: string | null) {
    this.update(key, (s) => ({ ...s, breaks: [...s.breaks, { start: '15:30', end: '15:45' }] }));
  }

  removeBreak(key: string | null, index: number) {
    this.update(key, (s) => ({ ...s, breaks: s.breaks.filter((_, i) => i !== index) }));
  }

  setBreak(key: string | null, index: number, field: keyof TimeRange, value: string) {
    if (value) {
      this.update(key, (s) => ({
        ...s,
        breaks: s.breaks.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
      }));
    }
  }

  /** Revient aux horaires par défaut pour ce jour. */
  reset(date: string) {
    this.state.update((state) => {
      const { [date]: _removed, ...overrides } = state.overrides;
      return { ...state, overrides };
    });
    this.save();
  }

  private forDayOf(state: Stored, date: string) {
    return state.overrides[date] ?? state.defaults;
  }

  /** Pauses triées ; une pause à l'envers est remise dans l'ordre. */
  private clean(schedule: DaySchedule): DaySchedule {
    return {
      ...schedule,
      breaks: schedule.breaks
        .map((b) => (b.start <= b.end ? b : { start: b.end, end: b.start }))
        .sort((a, b) => a.start.localeCompare(b.start)),
    };
  }

  private save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state()));
    } catch {
      // Stockage indisponible : les horaires ne seront pas conservés.
    }
  }

  private restore(): Stored {
    const fallback: Stored = { defaults: structuredClone(DEFAULT_SCHEDULE), overrides: {} };
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Stored | null;
      if (!saved?.defaults?.start) {
        return fallback;
      }
      // Les jours passés n'ont plus d'intérêt : on ne garde que ceux d'aujourd'hui et à venir.
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const overrides = Object.fromEntries(
        Object.entries(saved.overrides ?? {}).filter(([date]) => date >= todayKey),
      );
      return { defaults: saved.defaults, overrides };
    } catch {
      return fallback;
    }
  }
}
