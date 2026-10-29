import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { Task } from '../models/task.model';
import { StorageService } from './storage.service';
import { TaskService } from './task.service';

describe('TaskService', () => {
  let service: TaskService;
  let files: Map<string, string>;
  let write: ReturnType<typeof vi.fn>;
  let open: ReturnType<typeof signal<boolean>>;
  let opened: ReturnType<typeof signal<number>>;

  const saved = (): Task[] => JSON.parse(files.get('tasks.json') ?? '[]');

  const task = (id: string, overrides: Partial<Task> = {}): Task => ({
    ...service.createEmpty(),
    id,
    title: id,
    ...overrides,
  });

  beforeEach(() => {
    files = new Map();
    open = signal(true);
    opened = signal(0);
    write = vi.fn(async (path: string, content: string) => {
      files.set(path, content);
    });

    TestBed.configureTestingModule({
      providers: [
        {
          provide: StorageService,
          useValue: {
            isOpen: open,
            projectOpened: opened,
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
    service = TestBed.inject(TaskService);
  });

  it('crée une tâche vide avec des valeurs par défaut', () => {
    const empty = service.createEmpty();
    expect(empty.status).toBe('TODO');
    expect(empty.priority).toBe('MEDIUM');
    expect(empty.checklist).toEqual([]);
    expect(empty.id).toBeTruthy();
  });

  it('add écrit la tâche dans tasks.json', async () => {
    await service.add(task('a'));

    expect(service.tasksSignal().map((t) => t.id)).toEqual(['a']);
    expect(saved().map((t) => t.id)).toEqual(['a']);
  });

  it('update ne modifie que la tâche ciblée et met à jour updatedAt', async () => {
    await service.add(task('a', { updatedAt: '2020-01-01T00:00:00.000Z' }));
    await service.add(task('b'));

    await service.update({ ...service.tasksSignal()[0], title: 'Nouveau titre' });

    const [a, b] = saved();
    expect(a.title).toBe('Nouveau titre');
    expect(a.updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
    expect(b.title).toBe('b');
  });

  it('delete retire la tâche du fichier', async () => {
    await service.add(task('a'));
    await service.add(task('b'));

    await service.delete('a');

    expect(saved().map((t) => t.id)).toEqual(['b']);
  });

  it('move change le statut et persiste', async () => {
    await service.add(task('a'));

    await service.move('a', 'DONE');

    expect(saved()[0].status).toBe('DONE');
  });

  describe('moveTo', () => {
    beforeEach(async () => {
      await service.add(task('t1', { status: 'TODO' }));
      await service.add(task('t2', { status: 'TODO' }));
      await service.add(task('p1', { status: 'IN_PROGRESS' }));
      await service.add(task('p2', { status: 'IN_PROGRESS' }));
    });

    it('insère la tâche à la position demandée dans la colonne cible', async () => {
      await service.moveTo('t1', 'IN_PROGRESS', 1);

      const column = saved().filter((t) => t.status === 'IN_PROGRESS');
      expect(column.map((t) => t.id)).toEqual(['p1', 't1', 'p2']);
    });

    it('place la tâche en fin de colonne si l’index dépasse', async () => {
      await service.moveTo('t1', 'IN_PROGRESS', 10);

      const column = saved().filter((t) => t.status === 'IN_PROGRESS');
      expect(column.map((t) => t.id)).toEqual(['p1', 'p2', 't1']);
    });

    it('insère dans une colonne vide', async () => {
      await service.moveTo('t1', 'DONE', 0);

      expect(saved().find((t) => t.id === 't1')?.status).toBe('DONE');
    });

    it('réordonne dans la même colonne sans changer updatedAt', async () => {
      const before = service.tasksSignal().find((t) => t.id === 't1')!.updatedAt;

      await service.moveTo('t1', 'TODO', 1);

      const column = saved().filter((t) => t.status === 'TODO');
      expect(column.map((t) => t.id)).toEqual(['t2', 't1']);
      expect(column.find((t) => t.id === 't1')!.updatedAt).toBe(before);
    });

    it('ignore une tâche inconnue', async () => {
      write.mockClear();

      await service.moveTo('inconnue', 'DONE', 0);

      expect(write).not.toHaveBeenCalled();
    });
  });

  it('enchaîne les écritures rapides sans perdre de modification', async () => {
    service.add(task('a'));
    service.add(task('b'));
    await service.add(task('c'));

    expect(saved().map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('expose une erreur si aucun projet n’est ouvert', async () => {
    open.set(false);

    await service.add(task('a'));

    expect(service.error()).toContain('Aucun projet ouvert');
    expect(write).not.toHaveBeenCalled();
  });

  it('expose une erreur si l’écriture échoue puis la réinitialise', async () => {
    write.mockRejectedValueOnce(new Error('disque plein'));
    await service.add(task('a'));
    expect(service.error()).toBe('disque plein');

    await service.add(task('b'));
    expect(service.error()).toBeNull();
  });

  describe('loadTask', () => {
    it('charge les tâches du fichier', async () => {
      files.set('tasks.json', JSON.stringify([task('x')]));

      await service.loadTask();

      expect(service.tasksSignal().map((t) => t.id)).toEqual(['x']);
    });

    it('repart d’une liste vide quand tasks.json n’existe pas', async () => {
      await service.add(task('a'));
      files.delete('tasks.json');

      await service.loadTask();

      expect(service.tasksSignal()).toEqual([]);
      expect(service.error()).toBeNull();
    });

    it('n’écrase pas un tasks.json illisible', async () => {
      files.set('tasks.json', '{ pas du json');

      await service.loadTask();
      expect(service.error()).toContain('illisible');

      write.mockClear();
      await service.add(task('a'));
      expect(write).not.toHaveBeenCalled();
      expect(files.get('tasks.json')).toBe('{ pas du json');
    });
  });

  describe('projectProgress', () => {
    it('vaut 0 sans tâche', () => {
      expect(service.projectProgress()).toBe(0);
    });

    it('pondère terminé 100, en cours 50, le reste 0', async () => {
      await service.add(task('a', { status: 'DONE' }));
      await service.add(task('b', { status: 'IN_PROGRESS' }));
      await service.add(task('c', { status: 'TODO' }));
      await service.add(task('d', { status: 'VALIDATION' }));

      expect(service.projectProgress()).toBe(38);
    });
  });
});
