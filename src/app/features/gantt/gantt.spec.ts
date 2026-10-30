import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Task } from '../../core/models/task.model';
import { StorageService } from '../../core/services/storage.service';
import { TaskService } from '../../core/services/task.service';
import { TaskDialogService } from '../kanban/services/task-dialog.service';
import { GanttComponent } from './gantt';

function makeTask(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    checklist: [],
    comments: [],
    attachments: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('GanttComponent', () => {
  const tasks = signal<Task[]>([]);
  const taskService = { tasksSignal: tasks.asReadonly(), update: vi.fn() };
  const dialogs = { openTask: vi.fn() };
  const storage = { isOpen: signal(true), root: signal({ name: 'Projet' }) };

  let gantt: GanttComponent;

  beforeEach(() => {
    vi.clearAllMocks();
    tasks.set([
      makeTask('late', { startDate: '2026-10-10', dueDate: '2026-10-14', assignedTo: 'Sophie' }),
      makeTask('none', { title: 'Sans date' }),
      makeTask('early', { startDate: '2026-10-01', dueDate: '2026-10-03', status: 'DONE' }),
    ]);

    TestBed.configureTestingModule({
      providers: [
        { provide: TaskService, useValue: taskService },
        { provide: StorageService, useValue: storage },
        { provide: TaskDialogService, useValue: dialogs },
      ],
    });
    gantt = TestBed.runInInjectionContext(() => new GanttComponent());
  });

  const row = (id: string) =>
    [...gantt.rows(), ...gantt.hiddenRows(), ...gantt.archivedRows()].find(
      (r) => r.task.id === id,
    )!;

  const pointer = (clientX: number, extra: Partial<PointerEvent> = {}) =>
    ({
      clientX,
      button: 0,
      pointerId: 1,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      currentTarget: { setPointerCapture: vi.fn() },
      ...extra,
    }) as unknown as PointerEvent;

  it('trie les tâches par date de début, les non planifiées en dernier', () => {
    expect(gantt.rows().map((r) => r.task.id)).toEqual(['early', 'late', 'none']);
    expect(row('none').span).toBeNull();
  });

  it('positionne la barre selon la date et l’échelle', () => {
    const width = gantt.dayWidth();
    // 10 → 14 octobre inclus = 5 jours, 9 jours après le 1er octobre.
    expect(row('late').width).toBe(5 * width);
    expect(row('late').left - row('early').left).toBe(9 * width);

    gantt.scale.set('month');
    expect(row('late').width).toBe(5 * gantt.dayWidth());
  });

  it('calcule l’avancement et filtre', () => {
    expect(row('early').progress).toBe(100);

    gantt.assigneeFilter.set('Sophie');
    expect(gantt.rows().map((r) => r.task.id)).toEqual(['late']);

    gantt.resetFilters();
    gantt.statusFilter.set('DONE');
    expect(gantt.rows().map((r) => r.task.id)).toEqual(['early']);

    gantt.resetFilters();
    gantt.search.set('sans');
    expect(gantt.rows().map((r) => r.task.id)).toEqual(['none']);
  });

  it('la plage ne change pas quand on filtre', () => {
    const before = gantt.range();
    gantt.statusFilter.set('DONE');
    expect(gantt.range()).toBe(before);
  });

  describe('glisser-déposer', () => {
    const drag = (id: string, mode: 'move' | 'start' | 'end', dx: number) => {
      const w = gantt.dayWidth();
      gantt.startDrag(pointer(100), row(id), mode);
      gantt.moveDrag(pointer(100 + dx * w));
      return { preview: row(id), commit: () => gantt.endDrag(row(id)) };
    };

    it('déplace la tâche entière et enregistre les deux dates', () => {
      const { preview, commit } = drag('late', 'move', 3);
      expect(preview.left - row('early').left).toBe(12 * gantt.dayWidth());

      commit();

      expect(taskService.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'late', startDate: '2026-10-13', dueDate: '2026-10-17' }),
      );
    });

    it('redimensionne la fin sans passer avant le début', () => {
      drag('late', 'end', 2).commit();
      expect(taskService.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ startDate: '2026-10-10', dueDate: '2026-10-16' }),
      );

      drag('late', 'end', -20).commit();
      expect(taskService.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ startDate: '2026-10-10', dueDate: '2026-10-10' }),
      );
    });

    it('redimensionne le début sans dépasser la fin', () => {
      drag('late', 'start', -2).commit();
      expect(taskService.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ startDate: '2026-10-08', dueDate: '2026-10-14' }),
      );

      drag('late', 'start', 20).commit();
      expect(taskService.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ startDate: '2026-10-14', dueDate: '2026-10-14' }),
      );
    });

    it('un simple clic ouvre la tâche sans rien enregistrer', () => {
      gantt.startDrag(pointer(100), row('late'), 'move');
      gantt.endDrag(row('late'));

      expect(dialogs.openTask).toHaveBeenCalledTimes(1);
      expect(taskService.update).not.toHaveBeenCalled();
    });

    it('rien n’est enregistré pendant le glissement ni après annulation', () => {
      drag('late', 'move', 4);
      expect(taskService.update).not.toHaveBeenCalled();

      gantt.cancelDrag();
      expect(row('late').span!.start.getDate()).toBe(10);
    });

    it('ignore une tâche non planifiée et les clics non primaires', () => {
      gantt.startDrag(pointer(100), row('none'), 'move');
      gantt.startDrag(pointer(100, { button: 2 }), row('late'), 'move');
      gantt.moveDrag(pointer(300));
      gantt.endDrag(row('late'));

      expect(taskService.update).not.toHaveBeenCalled();
      expect(dialogs.openTask).not.toHaveBeenCalled();
    });
  });

  describe('visibilité dans le Kanban', () => {
    it('est visible par défaut', () => {
      expect(gantt.rows().every((r) => r.group === 'sprint')).toBe(true);
      expect(gantt.hiddenCount()).toBe(0);
    });

    it('bascule une tâche et enregistre sans ouvrir la tâche', () => {
      const event = { stopPropagation: vi.fn() } as unknown as Event;

      gantt.toggleKanban(event, row('late').task);
      expect(taskService.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'late', showInKanban: false }),
      );

      gantt.toggleKanban(event, { ...row('late').task, showInKanban: false });
      expect(taskService.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'late', showInKanban: true }),
      );
      expect(event.stopPropagation).toHaveBeenCalledTimes(2);
      expect(dialogs.openTask).not.toHaveBeenCalled();
    });

    it('compte les tâches masquées', () => {
      tasks.update((list) =>
        list.map((t) => (t.id === 'late' ? { ...t, showInKanban: false } : t)),
      );

      expect(row('late').group).toBe('hidden');
      expect(gantt.hiddenCount()).toBe(1);
    });

    it('sépare les tâches du sprint et les tâches masquées', () => {
      tasks.update((list) =>
        list.map((t) => (t.id === 'early' ? { ...t, showInKanban: false } : t)),
      );

      expect(gantt.rows().map((r) => r.task.id)).toEqual(['late', 'none']);
      expect(gantt.hiddenRows().map((r) => r.task.id)).toEqual(['early']);
      expect(gantt.hiddenOpen()).toBe(false);
    });

    it('applique les filtres aux deux groupes, sans changer la plage ni le total', () => {
      tasks.update((list) =>
        list.map((t) => (t.id === 'early' ? { ...t, showInKanban: false } : t)),
      );
      const range = gantt.range();

      gantt.assigneeFilter.set('Sophie');

      expect(gantt.rows().map((r) => r.task.id)).toEqual(['late']);
      expect(gantt.hiddenRows()).toEqual([]);
      expect(gantt.hiddenCount()).toBe(1);
      expect(gantt.range()).toBe(range);
    });

    it('une tâche masquée reste déplaçable dans le Gantt', () => {
      tasks.update((list) =>
        list.map((t) => (t.id === 'late' ? { ...t, showInKanban: false } : t)),
      );

      gantt.startDrag(pointer(100), row('late'), 'move');
      gantt.moveDrag(pointer(100 + gantt.dayWidth()));
      gantt.endDrag(row('late'));

      expect(taskService.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'late', startDate: '2026-10-11', dueDate: '2026-10-15' }),
      );
    });
  });

  describe('archives', () => {
    beforeEach(() => {
      tasks.update((list) =>
        list.map((t) =>
          t.id === 'early'
            ? { ...t, archived: true, archivedAt: '2026-10-05T00:00:00.000Z', showInKanban: false }
            : t,
        ),
      );
    });

    it('sort les tâches archivées du sprint et des masquées', () => {
      expect(gantt.rows().map((r) => r.task.id)).toEqual(['late', 'none']);
      expect(gantt.hiddenRows()).toEqual([]);
      expect(gantt.hiddenCount()).toBe(0);
      expect(gantt.archivedRows().map((r) => r.task.id)).toEqual(['early']);
      expect(gantt.archivedCount()).toBe(1);
      expect(gantt.archivedOpen()).toBe(false);
    });

    it('archive et restaure sans ouvrir la tâche', () => {
      const event = { stopPropagation: vi.fn() } as unknown as Event;

      gantt.toggleArchive(event, row('late').task);
      expect(taskService.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'late', archived: true }),
      );

      gantt.toggleArchive(event, row('early').task);
      expect(taskService.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'early', archived: false }),
      );
      expect(event.stopPropagation).toHaveBeenCalledTimes(2);
      expect(dialogs.openTask).not.toHaveBeenCalled();
    });

    it('filtre aussi les archivées', () => {
      gantt.search.set('zzz');

      expect(gantt.archivedRows()).toEqual([]);
      expect(gantt.archivedCount()).toBe(1);
    });
  });
});
