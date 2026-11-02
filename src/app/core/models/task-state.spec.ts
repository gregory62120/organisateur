import { Task } from './task.model';
import {
  countByGroup,
  taskGroup,
  toggleArchived,
  toggleSprint,
  trackCompletion,
  uniqueAssignees,
} from './task-state';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: '1',
    title: 'Tâche',
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

describe('task-state', () => {
  describe('taskGroup', () => {
    it('place une tâche dans le sprint par défaut', () => {
      expect(taskGroup(makeTask())).toBe('sprint');
      expect(taskGroup(makeTask({ showInKanban: true }))).toBe('sprint');
    });

    it('place une tâche masquée dans hidden', () => {
      expect(taskGroup(makeTask({ showInKanban: false }))).toBe('hidden');
    });

    it('l’archivage l’emporte sur la visibilité', () => {
      expect(taskGroup(makeTask({ archived: true }))).toBe('archived');
      expect(taskGroup(makeTask({ archived: true, showInKanban: false }))).toBe('archived');
    });
  });

  describe('toggleSprint', () => {
    it('masque une tâche du sprint puis la réintègre, sans modifier l’original', () => {
      const task = makeTask();
      const hidden = toggleSprint(task);

      expect(hidden.showInKanban).toBe(false);
      expect(task.showInKanban).toBeUndefined();
      expect(toggleSprint(hidden).showInKanban).toBe(true);
    });
  });

  describe('toggleArchived', () => {
    it('archive une tâche en datant l’archivage, sans modifier l’original', () => {
      const task = makeTask();
      const archived = toggleArchived(task, new Date('2026-10-20T10:00:00.000Z'));

      expect(archived).toMatchObject({ archived: true, archivedAt: '2026-10-20T10:00:00.000Z' });
      expect(task.archived).toBeUndefined();
    });

    it('restaure une tâche archivée', () => {
      const restored = toggleArchived(
        makeTask({ archived: true, archivedAt: '2026-10-20T10:00:00.000Z' }),
      );

      expect(restored.archived).toBe(false);
      expect(restored.archivedAt).toBeUndefined();
    });

    it('conserve la visibilité d’origine à la restauration', () => {
      const restored = toggleArchived(makeTask({ archived: true, showInKanban: false }));

      expect(taskGroup(restored)).toBe('hidden');
    });
  });

  it('compte les tâches par groupe', () => {
    const counts = countByGroup([
      makeTask({ id: 'a' }),
      makeTask({ id: 'b' }),
      makeTask({ id: 'c', showInKanban: false }),
      makeTask({ id: 'd', archived: true }),
    ]);

    expect(counts).toEqual({ sprint: 2, hidden: 1, archived: 1 });
  });

  it('liste les responsables distincts, triés, sans valeur vide', () => {
    const assignees = uniqueAssignees([
      makeTask({ assignedTo: 'Sophie' }),
      makeTask({ assignedTo: ' Alice ' }),
      makeTask({ assignedTo: 'Sophie' }),
      makeTask({ assignedTo: '  ' }),
      makeTask(),
    ]);

    expect(assignees).toEqual(['Alice', 'Sophie']);
  });

  describe('trackCompletion', () => {
    const now = new Date('2026-10-30T10:00:00.000Z');

    it('date la fin quand la tâche passe à terminé', () => {
      const done = trackCompletion(makeTask(), makeTask({ status: 'DONE' }), now);

      expect(done.completedAt).toBe('2026-10-30T10:00:00.000Z');
    });

    it('date la fin d’une nouvelle tâche déjà terminée', () => {
      expect(trackCompletion(undefined, makeTask({ status: 'DONE' }), now).completedAt).toBe(
        '2026-10-30T10:00:00.000Z',
      );
      expect(trackCompletion(undefined, makeTask(), now).completedAt).toBeUndefined();
    });

    it('conserve la date d’origine tant que la tâche reste terminée', () => {
      const before = makeTask({ status: 'DONE', completedAt: '2026-10-01T08:00:00.000Z' });

      const after = trackCompletion(before, { ...before, title: 'Renommée' }, now);

      expect(after.completedAt).toBe('2026-10-01T08:00:00.000Z');
    });

    it('ne date pas une tâche terminée avant l’introduction de la date', () => {
      const legacy = makeTask({ status: 'DONE' });

      expect(trackCompletion(legacy, { ...legacy }, now).completedAt).toBeUndefined();
    });

    it('retire la date quand la tâche est rouverte', () => {
      const before = makeTask({ status: 'DONE', completedAt: '2026-10-01T08:00:00.000Z' });

      const reopened = trackCompletion(before, { ...before, status: 'IN_PROGRESS' }, now);

      expect(reopened.completedAt).toBeUndefined();
    });

    it('ne modifie pas la tâche d’origine', () => {
      const next = makeTask({ status: 'DONE' });

      trackCompletion(makeTask(), next, now);

      expect(next.completedAt).toBeUndefined();
    });
  });
});
