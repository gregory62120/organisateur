import { TestBed } from '@angular/core/testing';

import { GanttService } from './gantt.service';

describe('GanttService', () => {
  let service: GanttService;
  const d = (iso: string) => service.parseDay(iso)!;

  beforeEach(() => {
    service = TestBed.inject(GanttService);
  });

  describe('dates', () => {
    it('parse et formate une date sans décalage de fuseau', () => {
      const date = d('2026-10-12');
      expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 12]);
      expect(service.toIso(date)).toBe('2026-10-12');
    });

    it('rejette les valeurs vides ou invalides', () => {
      expect(service.parseDay()).toBeNull();
      expect(service.parseDay('')).toBeNull();
      expect(service.parseDay('abc')).toBeNull();
    });

    it('accepte une date ISO complète', () => {
      expect(service.toIso(d('2026-10-12T08:30:00.000Z'))).toBe('2026-10-12');
    });

    it('ajoute des jours en passant le changement de mois et d’heure', () => {
      expect(service.toIso(service.addDays(d('2026-10-30'), 3))).toBe('2026-11-02');
      expect(service.diffDays(d('2026-10-24'), d('2026-10-26'))).toBe(2);
      expect(service.diffDays(d('2026-03-28'), d('2026-03-30'))).toBe(2);
    });

    it('trouve le lundi de la semaine', () => {
      expect(service.toIso(service.startOfWeek(d('2026-10-15')))).toBe('2026-10-12');
      expect(service.toIso(service.startOfWeek(d('2026-10-18')))).toBe('2026-10-12');
      expect(service.toIso(service.startOfWeek(d('2026-10-12')))).toBe('2026-10-12');
    });
  });

  describe('span', () => {
    it('couvre du début à l’échéance', () => {
      const span = service.span({ startDate: '2026-10-01', dueDate: '2026-10-05' })!;
      expect(service.toIso(span.start)).toBe('2026-10-01');
      expect(service.toIso(span.end)).toBe('2026-10-05');
    });

    it('occupe un jour avec une seule date', () => {
      for (const task of [{ dueDate: '2026-10-05' }, { startDate: '2026-10-05' }]) {
        const span = service.span(task)!;
        expect(service.toIso(span.start)).toBe('2026-10-05');
        expect(service.toIso(span.end)).toBe('2026-10-05');
      }
    });

    it('remet les dates dans l’ordre si elles sont inversées', () => {
      const span = service.span({ startDate: '2026-10-09', dueDate: '2026-10-02' })!;
      expect(service.toIso(span.start)).toBe('2026-10-02');
    });

    it('retourne null sans date', () => {
      expect(service.span({})).toBeNull();
    });
  });

  describe('range', () => {
    it('commence un lundi et contient toutes les tâches et aujourd’hui', () => {
      const today = d('2026-10-15');
      const range = service.range(
        [{ startDate: '2026-09-01', dueDate: '2026-09-10' }, { dueDate: '2026-12-20' }],
        today,
      );

      expect(range.start.getDay()).toBe(1);
      const end = service.addDays(range.start, range.days - 1);
      expect(range.start <= d('2026-09-01')).toBe(true);
      expect(end >= d('2026-12-20')).toBe(true);
    });

    it('garde une largeur minimale de 6 semaines sans tâche', () => {
      const range = service.range([], d('2026-10-15'));
      expect(range.days).toBeGreaterThanOrEqual(42);
      expect(service.addDays(range.start, range.days) >= d('2026-10-15')).toBe(true);
    });
  });

  describe('ticks', () => {
    const makeRange = () => ({ start: d('2026-10-26'), days: 14 });

    it('génère un jour par graduation', () => {
      const ticks = service.ticks(makeRange(), 'day');
      expect(ticks).toHaveLength(14);
      expect(ticks[0]).toMatchObject({ offset: 0, span: 1, label: '26' });
    });

    it('génère une semaine par graduation, le dernier segment est tronqué', () => {
      const ticks = service.ticks({ start: d('2026-10-28'), days: 10 }, 'week');
      expect(ticks.map((t) => [t.offset, t.span])).toEqual([
        [0, 5],
        [5, 5],
      ]);
    });

    it('découpe par mois et couvre exactement la plage', () => {
      const ticks = service.ticks(makeRange(), 'month');
      expect(ticks).toHaveLength(2);
      expect(ticks.reduce((sum, t) => sum + t.span, 0)).toBe(14);
      expect(ticks[0].label).toContain('octobre');
      expect(ticks[1].offset).toBe(6);
    });
  });

  describe('progress', () => {
    it('vaut 100 pour une tâche terminée', () => {
      expect(service.progress({ status: 'DONE', checklist: [] })).toBe(100);
    });

    it('suit la checklist, sinon 0', () => {
      expect(service.progress({ status: 'TODO', checklist: [] })).toBe(0);
      expect(
        service.progress({
          status: 'IN_PROGRESS',
          checklist: [
            { id: '1', label: 'a', completed: true },
            { id: '2', label: 'b', completed: false },
            { id: '3', label: 'c', completed: false },
            { id: '4', label: 'd', completed: true },
          ],
        }),
      ).toBe(50);
    });
  });
});
