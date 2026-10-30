import { effect, inject, Injectable, untracked } from '@angular/core';

import { MusicSlot } from '../models/music.model';
import { JsonFileStore } from './json-file-store';
import { snapStart, toTime } from './music-plan';
import { StorageService } from './storage.service';

export const MUSIC_PLAN_FILE = 'music-plan.json';

/**
 * Musiques placées sur le calendrier, jour par jour. Cette planification sert de repère :
 * rien ne démarre tout seul, la lecture est toujours lancée par l'utilisateur.
 */
@Injectable({
  providedIn: 'root',
})
export class MusicPlanService {
  private storage = inject(StorageService);

  private store = new JsonFileStore<MusicSlot>(this.storage, MUSIC_PLAN_FILE);

  readonly slots = this.store.items;

  /** Message d'erreur de la dernière lecture / écriture de music-plan.json (null si tout va bien). */
  readonly error = this.store.error;

  readonly saving = this.store.saving;

  constructor() {
    effect(() => {
      if (this.storage.projectOpened() > 0) {
        untracked(() => this.load());
      }
    });
  }

  /** Place une musique à `minutes` depuis minuit (calé sur le pas de 5 minutes). */
  add(trackId: string, date: string, minutes: number) {
    const slot: MusicSlot = {
      id: crypto.randomUUID(),
      trackId,
      date,
      startTime: toTime(snapStart(minutes)),
    };
    return this.store.update((list) => [...list, slot]);
  }

  /** Déplace une musique placée vers un autre horaire, éventuellement un autre jour. */
  move(id: string, date: string, minutes: number) {
    return this.store.update((list) =>
      list.map((s) => (s.id === id ? { ...s, date, startTime: toTime(snapStart(minutes)) } : s)),
    );
  }

  remove(id: string) {
    return this.store.update((list) => list.filter((s) => s.id !== id));
  }

  /** Retire tous les placements d'une musique supprimée de la playlist. */
  removeForTrack(trackId: string) {
    if (!this.slots().some((s) => s.trackId === trackId)) {
      return Promise.resolve();
    }
    return this.store.update((list) => list.filter((s) => s.trackId !== trackId));
  }

  /** Remplace la planification en mémoire, sans écrire (utilisé après une synchronisation entrante). */
  updateSlots(content: MusicSlot[]) {
    this.store.set(content);
  }

  load() {
    return this.store.load();
  }
}
