import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Task } from '../../core/models/task.model';
import { StorageService } from '../../core/services/storage.service';
import { TaskService } from '../../core/services/task.service';
import { KanbanComponent } from './kanban';
import { TaskDialogService } from './services/task-dialog.service';

function makeTask(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    tags: [],
    checklist: [],
    comments: [],
    attachments: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('KanbanComponent', () => {
  const tasks = signal<Task[]>([]);
  const taskService = {
    tasksSignal: tasks.asReadonly(),
    moveTo: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    createEmpty: () => makeTask('new', { title: 'Nouvelle tâche' }),
  };
  const dialogs = { openTask: vi.fn(), openSubtask: vi.fn() };
  const storage = { isOpen: signal(true), root: signal({ name: 'Mon projet' }) };

  let kanban: KanbanComponent;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    tasks.set([
      makeTask('a', { priority: 'LOW', assignedTo: 'Sophie', tags: ['UI'], title: 'Zèbre' }),
      makeTask('b', { priority: 'HIGH', tags: ['API'], title: 'Alpha' }),
      makeTask('c', { status: 'DONE', priority: 'MEDIUM', title: 'Charlie' }),
      makeTask('d', { priority: 'MEDIUM', title: 'Delta', tags: ['UI'] }),
    ]);

    TestBed.configureTestingModule({
      providers: [
        { provide: TaskService, useValue: taskService },
        { provide: StorageService, useValue: storage },
        { provide: TaskDialogService, useValue: dialogs },
      ],
    });
    kanban = TestBed.runInInjectionContext(() => new KanbanComponent());
  });

  afterEach(() => vi.unstubAllGlobals());

  const ids = (status: keyof ReturnType<KanbanComponent['byStatus']>) =>
    kanban.byStatus()[status].map((t) => t.id);

  it('répartit les tâches par colonne', () => {
    expect(ids('TODO')).toEqual(['a', 'b', 'd']);
    expect(ids('DONE')).toEqual(['c']);
    expect(ids('IN_PROGRESS')).toEqual([]);
  });

  it('expose le nom du projet, les responsables et les étiquettes', () => {
    expect(kanban.projectName()).toBe('Mon projet');
    expect(kanban.assignees()).toEqual(['Sophie']);
    expect(kanban.tags()).toEqual(['API', 'UI']);
  });

  describe('filtres', () => {
    it('recherche dans le titre et les étiquettes', () => {
      kanban.search.set('alp');
      expect(ids('TODO')).toEqual(['b']);

      kanban.search.set('ui');
      expect(ids('TODO')).toEqual(['a', 'd']);
    });

    it('filtre par priorité, responsable et étiquette', () => {
      kanban.priorityFilter.set('HIGH');
      expect(ids('TODO')).toEqual(['b']);

      kanban.resetFilters();
      kanban.assigneeFilter.set('Sophie');
      expect(ids('TODO')).toEqual(['a']);

      kanban.resetFilters();
      kanban.tagFilter.set('UI');
      expect(ids('TODO')).toEqual(['a', 'd']);
    });

    it('combine les filtres et se réinitialise', () => {
      kanban.tagFilter.set('UI');
      kanban.priorityFilter.set('MEDIUM');
      expect(ids('TODO')).toEqual(['d']);
      expect(kanban.hasFilter()).toBe(true);

      kanban.resetFilters();
      expect(kanban.hasFilter()).toBe(false);
      expect(ids('TODO')).toEqual(['a', 'b', 'd']);
    });
  });

  describe('tri', () => {
    it('trie par priorité', () => {
      kanban.sort.set('priority');
      expect(ids('TODO')).toEqual(['b', 'd', 'a']);
    });

    it('trie par titre', () => {
      kanban.sort.set('title');
      expect(ids('TODO')).toEqual(['b', 'd', 'a']);
    });

    it('ne modifie pas la liste du service', () => {
      kanban.sort.set('title');
      kanban.byStatus();
      expect(tasks().map((t) => t.id)).toEqual(['a', 'b', 'c', 'd']);
    });
  });

  describe('drag & drop', () => {
    const dropEvent = (task: Task, currentIndex: number) =>
      ({ item: { data: task }, currentIndex }) as unknown as CdkDragDrop<Task[]>;

    it('déplace vers une autre colonne à la bonne position', () => {
      kanban.drop(dropEvent(tasks()[0], 0), 'DONE');

      expect(taskService.moveTo).toHaveBeenCalledWith('a', 'DONE', 0);
    });

    it('convertit l’index de la liste filtrée en index de la colonne complète', () => {
      tasks.update((list) => [
        ...list,
        makeTask('e', { status: 'DONE', title: 'Echo' }),
        makeTask('f', { status: 'DONE', title: 'Foxtrot', tags: ['UI'] }),
      ]);
      kanban.search.set('foxtrot');

      // Colonne visible : [f]. Déposer en position 0 => avant f, donc après c et e (index 2).
      kanban.drop(dropEvent(tasks()[0], 0), 'DONE');
      expect(taskService.moveTo).toHaveBeenLastCalledWith('a', 'DONE', 2);

      kanban.drop(dropEvent(tasks()[0], 1), 'DONE');
      expect(taskService.moveTo).toHaveBeenLastCalledWith('a', 'DONE', 3);
    });

    it('ignore le réordonnancement dans la même colonne quand un tri est actif', () => {
      kanban.sort.set('priority');

      kanban.drop(dropEvent(tasks()[0], 2), 'TODO');

      expect(taskService.moveTo).not.toHaveBeenCalled();
    });

    it('autorise le changement de colonne même avec un tri actif', () => {
      kanban.sort.set('priority');

      kanban.drop(dropEvent(tasks()[0], 0), 'IN_PROGRESS');

      expect(taskService.moveTo).toHaveBeenCalledWith('a', 'IN_PROGRESS', 0);
    });
  });

  describe('création, édition et suppression', () => {
    it('ouvre le dialogue en mode création avec le statut de la colonne', () => {
      kanban.addTask('IN_PROGRESS');

      const [task, isNew] = dialogs.openTask.mock.calls[0];
      expect(isNew).toBe(true);
      expect(task.status).toBe('IN_PROGRESS');
    });

    it('ouvre une tâche existante sans mode création', () => {
      kanban.open(tasks()[0]);

      expect(dialogs.openTask).toHaveBeenCalledWith(tasks()[0], false);
    });

    it('supprime après confirmation uniquement', () => {
      kanban.remove(tasks()[0]);
      expect(taskService.delete).toHaveBeenCalledWith('a');

      vi.stubGlobal(
        'confirm',
        vi.fn(() => false),
      );
      kanban.remove(tasks()[1]);
      expect(taskService.delete).toHaveBeenCalledTimes(1);
    });
  });

  it('coche une sous-tâche depuis la carte et enregistre la tâche', () => {
    const task = makeTask('s', {
      checklist: [
        { id: '1', label: 'a', completed: false },
        { id: '2', label: 'b', completed: true },
      ],
    });

    kanban.toggleSubtask(task, '1');
    kanban.toggleSubtask(task, '2');

    expect(taskService.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: 's',
        checklist: [
          { id: '1', label: 'a', completed: true },
          { id: '2', label: 'b', completed: true },
        ],
      }),
    );
    expect(taskService.update.mock.calls[1][0].checklist[1].completed).toBe(false);
  });

  it('ouvre le formulaire de la sous-tâche cliquée', () => {
    const task = makeTask('s', { checklist: [{ id: '1', label: 'a', completed: false }] });

    kanban.openSubtask(task, '1');

    expect(dialogs.openSubtask).toHaveBeenCalledWith(task, '1');
  });

  it('masque les tâches désactivées depuis le Gantt', () => {
    tasks.update((list) => list.map((t) => (t.id === 'b' ? { ...t, showInKanban: false } : t)));

    expect(ids('TODO')).toEqual(['a', 'd']);
    expect(kanban.hiddenCount()).toBe(1);

    tasks.update((list) => list.map((t) => (t.id === 'b' ? { ...t, showInKanban: true } : t)));
    expect(ids('TODO')).toEqual(['a', 'b', 'd']);
    expect(kanban.hiddenCount()).toBe(0);
  });

  describe('tâches masquées (hors sprint)', () => {
    beforeEach(() => {
      tasks.update((list) =>
        list.map((t) => (t.id === 'b' || t.id === 'c' ? { ...t, showInKanban: false } : t)),
      );
    });

    it('les sépare du tableau et les range par colonne', () => {
      expect(ids('TODO')).toEqual(['a', 'd']);
      expect(ids('DONE')).toEqual([]);
      expect(kanban.hiddenTasks().map((t) => t.id)).toEqual(['b', 'c']);
      expect(kanban.hiddenCount()).toBe(2);
    });

    it('est replié par défaut', () => {
      expect(kanban.hiddenOpen()).toBe(false);
    });

    it('applique les filtres aux tâches masquées, sans changer le total', () => {
      kanban.priorityFilter.set('HIGH');

      expect(kanban.hiddenTasks().map((t) => t.id)).toEqual(['b']);
      expect(kanban.hiddenCount()).toBe(2);
    });

    it('masque une tâche du sprint ou la réintègre en enregistrant', () => {
      kanban.toggleSprint(tasks()[0]);
      expect(taskService.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'a', showInKanban: false }),
      );

      kanban.toggleSprint(tasks()[1]);
      expect(taskService.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'b', showInKanban: true }),
      );
    });
  });

  describe('archives', () => {
    beforeEach(() => {
      tasks.update((list) =>
        list.map((t) => {
          if (t.id === 'a') return { ...t, archived: true, archivedAt: '2026-10-01T00:00:00.000Z' };
          if (t.id === 'c') return { ...t, archived: true, archivedAt: '2026-10-05T00:00:00.000Z' };
          if (t.id === 'd') return { ...t, showInKanban: false };
          return t;
        }),
      );
    });

    it('retire les tâches archivées du tableau et des masquées', () => {
      expect(ids('TODO')).toEqual(['b']);
      expect(ids('DONE')).toEqual([]);
      expect(kanban.hiddenTasks().map((t) => t.id)).toEqual(['d']);
      expect(kanban.hiddenCount()).toBe(1);
    });

    it('liste les archivées, la plus récente d’abord, et les compte', () => {
      expect(kanban.archivedTasks().map((t) => t.id)).toEqual(['c', 'a']);
      expect(kanban.archivedCount()).toBe(2);
      expect(kanban.archivedOpen()).toBe(false);
    });

    it('applique les filtres aux archivées sans changer le total', () => {
      kanban.priorityFilter.set('LOW');

      expect(kanban.archivedTasks().map((t) => t.id)).toEqual(['a']);
      expect(kanban.archivedCount()).toBe(2);
    });

    it('archive une tâche puis la restaure', () => {
      kanban.toggleArchive(tasks().find((t) => t.id === 'b')!);
      expect(taskService.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'b', archived: true, archivedAt: expect.any(String) }),
      );

      kanban.toggleArchive(tasks().find((t) => t.id === 'a')!);
      expect(taskService.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'a', archived: false, archivedAt: undefined }),
      );
    });
  });
});
