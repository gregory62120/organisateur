import { Dialog } from '@angular/cdk/dialog';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Task } from '../../core/models/task.model';
import { StorageService } from '../../core/services/storage.service';
import { TaskService } from '../../core/services/task.service';
import { KanbanComponent } from './kanban';

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
    delete: vi.fn(),
    createEmpty: () => makeTask('new', { title: 'Nouvelle tâche' }),
  };
  const dialog = { open: vi.fn() };
  const storage = { isOpen: signal(true), root: signal({ name: 'Mon projet' }) };

  let kanban: KanbanComponent;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));
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
        { provide: Dialog, useValue: dialog },
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

      const config = dialog.open.mock.calls[0][1];
      expect(config.data.isNew).toBe(true);
      expect(config.data.task.status).toBe('IN_PROGRESS');
    });

    it('ouvre une tâche existante sans mode création', () => {
      kanban.open(tasks()[0]);

      expect(dialog.open.mock.calls[0][1].data).toEqual({ task: tasks()[0], isNew: false });
    });

    it('supprime après confirmation uniquement', () => {
      kanban.remove(tasks()[0]);
      expect(taskService.delete).toHaveBeenCalledWith('a');

      vi.stubGlobal('confirm', vi.fn(() => false));
      kanban.remove(tasks()[1]);
      expect(taskService.delete).toHaveBeenCalledTimes(1);
    });
  });
});
