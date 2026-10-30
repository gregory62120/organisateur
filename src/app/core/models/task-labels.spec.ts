import { Task } from './task.model';
import {
  avatarColor,
  compareTasks,
  formatDueDate,
  formatShortDate,
  initials,
  isOverdue,
  tagTone,
} from './task-labels';

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

describe('task-labels', () => {
  describe('initials', () => {
    it('retourne les initiales des deux premiers mots', () => {
      expect(initials('Grégory Cazier')).toBe('GC');
      expect(initials('  marie   anne  dupont ')).toBe('MA');
    });

    it('gère les valeurs vides', () => {
      expect(initials('')).toBe('');
      expect(initials(undefined)).toBe('');
    });
  });

  describe('formatDueDate', () => {
    it('retourne une chaîne vide sans date ou avec une date invalide', () => {
      expect(formatDueDate()).toBe('');
      expect(formatDueDate('pas-une-date')).toBe('');
    });

    it('formate une date valide en français', () => {
      expect(formatDueDate('2026-10-12')).toContain('2026');
    });
  });

  describe('isOverdue', () => {
    const now = new Date('2026-10-15T12:00:00');

    it('est en retard si l’échéance est passée', () => {
      expect(isOverdue(makeTask({ dueDate: '2026-10-10' }), now)).toBe(true);
    });

    it('n’est pas en retard le jour même ni dans le futur', () => {
      expect(isOverdue(makeTask({ dueDate: '2026-10-15' }), now)).toBe(false);
      expect(isOverdue(makeTask({ dueDate: '2026-10-20' }), now)).toBe(false);
    });

    it('ignore les tâches terminées ou sans échéance', () => {
      expect(isOverdue(makeTask({ dueDate: '2026-10-10', status: 'DONE' }), now)).toBe(false);
      expect(isOverdue(makeTask(), now)).toBe(false);
    });
  });

  describe('compareTasks', () => {
    it('retourne null pour le tri manuel', () => {
      expect(compareTasks('manual')).toBeNull();
    });

    it('trie par priorité décroissante', () => {
      const tasks = [
        makeTask({ id: 'l', priority: 'LOW' }),
        makeTask({ id: 'h', priority: 'HIGH' }),
        makeTask({ id: 'm', priority: 'MEDIUM' }),
      ];
      tasks.sort(compareTasks('priority')!);
      expect(tasks.map((t) => t.id)).toEqual(['h', 'm', 'l']);
    });

    it('trie par échéance, sans date en dernier', () => {
      const tasks = [
        makeTask({ id: 'none' }),
        makeTask({ id: 'late', dueDate: '2026-12-01' }),
        makeTask({ id: 'soon', dueDate: '2026-10-01' }),
      ];
      tasks.sort(compareTasks('dueDate')!);
      expect(tasks.map((t) => t.id)).toEqual(['soon', 'late', 'none']);
    });

    it('trie par titre', () => {
      const tasks = [makeTask({ id: 'b', title: 'Beta' }), makeTask({ id: 'a', title: 'Alpha' })];
      tasks.sort(compareTasks('title')!);
      expect(tasks.map((t) => t.id)).toEqual(['a', 'b']);
    });
  });

  describe('couleurs stables', () => {
    it('une même étiquette a toujours la même teinte (insensible à la casse)', () => {
      expect(tagTone('Frontend')).toEqual(tagTone('frontend'));
      expect(tagTone('Frontend').bg).toMatch(/^#/);
    });

    it('un même responsable a toujours la même couleur d’avatar', () => {
      expect(avatarColor('Sophie Martin')).toBe(avatarColor('Sophie Martin'));
      expect(avatarColor(undefined)).toMatch(/^#/);
    });
  });

  describe('formatShortDate', () => {
    const now = new Date(2026, 9, 29);

    it('omet l’année en cours', () => {
      expect(formatShortDate('2026-10-17', now)).toBe('17 oct.');
    });

    it('ajoute l’année quand elle diffère', () => {
      expect(formatShortDate('2027-01-05', now)).toContain('2027');
    });

    it('retourne une chaîne vide sans date valide', () => {
      expect(formatShortDate(undefined, now)).toBe('');
      expect(formatShortDate('abc', now)).toBe('');
    });
  });
});
