import { TestBed } from '@angular/core/testing';

import { ProjectEvent } from '../models/event.model';
import { Task } from '../models/task.model';
import {
  CalendarEvent,
  CalendarService,
  ProjectCalendarEvent,
  TaskCalendarEvent,
} from './calendar.service';

function makeEvent(id: string, overrides: Partial<ProjectEvent> = {}): ProjectEvent {
  return {
    id,
    title: id,
    date: '2026-10-20',
    description: '',
    color: 'blue',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

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

describe('CalendarService', () => {
  let service: CalendarService;
  const today = new Date(2026, 9, 15); // jeudi 15 octobre 2026

  beforeEach(() => {
    service = TestBed.inject(CalendarService);
  });

  describe('events', () => {
    it('crée une échéance par tâche datée et ignore les autres', () => {
      const events = service.events(
        [makeTask('a', { dueDate: '2026-10-20' }), makeTask('b')],
        today,
      );

      expect(events.map((e) => [e.key, e.kind, e.date])).toEqual([['a', 'task', '2026-10-20']]);
    });

    it('ignore les tâches archivées', () => {
      expect(
        service.events([makeTask('a', { dueDate: '2026-10-20', archived: true })], today),
      ).toEqual([]);
    });

    it('garde les tâches masquées du sprint', () => {
      const events = service.events(
        [makeTask('a', { dueDate: '2026-10-20', showInKanban: false })],
        today,
      );

      expect(events).toHaveLength(1);
    });

    it('ajoute les sous-tâches datées, avec leur responsable et leur état', () => {
      const events = service.events(
        [
          makeTask('a', {
            assignedTo: 'Sophie',
            priority: 'HIGH',
            checklist: [
              { id: 's1', label: 'Écrire', completed: true, dueDate: '2026-10-18' },
              {
                id: 's2',
                label: 'Relire',
                completed: false,
                dueDate: '2026-10-19',
                assignedTo: 'Léo',
              },
              { id: 's3', label: 'Sans date', completed: false },
            ],
          }),
        ],
        today,
      ) as TaskCalendarEvent[];

      expect(events.map((e) => [e.key, e.kind, e.done, e.assignee, e.priority])).toEqual([
        ['a:s1', 'subtask', true, 'Sophie', 'HIGH'],
        ['a:s2', 'subtask', false, 'Léo', 'HIGH'],
      ]);
      expect(events[0].subtaskId).toBe('s1');
    });

    it('marque en retard une échéance passée non terminée', () => {
      const [late, onTime, doneLate, todayEvent] = service.events(
        [
          makeTask('late', { dueDate: '2026-10-10' }),
          makeTask('ok', { dueDate: '2026-10-16' }),
          makeTask('done', { dueDate: '2026-10-01', status: 'DONE' }),
          makeTask('today', { dueDate: '2026-10-15' }),
        ],
        today,
      );

      expect(late.overdue).toBe(true);
      expect(onTime.overdue).toBe(false);
      expect(doneLate.overdue).toBe(false);
      expect(todayEvent.overdue).toBe(false);
    });

    it('considère les sous-tâches d’une tâche terminée comme terminées', () => {
      const [event] = service.events(
        [
          makeTask('a', {
            status: 'DONE',
            checklist: [{ id: 's', label: 'x', completed: false, dueDate: '2026-10-01' }],
          }),
        ],
        today,
      );

      expect(event.done).toBe(true);
      expect(event.overdue).toBe(false);
    });
  });

  describe('byDay', () => {
    it('regroupe par jour : à faire d’abord, puis priorité, puis titre', () => {
      const events = service.events(
        [
          makeTask('b-low', { dueDate: '2026-10-20', priority: 'LOW' }),
          makeTask('a-done', { dueDate: '2026-10-20', status: 'DONE', priority: 'HIGH' }),
          makeTask('c-high', { dueDate: '2026-10-20', priority: 'HIGH' }),
          makeTask('a-low', { dueDate: '2026-10-20', priority: 'LOW' }),
          makeTask('other', { dueDate: '2026-10-21' }),
        ],
        today,
      );

      const map = service.byDay(events);

      expect(map.get('2026-10-20')!.map((e) => e.key)).toEqual([
        'c-high',
        'a-low',
        'b-low',
        'a-done',
      ]);
      expect(map.get('2026-10-21')).toHaveLength(1);
    });
  });

  describe('grilles', () => {
    const empty = new Map<string, CalendarEvent[]>();

    it('construit les semaines d’octobre 2026 de lundi à dimanche', () => {
      const weeks = service.monthWeeks(new Date(2026, 9, 1), empty, today);

      expect(weeks).toHaveLength(5);
      expect(weeks.every((w) => w.length === 7)).toBe(true);
      expect(weeks[0][0].iso).toBe('2026-09-28');
      expect(weeks[0][0].inMonth).toBe(false);
      expect(weeks[0][3].iso).toBe('2026-10-01');
      expect(weeks[0][3].inMonth).toBe(true);
      expect(weeks[4][6].iso).toBe('2026-11-01');
    });

    it('prévoit 6 semaines quand le mois les déborde (novembre 2026)', () => {
      const weeks = service.monthWeeks(new Date(2026, 10, 1), empty, today);

      expect(weeks).toHaveLength(6);
      expect(weeks[0][0].iso).toBe('2026-10-26');
    });

    it('repère aujourd’hui et les week-ends, et joint les échéances du jour', () => {
      const byDay = service.byDay(
        service.events([makeTask('a', { dueDate: '2026-10-15' })], today),
      );
      const days = service.monthWeeks(today, byDay, today).flat();

      const todayCell = days.find((d) => d.today)!;
      expect(todayCell.iso).toBe('2026-10-15');
      expect(todayCell.events.map((e) => e.key)).toEqual(['a']);
      expect(days.filter((d) => d.today)).toHaveLength(1);
      expect(days.find((d) => d.iso === '2026-10-17')!.weekend).toBe(true);
      expect(days.find((d) => d.iso === '2026-10-16')!.weekend).toBe(false);
    });

    it('construit la semaine d’une date', () => {
      const days = service.weekDays(today, empty, today);

      expect(days.map((d) => d.iso)).toEqual([
        '2026-10-12',
        '2026-10-13',
        '2026-10-14',
        '2026-10-15',
        '2026-10-16',
        '2026-10-17',
        '2026-10-18',
      ]);
    });
  });

  describe('navigation et titre', () => {
    it('avance d’un mois ou d’une semaine, y compris au changement d’année', () => {
      expect(service.shift(today, 'month', 1)).toEqual(new Date(2026, 10, 1));
      expect(service.shift(new Date(2026, 11, 10), 'month', 1)).toEqual(new Date(2027, 0, 1));
      expect(service.shift(new Date(2026, 0, 10), 'month', -1)).toEqual(new Date(2025, 11, 1));
      expect(service.shift(today, 'week', 1)).toEqual(new Date(2026, 9, 22));
      expect(service.shift(today, 'week', -1)).toEqual(new Date(2026, 9, 8));
    });

    it('titre le mois et la semaine', () => {
      expect(service.title(today, 'month')).toBe('octobre 2026');
      expect(service.title(today, 'week')).toContain('12');
      expect(service.title(today, 'week')).toContain('18');
      expect(service.title(today, 'week')).toContain('2026');
      expect(service.title(new Date(2026, 9, 29), 'week')).toMatch(/26.*oct.*–.*1.*nov.*2026/);
    });
  });

  describe('évènements du projet', () => {
    it('ajoute les évènements, jamais en retard ni terminés', () => {
      const events = service.events([], today, [
        makeEvent('past', { date: '2026-10-01', color: 'red' }),
        makeEvent('', { id: 'e2' }),
      ]);

      expect(events.map((e) => [e.key, e.kind, e.done, e.overdue])).toEqual([
        ['event:past', 'event', false, false],
        ['event:e2', 'event', false, false],
      ]);
      expect(events[0].kind === 'event' && events[0].color).toBe('red');
      expect(events[1].title).toBe('Sans titre');
    });

    it('ignore un évènement sans date valide', () => {
      expect(service.events([], today, [makeEvent('x', { date: 'abc' })])).toEqual([]);
    });

    it('formate les heures', () => {
      expect(service.timeLabel({})).toBeUndefined();
      expect(service.timeLabel({ startTime: '14:00' })).toBe('14:00');
      expect(service.timeLabel({ startTime: '14:00', endTime: '14:00' })).toBe('14:00');
      expect(service.timeLabel({ startTime: '14:00', endTime: '15:30' })).toBe('14:00 – 15:30');
    });

    it('place les évènements avant les tâches : toute la journée, puis par heure', () => {
      const events = service.events(
        [makeTask('task-high', { dueDate: '2026-10-20', priority: 'HIGH' })],
        today,
        [
          makeEvent('late', { startTime: '16:00', endTime: '17:00' }),
          makeEvent('early', { startTime: '09:00' }),
          makeEvent('allday'),
        ],
      );

      const map = service.byDay(events);

      expect(map.get('2026-10-20')!.map((e) => e.key)).toEqual([
        'event:allday',
        'event:early',
        'event:late',
        'task-high',
      ]);
    });

    it('affiche l’heure de début et de fin', () => {
      const [event] = service.events([], today, [
        makeEvent('a', { startTime: '10:00', endTime: '11:00' }),
      ]);

      expect(event.kind === 'event' && event.time).toBe('10:00 – 11:00');
    });
  });

  describe('grille horaire', () => {
    const timed = (id: string, startTime: string, endTime?: string) =>
      service.events([], today, [makeEvent(id, { startTime, endTime })])[0] as ProjectCalendarEvent;

    it('distingue les évènements horaires de ce qui dure toute la journée', () => {
      const [task, allDay, withTime] = [
        service.events([makeTask('t', { dueDate: '2026-10-20' })], today)[0],
        service.events([], today, [makeEvent('a')])[0],
        timed('b', '10:00'),
      ];

      expect(service.isTimed(task)).toBe(false);
      expect(service.isTimed(allDay)).toBe(false);
      expect(service.isTimed(withTime)).toBe(true);
    });

    it('positionne un créneau en pourcentage de la journée', () => {
      const [slot] = service.layoutTimed([timed('a', '06:00', '09:00')]);

      expect(slot.top).toBeCloseTo(25);
      expect(slot.height).toBeCloseTo(12.5);
      expect([slot.lane, slot.lanes]).toEqual([0, 1]);
    });

    it('donne une heure de durée sans heure de fin, et une durée minimale de 30 min', () => {
      const [noEnd, sameTime] = service.layoutTimed([
        timed('a', '09:00'),
        timed('b', '12:00', '12:00'),
      ]);

      expect(noEnd.height).toBeCloseTo((60 / 1440) * 100);
      expect(sameTime.height).toBeCloseTo((30 / 1440) * 100);
    });

    it('court jusqu’à minuit quand la fin précède le début, sans déborder de la journée', () => {
      const [late, tooLate] = service.layoutTimed([
        timed('a', '22:00', '01:00'),
        timed('b', '23:50', '23:55'),
      ]);

      expect(late.top + late.height).toBeCloseTo(100);
      expect(tooLate.top + tooLate.height).toBeLessThanOrEqual(100.0001);
    });

    it('met côte à côte les évènements qui se chevauchent', () => {
      const slots = service.layoutTimed([
        timed('a', '09:00', '11:00'),
        timed('b', '10:00', '12:00'),
        timed('c', '10:30', '10:45'),
      ]);
      const byKey = Object.fromEntries(slots.map((s) => [s.event.key, s]));

      expect(slots.every((s) => s.lanes === 3)).toBe(true);
      expect(new Set(slots.map((s) => s.lane)).size).toBe(3);
      expect(byKey['event:a'].lane).toBe(0);
    });

    it('réutilise une colonne libérée et ne mélange pas deux groupes distincts', () => {
      const slots = service.layoutTimed([
        timed('a', '09:00', '10:00'),
        timed('b', '09:30', '10:30'),
        timed('c', '10:00', '11:00'),
        timed('d', '14:00', '15:00'),
      ]);
      const byKey = Object.fromEntries(slots.map((s) => [s.event.key, s]));

      expect([byKey['event:a'].lane, byKey['event:b'].lane, byKey['event:c'].lane]).toEqual([
        0, 1, 0,
      ]);
      expect(byKey['event:a'].lanes).toBe(2);
      expect([byKey['event:d'].lane, byKey['event:d'].lanes]).toEqual([0, 1]);
    });

    it('accepte une liste vide', () => {
      expect(service.layoutTimed([])).toEqual([]);
    });
  });

  describe('vue jour', () => {
    it('construit une colonne pour le jour demandé', () => {
      const byDay = service.byDay(
        service.events([makeTask('a', { dueDate: '2026-10-15' })], today),
      );

      const [day, ...others] = service.dayColumn(today, byDay, today);

      expect(others).toEqual([]);
      expect(day.iso).toBe('2026-10-15');
      expect(day.today).toBe(true);
      expect(day.events.map((e) => e.key)).toEqual(['a']);
    });

    it('avance d’un jour, y compris au changement de mois', () => {
      expect(service.shift(today, 'day', 1)).toEqual(new Date(2026, 9, 16));
      expect(service.shift(new Date(2026, 9, 31), 'day', 1)).toEqual(new Date(2026, 10, 1));
      expect(service.shift(today, 'day', -1)).toEqual(new Date(2026, 9, 14));
    });

    it('titre le jour avec son nom', () => {
      expect(service.title(today, 'day')).toBe('jeudi 15 octobre 2026');
    });
  });

  describe('assignLanes', () => {
    const item = (id: string, start: number, end: number) => ({ id, start, end });

    it('place des intervalles qui se chevauchent côte à côte', () => {
      const lanes = service.assignLanes([item('a', 0, 60), item('b', 30, 90)]);

      expect(lanes.map((l) => [l.item.id, l.lane, l.lanes])).toEqual([
        ['a', 0, 2],
        ['b', 1, 2],
      ]);
    });

    it('réutilise une colonne libérée et isole les groupes distincts', () => {
      const lanes = service.assignLanes([
        item('d', 200, 260),
        item('a', 0, 60),
        item('b', 30, 90),
        item('c', 60, 120),
      ]);
      const byId = Object.fromEntries(lanes.map((l) => [l.item.id, [l.lane, l.lanes]]));

      expect(byId).toEqual({ a: [0, 2], b: [1, 2], c: [0, 2], d: [0, 1] });
    });

    it('gère aucun intervalle et un intervalle seul', () => {
      expect(service.assignLanes([])).toEqual([]);
      expect(service.assignLanes([item('a', 0, 10)])).toEqual([
        { item: item('a', 0, 10), lane: 0, lanes: 1 },
      ]);
    });
  });
});
