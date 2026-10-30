import { effect, inject, Injectable, untracked } from '@angular/core';

import { ProjectEvent } from '../models/event.model';
import { JsonFileStore } from './json-file-store';
import { StorageService } from './storage.service';

export const EVENTS_FILE = 'events.json';

@Injectable({
  providedIn: 'root',
})
export class EventService {
  private storage = inject(StorageService);

  private store = new JsonFileStore<ProjectEvent>(this.storage, EVENTS_FILE);

  readonly eventsSignal = this.store.items;

  /** Message d'erreur de la dernière lecture / écriture de events.json (null si tout va bien). */
  readonly error = this.store.error;

  /** Vrai tant qu'une écriture de events.json est en cours. */
  readonly saving = this.store.saving;

  constructor() {
    effect(() => {
      if (this.storage.projectOpened() > 0) {
        untracked(() => this.load());
      }
    });
  }

  add(event: ProjectEvent) {
    return this.store.update((list) => [...list, event]);
  }

  update(event: ProjectEvent) {
    const updated = { ...event, updatedAt: new Date().toISOString() };
    return this.store.update((list) => list.map((e) => (e.id === event.id ? updated : e)));
  }

  delete(id: string) {
    return this.store.update((list) => list.filter((e) => e.id !== id));
  }

  /** Remplace les évènements en mémoire, sans écrire (utilisé après une synchronisation entrante). */
  updateEvents(content: ProjectEvent[]) {
    this.store.set(content);
  }

  load() {
    return this.store.load();
  }

  /**
   * Nouvel évènement à la date donnée (YYYY-MM-DD) : sur toute la journée, ou d'une heure
   * à partir de `startTime` (HH:mm) s'il est fourni.
   */
  createEmpty(date: string, startTime?: string): ProjectEvent {
    const now = new Date().toISOString();
    return {
      ...(startTime ? { startTime, endTime: this.addHour(startTime) } : {}),
      id: crypto.randomUUID(),
      title: '',
      date,
      description: '',
      color: 'blue',
      createdAt: now,
      updatedAt: now,
    };
  }

  private addHour(time: string): string {
    const [h, m] = time.split(':').map(Number);
    return `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(h + 1 > 23 ? 59 : m).padStart(2, '0')}`;
  }
}
