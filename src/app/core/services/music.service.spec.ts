import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MusicTrack } from '../models/music.model';
import { MusicPlanService } from './music-plan.service';
import { MusicService } from './music.service';
import { StorageService } from './storage.service';
import { YoutubeService } from './youtube.service';

describe('MusicService', () => {
  let service: MusicService;
  let files: Map<string, string>;
  const youtube = { metadata: vi.fn(), duration: vi.fn() };
  const saved = (): MusicTrack[] => JSON.parse(files.get('music.json') ?? '[]');

  beforeEach(() => {
    vi.clearAllMocks();
    files = new Map();
    youtube.metadata.mockResolvedValue({ title: 'Lo-fi beats', author: 'Chillhop' });
    youtube.duration.mockResolvedValue(213);

    TestBed.configureTestingModule({
      providers: [
        { provide: YoutubeService, useValue: youtube },
        {
          provide: StorageService,
          useValue: {
            isOpen: signal(true),
            projectOpened: signal(0),
            write: async (path: string, content: string) => void files.set(path, content),
            read: async (path: string) => {
              if (!files.has(path)) throw new DOMException('absent', 'NotFoundError');
              return files.get(path);
            },
          },
        },
      ],
    });
    service = TestBed.inject(MusicService);
  });

  const add = (id = 'dQw4w9WgXcQ') => service.addFromUrl(`https://youtu.be/${id}`);

  describe('addFromUrl', () => {
    it('ajoute la vidéo avec son titre, son auteur et sa durée, puis écrit music.json', async () => {
      const result = await add();

      expect(result.ok).toBe(true);
      expect(saved()).toEqual([
        expect.objectContaining({
          videoId: 'dQw4w9WgXcQ',
          title: 'Lo-fi beats',
          author: 'Chillhop',
          duration: 213,
        }),
      ]);
    });

    it('refuse un lien qui n’est pas YouTube sans appeler le réseau', async () => {
      const result = await service.addFromUrl('https://example.com');

      expect(result).toEqual({ ok: false, error: "Ce lien n'est pas une vidéo YouTube." });
      expect(youtube.metadata).not.toHaveBeenCalled();
    });

    it('refuse une vidéo déjà présente', async () => {
      await add();

      const result = await add();

      expect(result).toMatchObject({ ok: false, error: expect.stringContaining('déjà') });
      expect(service.tracks()).toHaveLength(1);
    });

    it('relaie l’erreur de YouTube sans rien ajouter', async () => {
      youtube.metadata.mockRejectedValue(new Error('Vidéo introuvable, privée ou non intégrable.'));

      const result = await add();

      expect(result).toEqual({
        ok: false,
        error: 'Vidéo introuvable, privée ou non intégrable.',
      });
      expect(service.tracks()).toEqual([]);
    });

    it('ajoute la vidéo même si sa durée est illisible', async () => {
      youtube.duration.mockResolvedValue(undefined);

      const result = await add();

      expect(result.ok).toBe(true);
      expect(service.tracks()[0].duration).toBeUndefined();
    });
  });

  describe('gestion de la liste', () => {
    beforeEach(async () => {
      await add('aaaaaaaaaaa');
      await add('bbbbbbbbbbb');
      await add('ccccccccccc');
    });

    const ids = () => saved().map((t) => t.videoId[0]);
    const idOf = (letter: string) => service.tracks().find((t) => t.videoId[0] === letter)!.id;

    it('retire un titre', async () => {
      await service.remove(idOf('b'));

      expect(ids()).toEqual(['a', 'c']);
    });

    it('retire aussi ses placements sur le calendrier', async () => {
      const plan = TestBed.inject(MusicPlanService);
      await plan.add(idOf('b'), '2026-10-30', 600);
      await plan.add(idOf('c'), '2026-10-30', 660);

      await service.remove(idOf('b'));

      expect(plan.slots().map((s) => s.trackId)).toEqual([idOf('c')]);
    });

    it('déplace un titre vers le haut ou le bas', async () => {
      await service.move(idOf('c'), -1);
      expect(ids()).toEqual(['a', 'c', 'b']);

      await service.move(idOf('a'), 1);
      expect(ids()).toEqual(['c', 'a', 'b']);
    });

    it('ne déplace pas au-delà des extrémités', async () => {
      await service.move(idOf('a'), -1);
      await service.move(idOf('c'), 1);

      expect(ids()).toEqual(['a', 'b', 'c']);
    });
  });

  describe('setDuration', () => {
    it('enregistre une durée nouvelle ou corrigée', async () => {
      youtube.duration.mockResolvedValue(undefined);
      await add();
      const id = service.tracks()[0].id;

      await service.setDuration(id, 200.4);
      expect(saved()[0].duration).toBe(200);

      await service.setDuration(id, 250);
      expect(saved()[0].duration).toBe(250);
    });

    it('n’écrit pas quand la durée est identique, invalide ou le titre inconnu', async () => {
      await add();
      const id = service.tracks()[0].id;
      const before = files.get('music.json');
      files.set('music.json', before + ' ');

      await service.setDuration(id, 213.4);
      await service.setDuration(id, 0);
      await service.setDuration(id, NaN);
      await service.setDuration('inconnu', 100);

      expect(files.get('music.json')).toBe(before + ' ');
    });
  });

  it('charge la playlist du fichier, ou repart de zéro si absent', async () => {
    files.set('music.json', JSON.stringify([{ id: 'x', videoId: 'xxxxxxxxxxx', title: 'X' }]));
    await service.load();
    expect(service.tracks().map((t) => t.id)).toEqual(['x']);

    files.delete('music.json');
    await service.load();
    expect(service.tracks()).toEqual([]);
  });

  it('remplace la playlist en mémoire sans écrire', () => {
    service.updateTracks([{ id: 'z', videoId: 'zzzzzzzzzzz', title: 'Z', addedAt: '' }]);

    expect(service.tracks()).toHaveLength(1);
    expect(files.has('music.json')).toBe(false);
  });
});
