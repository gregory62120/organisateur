import { effect, inject, Injectable, untracked } from '@angular/core';

import { MusicTrack } from '../models/music.model';
import { MusicPlanService } from './music-plan.service';
import { JsonFileStore } from './json-file-store';
import { StorageService } from './storage.service';
import { parseYoutubeVideoId } from './youtube';
import { YoutubeService } from './youtube.service';

export const MUSIC_FILE = 'music.json';

export type AddTrackResult = { ok: true; track: MusicTrack } | { ok: false; error: string };

/** Playlist unique du projet : des vidéos YouTube configurées à l'avance. */
@Injectable({
  providedIn: 'root',
})
export class MusicService {
  private storage = inject(StorageService);

  private youtube = inject(YoutubeService);

  private plan = inject(MusicPlanService);

  private store = new JsonFileStore<MusicTrack>(this.storage, MUSIC_FILE);

  readonly tracks = this.store.items;

  /** Message d'erreur de la dernière lecture / écriture de music.json (null si tout va bien). */
  readonly error = this.store.error;

  readonly saving = this.store.saving;

  constructor() {
    effect(() => {
      if (this.storage.projectOpened() > 0) {
        untracked(() => this.load());
      }
    });
  }

  /**
   * Ajoute une vidéo à partir de son lien : le titre vient de YouTube et la durée du lecteur.
   * Une durée illisible n'empêche pas l'ajout, elle sera relue à la première lecture.
   */
  async addFromUrl(url: string): Promise<AddTrackResult> {
    const videoId = parseYoutubeVideoId(url);
    if (!videoId) {
      return { ok: false, error: "Ce lien n'est pas une vidéo YouTube." };
    }
    if (this.tracks().some((t) => t.videoId === videoId)) {
      return { ok: false, error: 'Cette vidéo est déjà dans la playlist.' };
    }

    try {
      const [meta, duration] = await Promise.all([
        this.youtube.metadata(videoId),
        this.youtube.duration(videoId),
      ]);
      const track: MusicTrack = {
        id: crypto.randomUUID(),
        videoId,
        title: meta.title,
        author: meta.author,
        duration,
        addedAt: new Date().toISOString(),
      };
      await this.store.update((list) => [...list, track]);
      return { ok: true, track };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Ajout impossible.' };
    }
  }

  /** Retire un titre de la playlist, et ses placements sur le calendrier. */
  async remove(id: string) {
    await this.store.update((list) => list.filter((t) => t.id !== id));
    await this.plan.removeForTrack(id);
  }

  /** Décale un titre d'une place vers le haut (-1) ou vers le bas (1). */
  move(id: string, direction: -1 | 1) {
    return this.store.update((list) => {
      const from = list.findIndex((t) => t.id === id);
      const to = from + direction;
      if (from === -1 || to < 0 || to >= list.length) {
        return list;
      }
      const next = [...list];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  /** Enregistre une durée lue pendant la lecture, si elle diffère de celle connue. */
  setDuration(id: string, seconds: number) {
    const track = this.tracks().find((t) => t.id === id);
    if (!track || !(seconds > 0) || Math.abs((track.duration ?? 0) - seconds) < 1) {
      return Promise.resolve();
    }
    return this.store.update((list) =>
      list.map((t) => (t.id === id ? { ...t, duration: Math.round(seconds) } : t)),
    );
  }

  /** Remplace la playlist en mémoire, sans écrire (utilisé après une synchronisation entrante). */
  updateTracks(content: MusicTrack[]) {
    this.store.set(content);
  }

  load() {
    return this.store.load();
  }
}
