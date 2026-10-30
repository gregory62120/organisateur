import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MusicTrack } from '../models/music.model';
import { MusicPlayerService } from './music-player.service';
import { MusicService } from './music.service';
import { YoutubeService } from './youtube.service';
import { YT_STATE, YTPlayer, YTPlayerOptions } from './youtube-api.types';

const track = (letter: string, duration?: number): MusicTrack => ({
  id: letter,
  videoId: letter.repeat(11),
  title: `Titre ${letter}`,
  duration,
  addedAt: '2026-01-01T00:00:00.000Z',
});

describe('MusicPlayerService', () => {
  const tracks = signal<MusicTrack[]>([]);
  const music = { tracks, setDuration: vi.fn(async () => undefined) };
  let player: {
    [K in keyof YTPlayer]: ReturnType<typeof vi.fn>;
  };
  let options: YTPlayerOptions;
  const youtube = {
    createPlayer: vi.fn(async (_el: HTMLElement, opts: YTPlayerOptions) => {
      options = opts;
      return player as unknown as YTPlayer;
    }),
  };
  let service: MusicPlayerService;

  /** Simule un événement envoyé par le lecteur YouTube. */
  const emit = (state: number) =>
    options.events!.onStateChange!({ data: state, target: player as unknown as YTPlayer });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearInterval', 'Date'] });
    vi.setSystemTime(new Date(2026, 9, 29, 10, 0, 0));
    vi.clearAllMocks();
    tracks.set([track('a', 180), track('b', 240), track('c')]);
    player = {
      loadVideoById: vi.fn(),
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      stopVideo: vi.fn(),
      seekTo: vi.fn(),
      getDuration: vi.fn(() => 181),
      getCurrentTime: vi.fn(() => 0),
      destroy: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: MusicService, useValue: music },
        { provide: YoutubeService, useValue: youtube },
      ],
    });
    service = TestBed.inject(MusicPlayerService);
  });

  afterEach(() => {
    service.stop();
    vi.useRealTimers();
    document.body.querySelectorAll('div[style*="position:fixed"]').forEach((e) => e.remove());
  });

  it('est à l’arrêt au départ, avec un aperçu de la playlist', () => {
    expect(service.status()).toBe('idle');
    expect(service.current()).toBeUndefined();
    expect(service.schedule().map((s) => s.status)).toEqual(['preview', 'preview', 'preview']);
  });

  describe('lecture', () => {
    it('lance le premier titre avec un lecteur créé à la demande', async () => {
      await service.play();

      expect(youtube.createPlayer).toHaveBeenCalledTimes(1);
      expect(options.videoId).toBe('a'.repeat(11));
      expect(options.playerVars).toMatchObject({ autoplay: 1 });
      expect(service.status()).toBe('loading');
      expect(service.currentId()).toBe('a');
    });

    it('utilise l’élément fourni par le mini-lecteur comme hôte', async () => {
      const host = document.createElement('div');
      service.attachHost(host);

      await service.play();

      expect(host.children).toHaveLength(1);
    });

    it('passe en lecture, lit la durée réelle et l’enregistre', async () => {
      await service.play();
      emit(YT_STATE.PLAYING);

      expect(service.status()).toBe('playing');
      expect(service.duration()).toBe(181);
      expect(music.setDuration).toHaveBeenCalledWith('a', 181);
    });

    it('lance un titre précis, puis charge les suivants dans le même lecteur', async () => {
      await service.play('b');
      await service.play('a');

      expect(youtube.createPlayer).toHaveBeenCalledTimes(1);
      expect(player.loadVideoById).toHaveBeenCalledWith('a'.repeat(11));
      expect(service.currentId()).toBe('a');
    });

    it('ne fait rien avec une playlist vide', async () => {
      tracks.set([]);

      await service.play();

      expect(youtube.createPlayer).not.toHaveBeenCalled();
      expect(service.status()).toBe('idle');
    });

    it('met en pause et reprend sans recharger le titre', async () => {
      await service.play();
      emit(YT_STATE.PLAYING);

      service.pause();
      expect(player.pauseVideo).toHaveBeenCalled();
      expect(service.status()).toBe('paused');

      await service.play();
      expect(player.playVideo).toHaveBeenCalled();
      expect(player.loadVideoById).not.toHaveBeenCalled();
    });

    it('bascule entre lecture et pause avec toggle', async () => {
      await service.toggle();
      emit(YT_STATE.PLAYING);
      await service.toggle();
      expect(service.status()).toBe('paused');

      await service.toggle();
      expect(player.playVideo).toHaveBeenCalled();
    });

    it('suit la pause déclenchée depuis le lecteur YouTube', async () => {
      await service.play();
      emit(YT_STATE.PLAYING);

      emit(YT_STATE.PAUSED);

      expect(service.status()).toBe('paused');
    });

    it('met à jour la position chaque seconde pendant la lecture', async () => {
      await service.play();
      emit(YT_STATE.PLAYING);
      player.getCurrentTime.mockReturnValue(42);

      await vi.advanceTimersByTimeAsync(1000);

      expect(service.position()).toBe(42);
    });
  });

  describe('enchaînement', () => {
    it('passe au titre suivant à la fin d’un titre', async () => {
      await service.play();
      emit(YT_STATE.PLAYING);

      emit(YT_STATE.ENDED);
      await vi.advanceTimersByTimeAsync(0);

      expect(service.currentId()).toBe('b');
      expect(player.loadVideoById).toHaveBeenCalledWith('b'.repeat(11));
    });

    it('s’arrête à la fin de la playlist', async () => {
      await service.play('c');
      emit(YT_STATE.PLAYING);

      emit(YT_STATE.ENDED);
      await vi.advanceTimersByTimeAsync(0);

      expect(service.status()).toBe('idle');
      expect(service.currentId()).toBeNull();
    });

    it('next et previous naviguent dans la playlist', async () => {
      await service.play('b');
      await service.next();
      expect(service.currentId()).toBe('c');
      expect(service.hasNext()).toBe(false);

      await service.previous();
      expect(service.currentId()).toBe('b');
      expect(service.hasPrevious()).toBe(true);
    });

    it('previous relance le titre au-delà de quelques secondes ou au premier titre', async () => {
      await service.play('b');
      service.position.set(30);

      await service.previous();
      expect(service.currentId()).toBe('b');
      expect(player.seekTo).toHaveBeenCalledWith(0, true);

      await service.play('a');
      await service.previous();
      expect(service.currentId()).toBe('a');
    });

    it('next à la fin arrête la lecture', async () => {
      await service.play('c');

      await service.next();

      expect(service.status()).toBe('idle');
    });
  });

  describe('erreurs', () => {
    it('signale une vidéo illisible puis passe à la suivante', async () => {
      await service.play();

      options.events!.onError!({ data: 150, target: player as unknown as YTPlayer });
      expect(service.status()).toBe('error');
      expect(service.message()).toContain('ne peut pas être lue');

      await vi.advanceTimersByTimeAsync(2000);
      expect(service.currentId()).toBe('b');
    });

    it('signale l’échec de création du lecteur et peut réessayer', async () => {
      youtube.createPlayer.mockRejectedValueOnce(new Error('Impossible de charger le lecteur'));

      await service.play();
      expect(service.status()).toBe('error');
      expect(service.message()).toContain('Impossible de charger');

      await service.play('b');
      expect(service.status()).toBe('loading');
      expect(youtube.createPlayer).toHaveBeenCalledTimes(2);
    });
  });

  describe('planning de la journée', () => {
    it('place le titre en cours sur sa position et les suivants à la suite', async () => {
      await service.play();
      emit(YT_STATE.PLAYING);
      player.getCurrentTime.mockReturnValue(60);
      await vi.advanceTimersByTimeAsync(1000);

      const schedule = service.schedule();

      expect(schedule.map((s) => [s.track.id, s.status])).toEqual([
        ['a', 'current'],
        ['b', 'upcoming'],
        ['c', 'upcoming'],
      ]);
      // Position de 60 s : le titre a commencé une minute avant l'instant courant.
      expect(schedule[0].start.getTime()).toBe(Date.now() - 60_000);
      // La durée réelle lue par le lecteur (181 s) l'emporte sur celle enregistrée (180 s).
      expect(schedule[0].end.getTime() - schedule[0].start.getTime()).toBe(181_000);
    });

    it('garde en mémoire les titres écoutés avec leurs heures réelles', async () => {
      await service.play();
      emit(YT_STATE.PLAYING);
      player.getCurrentTime.mockReturnValue(100);
      await vi.advanceTimersByTimeAsync(1000);

      await service.next();

      expect(service.history()).toHaveLength(1);
      expect(service.history()[0]).toMatchObject({ trackId: 'a' });
      expect(service.schedule().map((s) => [s.track.id, s.status])[0]).toEqual(['a', 'played']);
    });

    it('n’enregistre pas un titre quitté dès le départ', async () => {
      await service.play();

      await service.next();

      expect(service.history()).toEqual([]);
    });

    it('revient à l’aperçu et oublie la session à l’arrêt', async () => {
      await service.play();
      emit(YT_STATE.PLAYING);
      player.getCurrentTime.mockReturnValue(30);
      await vi.advanceTimersByTimeAsync(1000);

      service.stop();

      expect(player.stopVideo).toHaveBeenCalled();
      expect(service.history()).toEqual([]);
      expect(service.schedule().every((s) => s.status === 'preview')).toBe(true);
    });
  });
});
