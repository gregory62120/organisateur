import { TestBed } from '@angular/core/testing';

import { YoutubeService } from './youtube.service';
import { YTPlayer, YTPlayerOptions } from './youtube-api.types';

function fakeYt(durations: number[]) {
  const created: { options: YTPlayerOptions; player: YTPlayer }[] = [];
  const queue = [...durations];
  class Player {
    destroy = vi.fn();
    getDuration = vi.fn(() => (queue.length > 1 ? (queue.shift() as number) : (queue[0] ?? 0)));
    constructor(
      public element: HTMLElement,
      options: YTPlayerOptions,
    ) {
      created.push({ options, player: this as unknown as YTPlayer });
      setTimeout(() =>
        options.events?.onReady?.({ data: -1, target: this as unknown as YTPlayer }),
      );
    }
  }
  window.YT = { Player } as unknown as NonNullable<typeof window.YT>;
  return created;
}

describe('YoutubeService', () => {
  let service: YoutubeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(YoutubeService);
  });

  afterEach(() => {
    delete window.YT;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('metadata', () => {
    it('lit le titre et l’auteur via oEmbed', async () => {
      const fetchMock = vi.fn(async () => ({
        ok: true,
        json: async () => ({ title: 'Lo-fi beats', author_name: 'Chillhop' }),
      }));
      vi.stubGlobal('fetch', fetchMock);

      expect(await service.metadata('dQw4w9WgXcQ')).toEqual({
        title: 'Lo-fi beats',
        author: 'Chillhop',
      });
      const url = (fetchMock.mock.calls[0] as unknown as [string])[0];
      expect(url).toContain('youtube.com/oembed');
      expect(decodeURIComponent(url)).toContain('watch?v=dQw4w9WgXcQ');
    });

    it('donne un titre par défaut quand YouTube n’en renvoie pas', async () => {
      vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => ({}) }));

      expect((await service.metadata('dQw4w9WgXcQ')).title).toBe('Vidéo dQw4w9WgXcQ');
    });

    it('signale une vidéo introuvable', async () => {
      vi.stubGlobal('fetch', async () => ({ ok: false, json: async () => ({}) }));

      await expect(service.metadata('dQw4w9WgXcQ')).rejects.toThrow('introuvable');
    });

    it('signale un YouTube injoignable', async () => {
      vi.stubGlobal('fetch', async () => {
        throw new TypeError('network');
      });

      await expect(service.metadata('dQw4w9WgXcQ')).rejects.toThrow('injoignable');
    });
  });

  describe('duration', () => {
    it('lit la durée avec un lecteur invisible puis le détruit', async () => {
      const created = fakeYt([0, 0, 213]);

      const seconds = await service.duration('dQw4w9WgXcQ');

      expect(seconds).toBe(213);
      expect(created).toHaveLength(1);
      expect(created[0].options.videoId).toBe('dQw4w9WgXcQ');
      expect(created[0].player.destroy).toHaveBeenCalled();
      expect(document.body.querySelector('[style*="-9999px"]')).toBeNull();
    });

    it('renvoie undefined si la durée n’est jamais disponible', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
      fakeYt([0]);

      const pending = service.duration('dQw4w9WgXcQ');
      await vi.advanceTimersByTimeAsync(9000);

      expect(await pending).toBeUndefined();
    });

    it('renvoie undefined si l’API est indisponible', async () => {
      window.YT = {
        Player: class {
          constructor() {
            throw new Error('boom');
          }
        },
      } as unknown as NonNullable<typeof window.YT>;

      expect(await service.duration('dQw4w9WgXcQ')).toBeUndefined();
    });
  });

  describe('loadApi', () => {
    it('réutilise l’API déjà chargée', async () => {
      fakeYt([1]);

      expect(await service.loadApi()).toBe(window.YT);
    });

    it('injecte le script une seule fois et résout au signal de YouTube', async () => {
      const promise = service.loadApi();
      const again = service.loadApi();
      expect(document.head.querySelectorAll('script[src*="youtube.com/iframe_api"]')).toHaveLength(
        1,
      );

      fakeYt([1]);
      window.onYouTubeIframeAPIReady?.();

      expect(await promise).toBe(window.YT);
      expect(await again).toBe(window.YT);
      document.head
        .querySelectorAll('script[src*="youtube.com/iframe_api"]')
        .forEach((s) => s.remove());
    });
  });

  it('crée un lecteur visible', async () => {
    const created = fakeYt([1]);
    const element = document.createElement('div');

    const player = await service.createPlayer(element, { videoId: 'abc', width: 220 });

    expect(player).toBe(created[0].player);
    expect(created[0].options.width).toBe(220);
  });
});
