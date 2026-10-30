import { Component, computed, inject, input, signal } from '@angular/core';

import { GanttService } from '../../../core/services/gantt.service';
import { MusicPlayerService } from '../../../core/services/music-player.service';
import { nextStart, toMinutes, TRACK_DRAG_TYPE } from '../../../core/services/music-plan';
import { MusicPlanService } from '../../../core/services/music-plan.service';
import { DEFAULT_TRACK_SECONDS, totalSeconds } from '../../../core/services/music-schedule';
import { MusicService } from '../../../core/services/music.service';
import { formatClock, formatDuration } from '../../../core/services/youtube';

/** Playlist du projet : ajout de liens YouTube, ordre des titres et bouton de lecture. */
@Component({
  selector: 'app-music-panel',
  standalone: true,
  templateUrl: './music-panel.html',
  styleUrl: './music-panel.scss',
})
export class MusicPanelComponent {
  private music = inject(MusicService);

  private plan = inject(MusicPlanService);

  private gantt = inject(GanttService);

  readonly player = inject(MusicPlayerService);

  /** Jour affiché dans le calendrier : c'est celui sur lequel on planifie les musiques. */
  readonly day = input.required<Date>();

  readonly tracks = this.music.tracks;

  readonly formatDuration = formatDuration;

  readonly url = signal('');

  readonly adding = signal(false);

  readonly addError = signal<string | null>(null);

  /** Durée cumulée de la playlist, en heures et minutes (« 1 h 12 », « 8 min »). */
  readonly total = computed(() => {
    const minutes = Math.round(totalSeconds(this.tracks()) / 60);
    const h = Math.floor(minutes / 60);
    return h ? `${h} h ${String(minutes % 60).padStart(2, '0')}` : `${minutes} min`;
  });

  /** Heures de passage prévues de chaque titre sur la journée (hors titres déjà écoutés). */
  readonly times = computed(() => {
    const map = new Map<string, string>();
    for (const s of this.player.schedule()) {
      if (s.status !== 'played') {
        map.set(s.track.id, `${formatClock(s.start)} – ${formatClock(s.end)}`);
      }
    }
    return map;
  });

  private readonly dayIso = computed(() => this.gantt.toIso(this.day()));

  /** Musiques déjà placées sur le jour affiché, par titre : « 10:00, 14:30 ». */
  readonly planned = computed(() => {
    const byTrack = new Map<string, string[]>();
    for (const slot of this.plan.slots()) {
      if (slot.date === this.dayIso()) {
        byTrack.set(slot.trackId, [...(byTrack.get(slot.trackId) ?? []), slot.startTime]);
      }
    }
    return new Map(
      [...byTrack].map(([id, times]) => [id, [...times].sort().join(', ')] as [string, string]),
    );
  });

  /** Avancement du titre en cours, de 0 à 100. */
  readonly progress = computed(() =>
    this.player.duration() > 0
      ? Math.min((this.player.position() / this.player.duration()) * 100, 100)
      : 0,
  );

  readonly playLabel = computed(() => {
    switch (this.player.status()) {
      case 'playing':
        return 'Pause';
      case 'paused':
        return 'Reprendre';
      case 'loading':
        return 'Chargement…';
      default:
        return 'Lancer la lecture';
    }
  });

  thumbnail(videoId: string): string {
    return `https://i.ytimg.com/vi/${videoId}/default.jpg`;
  }

  /** Début du glissement d'un titre vers la grille du calendrier. */
  onDragStart(event: DragEvent, trackId: string) {
    event.dataTransfer?.setData(TRACK_DRAG_TYPE, trackId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  /** Place un titre sur le jour affiché, à la suite de ce qui est déjà planifié (sans glisser-déposer). */
  schedule(trackId: string, event: Event) {
    event.stopPropagation();
    const durations = new Map(
      this.tracks().map((t) => [t.id, t.duration || DEFAULT_TRACK_SECONDS]),
    );
    const ends = this.plan
      .slots()
      .filter((slot) => slot.date === this.dayIso())
      .map((slot) => toMinutes(slot.startTime) + (durations.get(slot.trackId) ?? 0) / 60);
    const now = new Date();
    const start = nextStart({
      ends,
      isToday: this.dayIso() === this.gantt.toIso(now),
      nowMinutes: now.getHours() * 60 + now.getMinutes(),
    });
    void this.plan.add(trackId, this.dayIso(), start);
  }

  async add() {
    const value = this.url().trim();
    if (!value || this.adding()) {
      return;
    }
    this.adding.set(true);
    this.addError.set(null);

    const result = await this.music.addFromUrl(value);
    if (result.ok) {
      this.url.set('');
    } else {
      this.addError.set(result.error);
    }
    this.adding.set(false);
  }

  remove(id: string, event: Event) {
    event.stopPropagation();
    if (id === this.player.currentId()) {
      this.player.stop();
    }
    void this.music.remove(id);
  }

  move(id: string, direction: -1 | 1, event: Event) {
    event.stopPropagation();
    void this.music.move(id, direction);
  }
}
