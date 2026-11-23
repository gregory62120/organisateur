import { effect, inject, Injectable, signal, untracked } from '@angular/core';

import { splitSpan, TimeLog } from '../models/time-log';
import { JsonFileStore } from './json-file-store';
import { StorageService } from './storage.service';

export const TIMELOG_FILE = 'timelog.json';

const TIMER_KEY = 'tf-timer';

export interface RunningTimer {
  taskId: string;
  /** Début, en millisecondes. */
  startedAt: number;
}

/** Temps passé sur les tâches (timelog.json) et chrono en cours (navigateur). */
@Injectable({ providedIn: 'root' })
export class TimeLogService {
  private readonly storage = inject(StorageService);

  private readonly store = new JsonFileStore<TimeLog>(this.storage, TIMELOG_FILE);

  readonly logs = this.store.items;

  readonly error = this.store.error;

  readonly saving = this.store.saving;

  private readonly timerState = signal<RunningTimer | null>(this.restoreTimer());

  readonly timer = this.timerState.asReadonly();

  constructor() {
    effect(() => {
      if (this.storage.projectOpened() > 0) {
        untracked(() => this.store.load());
      }
    });
  }

  add(taskId: string, date: string, minutes: number, note?: string) {
    const log: TimeLog = {
      id: crypto.randomUUID(),
      taskId,
      date,
      minutes: Math.round(minutes),
      note: note?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    return this.store.update((list) => [...list, log]);
  }

  remove(id: string) {
    return this.store.update((list) => list.filter((log) => log.id !== id));
  }

  /** Lance le chrono sur une tâche ; celui d'une autre tâche est arrêté et enregistré d'abord. */
  start(taskId: string) {
    const running = this.timerState();
    if (running?.taskId === taskId) {
      return;
    }
    if (running) {
      // Le chrono précédent doit pouvoir être enregistré avant d'en lancer un autre.
      if (!this.storage.isOpen()) {
        return;
      }
      this.stop();
    }
    this.setTimer({ taskId, startedAt: Date.now() });
  }

  /** Abandonne le chrono sans rien enregistrer. */
  cancel() {
    this.setTimer(null);
  }

  /**
   * Arrête le chrono et enregistre le temps écoulé (un enregistrement par jour si minuit est
   * passé), secondes comprises : seul un arrêt dans la seconde qui suit le lancement est ignoré.
   * « Reprendre » = relancer le chrono : chaque reprise ajoute sa propre ligne.
   */
  stop(): Promise<void> | undefined {
    const timer = this.timerState();
    // Sans projet ouvert le temps ne pourrait pas être écrit : on laisse le chrono courir.
    if (!timer || !this.storage.isOpen()) {
      return undefined;
    }
    this.setTimer(null);
    const end = Date.now();
    const logs: TimeLog[] = splitSpan(timer.startedAt, end).map((part) => ({
      id: crypto.randomUUID(),
      taskId: timer.taskId,
      createdAt: new Date().toISOString(),
      ...part,
    }));
    if (logs.length === 0) {
      return undefined;
    }
    return this.store.update((list) => [...list, ...logs]);
  }

  private setTimer(timer: RunningTimer | null) {
    this.timerState.set(timer);
    try {
      if (timer) {
        localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
      } else {
        localStorage.removeItem(TIMER_KEY);
      }
    } catch {
      // Stockage indisponible : le chrono ne survivra pas à un rechargement.
    }
  }

  private restoreTimer(): RunningTimer | null {
    try {
      const saved = JSON.parse(localStorage.getItem(TIMER_KEY) ?? 'null') as RunningTimer | null;
      return saved && typeof saved.taskId === 'string' && Number.isFinite(saved.startedAt)
        ? saved
        : null;
    } catch {
      return null;
    }
  }
}
