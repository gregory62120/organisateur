import { computed, inject, Injectable, signal } from '@angular/core';

import { MusicTrack } from '../models/music.model';
import { MusicService } from './music.service';
import { buildSchedule, PlayedTrack } from './music-schedule';
import { YoutubeService } from './youtube.service';
import { YT_STATE, YTPlayer, YTPlayerEvent } from './youtube-api.types';

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

/** Au-delà de cette position (s), « précédent » relance le titre au lieu de reculer. */
const RESTART_THRESHOLD = 3;

/** Délai (ms) avant de passer au titre suivant quand une vidéo ne peut pas être lue. */
const SKIP_DELAY = 1500;

/**
 * Lecteur de la playlist : enchaîne les vidéos YouTube et conserve son état d'une page à l'autre.
 * La musique continue donc quand on quitte le calendrier ; le lecteur visible est celui du `MusicMiniPlayer`.
 */
@Injectable({
  providedIn: 'root',
})
export class MusicPlayerService {
  private music = inject(MusicService);

  private youtube = inject(YoutubeService);

  readonly currentId = signal<string | null>(null);

  readonly status = signal<PlayerStatus>('idle');

  /** Position de lecture dans le titre en cours (secondes). */
  readonly position = signal(0);

  /** Durée du titre en cours lue par le lecteur (secondes). */
  readonly duration = signal(0);

  readonly message = signal<string | null>(null);

  /** Titres déjà écoutés pendant la session, avec leurs heures réelles. */
  readonly history = signal<PlayedTrack[]>([]);

  private readonly clock = signal(new Date());

  readonly current = computed(() => this.music.tracks().find((t) => t.id === this.currentId()));

  private readonly currentIndex = computed(() =>
    this.music.tracks().findIndex((t) => t.id === this.currentId()),
  );

  readonly hasNext = computed(
    () => this.currentIndex() !== -1 && this.currentIndex() < this.music.tracks().length - 1,
  );

  readonly hasPrevious = computed(() => this.currentIndex() > 0);

  readonly isActive = computed(() => this.status() !== 'idle');

  /** La playlist placée sur la journée : aperçu à l'arrêt, planning réel en lecture. */
  readonly schedule = computed(() =>
    buildSchedule({
      tracks: this.music.tracks(),
      now: this.clock(),
      currentId: this.isActive() ? this.currentId() : null,
      position: this.position(),
      currentDuration: this.duration(),
      history: this.history(),
    }),
  );

  private player?: YTPlayer;

  private playerPending?: Promise<YTPlayer>;

  private host?: HTMLElement;

  private timer?: ReturnType<typeof setInterval>;

  /** Élément qui accueille le lecteur visible (fourni par le mini-lecteur). */
  attachHost(element: HTMLElement) {
    this.host = element;
  }

  /** Met à jour l'heure utilisée pour l'aperçu quand rien ne joue. */
  refreshClock() {
    this.clock.set(new Date());
  }

  /** Lance un titre précis, ou reprend la lecture ; sans précision, démarre au début de la playlist. */
  async play(trackId?: string) {
    const tracks = this.music.tracks();
    if (!tracks.length) {
      return;
    }
    const target = trackId ?? this.currentId() ?? tracks[0].id;

    if (target === this.currentId() && this.player) {
      if (this.status() === 'paused') {
        this.player.playVideo();
        return;
      }
      if (this.status() === 'playing' || this.status() === 'loading') {
        return;
      }
    }
    await this.start(target);
  }

  pause() {
    if (this.status() === 'playing') {
      this.player?.pauseVideo();
      this.status.set('paused');
    }
  }

  /** Lecture ou pause selon l'état. */
  toggle() {
    return this.status() === 'playing' ? Promise.resolve(this.pause()) : this.play();
  }

  async next() {
    const tracks = this.music.tracks();
    const index = this.currentIndex();
    if (index !== -1 && index < tracks.length - 1) {
      await this.start(tracks[index + 1].id);
    } else {
      this.stop();
    }
  }

  async previous() {
    const tracks = this.music.tracks();
    const index = this.currentIndex();
    if (index > 0 && this.position() <= RESTART_THRESHOLD) {
      await this.start(tracks[index - 1].id);
    } else {
      this.seek(0);
    }
  }

  seek(seconds: number) {
    this.player?.seekTo(seconds, true);
    this.position.set(seconds);
  }

  stop() {
    this.archiveCurrent();
    this.player?.stopVideo();
    this.stopTimer();
    this.currentId.set(null);
    this.status.set('idle');
    this.position.set(0);
    this.duration.set(0);
    this.message.set(null);
    this.history.set([]);
    this.refreshClock();
  }

  private async start(id: string) {
    const track = this.music.tracks().find((t) => t.id === id);
    if (!track) {
      return;
    }

    this.archiveCurrent();
    this.currentId.set(id);
    this.position.set(0);
    this.duration.set(track.duration ?? 0);
    this.status.set('loading');
    this.message.set(null);
    this.startTimer();

    try {
      if (this.player) {
        this.player.loadVideoById(track.videoId);
      } else {
        await this.createPlayer(track);
      }
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'Lecture impossible.');
    }
  }

  private createPlayer(track: MusicTrack): Promise<YTPlayer> {
    this.playerPending ??= (async () => {
      const host = this.host ?? this.fallbackHost();
      const target = document.createElement('div');
      host.appendChild(target);
      const player = await this.youtube.createPlayer(target, {
        width: '100%',
        height: '100%',
        videoId: track.videoId,
        playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
        events: {
          onStateChange: (event) => this.onState(event),
          onError: () => this.onError(),
        },
      });
      this.player = player;
      return player;
    })().catch((error) => {
      this.playerPending = undefined;
      throw error;
    });
    return this.playerPending;
  }

  /** Hôte de secours quand aucun mini-lecteur n'est affiché. */
  private fallbackHost(): HTMLElement {
    const host = document.createElement('div');
    host.style.cssText =
      'position:fixed;right:16px;bottom:16px;width:220px;height:124px;z-index:1000';
    document.body.appendChild(host);
    this.host = host;
    return host;
  }

  private onState(event: YTPlayerEvent) {
    switch (event.data) {
      case YT_STATE.PLAYING: {
        this.status.set('playing');
        const seconds = event.target.getDuration();
        if (seconds > 0) {
          this.duration.set(seconds);
          const id = this.currentId();
          if (id) {
            void this.music.setDuration(id, seconds);
          }
        }
        break;
      }
      case YT_STATE.PAUSED:
        if (this.status() === 'playing') {
          this.status.set('paused');
        }
        break;
      case YT_STATE.ENDED:
        this.finishCurrent();
        break;
    }
  }

  private onError() {
    this.fail('Cette vidéo ne peut pas être lue ici (intégration refusée ou vidéo indisponible).');
    if (this.hasNext()) {
      setTimeout(() => void this.next(), SKIP_DELAY);
    }
  }

  private fail(message: string) {
    this.status.set('error');
    this.message.set(message);
  }

  /** Fin naturelle d'un titre : on l'enregistre avec sa durée complète puis on passe au suivant. */
  private finishCurrent() {
    this.position.set(this.duration());
    void this.next();
  }

  private archiveCurrent() {
    const id = this.currentId();
    if (id && this.position() > 1) {
      const end = Date.now();
      this.history.update((h) => [...h, { trackId: id, start: end - this.position() * 1000, end }]);
    }
  }

  private startTimer() {
    this.timer ??= setInterval(() => {
      this.refreshClock();
      if (this.status() === 'playing' && this.player) {
        this.position.set(this.player.getCurrentTime());
      }
    }, 1000);
  }

  private stopTimer() {
    clearInterval(this.timer);
    this.timer = undefined;
  }
}
