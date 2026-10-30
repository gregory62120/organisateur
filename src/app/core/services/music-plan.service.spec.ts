import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MusicSlot } from '../models/music.model';
import { MusicPlanService } from './music-plan.service';
import { StorageService } from './storage.service';

describe('MusicPlanService', () => {
  let service: MusicPlanService;
  let files: Map<string, string>;
  const saved = (): MusicSlot[] => JSON.parse(files.get('music-plan.json') ?? '[]');

  beforeEach(() => {
    files = new Map();
    TestBed.configureTestingModule({
      providers: [
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
    service = TestBed.inject(MusicPlanService);
  });

  it('place une musique à l’heure demandée, calée sur 5 minutes, et écrit music-plan.json', async () => {
    await service.add('t1', '2026-10-30', 9 * 60 + 12);

    expect(saved()).toEqual([
      expect.objectContaining({ trackId: 't1', date: '2026-10-30', startTime: '09:10' }),
    ]);
  });

  it('autorise la même musique plusieurs fois dans la journée', async () => {
    await service.add('t1', '2026-10-30', 540);
    await service.add('t1', '2026-10-30', 840);

    expect(saved().map((s) => s.startTime)).toEqual(['09:00', '14:00']);
    expect(new Set(saved().map((s) => s.id)).size).toBe(2);
  });

  it('déplace une musique, sans toucher aux autres, y compris vers un autre jour', async () => {
    await service.add('t1', '2026-10-30', 540);
    await service.add('t2', '2026-10-30', 600);
    const id = saved()[0].id;

    await service.move(id, '2026-10-31', 14 * 60 + 2);

    expect(saved()[0]).toMatchObject({ date: '2026-10-31', startTime: '14:00' });
    expect(saved()[1]).toMatchObject({ date: '2026-10-30', startTime: '10:00' });
  });

  it('retire un placement', async () => {
    await service.add('t1', '2026-10-30', 540);
    await service.add('t2', '2026-10-30', 600);

    await service.remove(saved()[0].id);

    expect(saved().map((s) => s.trackId)).toEqual(['t2']);
  });

  it('retire tous les placements d’une musique, sans écrire si elle n’en a pas', async () => {
    await service.add('t1', '2026-10-30', 540);
    await service.add('t1', '2026-10-31', 540);
    await service.add('t2', '2026-10-30', 600);

    await service.removeForTrack('t1');
    expect(saved().map((s) => s.trackId)).toEqual(['t2']);

    files.set('music-plan.json', 'inchangé');
    await service.removeForTrack('inconnue');
    expect(files.get('music-plan.json')).toBe('inchangé');
  });

  it('charge le fichier, ou repart de zéro s’il est absent', async () => {
    files.set(
      'music-plan.json',
      JSON.stringify([{ id: 'x', trackId: 't', date: '2026-10-30', startTime: '10:00' }]),
    );
    await service.load();
    expect(service.slots().map((s) => s.id)).toEqual(['x']);

    files.delete('music-plan.json');
    await service.load();
    expect(service.slots()).toEqual([]);
  });

  it('remplace la planification en mémoire sans écrire', () => {
    service.updateSlots([{ id: 'z', trackId: 't', date: '2026-10-30', startTime: '10:00' }]);

    expect(service.slots()).toHaveLength(1);
    expect(files.has('music-plan.json')).toBe(false);
  });
});
