import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ProjectEvent } from '../models/event.model';
import { EventService } from './event.service';
import { StorageService } from './storage.service';

describe('EventService', () => {
  let service: EventService;
  let files: Map<string, string>;
  let write: ReturnType<typeof vi.fn>;
  const saved = (): ProjectEvent[] => JSON.parse(files.get('events.json') ?? '[]');

  const event = (id: string, overrides: Partial<ProjectEvent> = {}): ProjectEvent => ({
    ...service.createEmpty('2026-10-20'),
    id,
    title: id,
    ...overrides,
  });

  beforeEach(() => {
    files = new Map();
    write = vi.fn(async (path: string, content: string) => {
      files.set(path, content);
    });

    TestBed.configureTestingModule({
      providers: [
        {
          provide: StorageService,
          useValue: {
            isOpen: signal(true),
            projectOpened: signal(0),
            write,
            read: async (path: string) => {
              if (!files.has(path)) {
                throw new DOMException('absent', 'NotFoundError');
              }
              return files.get(path);
            },
          },
        },
      ],
    });
    service = TestBed.inject(EventService);
  });

  it('crée un évènement vide sur toute la journée à la date donnée', () => {
    const empty = service.createEmpty('2026-10-20');

    expect(empty).toMatchObject({ date: '2026-10-20', title: '', color: 'blue' });
    expect(empty.startTime).toBeUndefined();
    expect(empty.id).toBeTruthy();
  });

  it('écrit dans events.json à chaque ajout, modification et suppression', async () => {
    await service.add(event('a'));
    await service.add(event('b'));
    expect(saved().map((e) => e.id)).toEqual(['a', 'b']);

    await service.update({ ...service.eventsSignal()[0], title: 'Renommé' });
    expect(saved()[0].title).toBe('Renommé');
    expect(saved()[1].title).toBe('b');

    await service.delete('a');
    expect(saved().map((e) => e.id)).toEqual(['b']);
    expect(write).toHaveBeenCalledWith('events.json', expect.any(String));
  });

  it('charge les évènements du fichier, ou repart de zéro si absent', async () => {
    files.set('events.json', JSON.stringify([event('x')]));
    await service.load();
    expect(service.eventsSignal().map((e) => e.id)).toEqual(['x']);

    files.delete('events.json');
    await service.load();
    expect(service.eventsSignal()).toEqual([]);
  });

  it('n’écrase pas un events.json illisible', async () => {
    files.set('events.json', '{ pas du json');
    await service.load();
    expect(service.error()).toContain('events.json est illisible');

    write.mockClear();
    await service.add(event('a'));

    expect(write).not.toHaveBeenCalled();
  });

  it('remplace les évènements en mémoire sans écrire', () => {
    service.updateEvents([event('z')]);

    expect(service.eventsSignal().map((e) => e.id)).toEqual(['z']);
    expect(write).not.toHaveBeenCalled();
  });

  it('crée un évènement d’une heure quand on donne l’heure de départ', () => {
    expect(service.createEmpty('2026-10-20', '14:30')).toMatchObject({
      startTime: '14:30',
      endTime: '15:30',
    });
    expect(service.createEmpty('2026-10-20', '23:30')).toMatchObject({
      startTime: '23:30',
      endTime: '23:59',
    });
  });
});
