import { Task } from './task.model';
import { buildPlan, workingDays } from './planner';

const make = (overrides: Partial<Task>): Task => ({
  id: crypto.randomUUID(),
  title: 'T',
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  checklist: [],
  comments: [],
  attachments: [],
  createdAt: '2026-11-01T08:00:00.000Z',
  updatedAt: '2026-11-01T08:00:00.000Z',
  ...overrides,
});

describe('planner', () => {
  const monday = new Date('2026-11-23T09:00:00');

  it('saute les week-ends', () => {
    const days = workingDays(new Date('2026-11-27T09:00:00'), 3).map((d) => d.getDay());
    expect(days).toEqual([5, 1, 2]);
  });

  it('place les retards avant le reste', () => {
    const plan = buildPlan(
      [
        make({ title: 'calme', priority: 'HIGH' }),
        make({ title: 'retard', priority: 'LOW', dueDate: '2026-11-20' }),
      ],
      { today: monday, days: 3 },
    );
    expect(plan.days[0].items[0].task.title).toBe('retard');
    expect(plan.insights.join(' ')).toContain('en retard');
  });

  it('respecte la capacité journalière', () => {
    const tasks = [1, 2, 3, 4].map((i) => make({ title: `t${i}`, estimateHours: 3 }));
    const plan = buildPlan(tasks, { today: monday, days: 2, capacityHours: 6 });
    expect(plan.days[0].items.length).toBe(2);
    expect(plan.days[1].items.length).toBe(2);
  });

  it('ne démarre pas avant la date de début', () => {
    const plan = buildPlan([make({ startDate: '2026-11-25', estimateHours: 1 })], {
      today: monday,
      days: 3,
    });
    expect(plan.days[0].items.length).toBe(0);
    expect(plan.days[2].items.length).toBe(1);
  });

  it('ignore les tâches terminées, archivées ou d’un autre responsable', () => {
    const plan = buildPlan(
      [
        make({ status: 'DONE' }),
        make({ archived: true }),
        make({ assignedTo: 'Alice' }),
        make({ assignedTo: 'Bob', title: 'à moi' }),
      ],
      { today: monday, days: 1, assignee: 'bob' },
    );
    expect(plan.days[0].items.map((i) => i.task.title)).toEqual(['à moi']);
  });

  it('apprend la capacité de l’historique', () => {
    const done = Array.from({ length: 10 }, () =>
      make({ status: 'DONE', estimateHours: 4, completedAt: '2026-11-18T10:00:00.000Z' }),
    );
    const plan = buildPlan(done, { today: monday, days: 1 });
    expect(plan.capacitySource).toBe('history');
  });

  it('donne des horaires, hors pause déjeuner', () => {
    const plan = buildPlan(
      [make({ title: 'a', estimateHours: 2 }), make({ title: 'b', estimateHours: 3 })],
      { today: new Date('2026-11-23T06:00:00'), days: 1, capacityHours: 8 },
    );
    const [first, second] = plan.days[0].items;
    expect(first.start).toBe('09:00');
    expect(first.end).toBe('11:00');
    // La 2e tâche (3 h) commence à 11 h, s'arrête à la pause, puis reprend à 13 h.
    expect(second.segments).toEqual([
      { start: '11:00', end: '12:00' },
      { start: '13:00', end: '15:00' },
    ]);
  });

  it('place les tâches autour des réunions', () => {
    const plan = buildPlan([make({ estimateHours: 1 })], {
      today: new Date('2026-11-23T06:00:00'),
      days: 1,
      busy: { '2026-11-23': [{ start: 9 * 60, end: 11 * 60 }] },
    });
    expect(plan.days[0].items[0].start).toBe('11:00');
  });

  it('écarte les tâches ignorées et les liste', () => {
    const plan = buildPlan([make({ planIgnored: true, title: 'non' }), make({ title: 'oui' })], {
      today: monday,
      days: 1,
    });
    expect(plan.days[0].items.map((i) => i.task.title)).toEqual(['oui']);
    expect(plan.ignored.map((t) => t.title)).toEqual(['non']);
  });

  it('suit les horaires et les pauses saisis', () => {
    const plan = buildPlan([make({ estimateHours: 1 }), make({ estimateHours: 1 })], {
      today: new Date('2026-11-23T06:00:00'),
      days: 1,
      capacityHours: 8,
      schedule: () => ({
        start: '10:00',
        end: '12:00',
        breaks: [{ start: '10:00', end: '10:30' }],
      }),
    });
    expect(plan.days[0].items[0].start).toBe('10:30');
    // 1 h 30 libres seulement : la seconde tâche d'une heure ne tient pas.
    expect(plan.days[0].capacity).toBe(1.5);
    expect(plan.later.length).toBe(1);
  });

  it('ne planifie rien un jour off', () => {
    const plan = buildPlan([make({ estimateHours: 1 })], {
      today: monday,
      days: 2,
      schedule: (date) => ({
        start: '09:00',
        end: '18:00',
        breaks: [],
        off: date === '2026-11-23',
      }),
    });
    expect(plan.days[0].off).toBe(true);
    expect(plan.days[0].items.length).toBe(0);
    expect(plan.days[1].items.length).toBe(1);
  });

  it('étale une tâche plus longue que la plage libre en enjambant la pause', () => {
    const plan = buildPlan([make({ estimateHours: 7 })], {
      today: new Date('2026-11-23T06:00:00'),
      days: 1,
      capacityHours: 8,
    });
    expect(plan.days[0].items[0].start).toBe('09:00');
    expect(plan.days[0].items[0].end).toBe('17:00');
  });

  it('place les parties d’une tâche scindée de part et d’autre de la pause', () => {
    const plan = buildPlan([make({ title: 'long', split: [3, 1], estimateHours: 4 })], {
      today: new Date('2026-11-23T06:00:00'),
      days: 1,
      capacityHours: 8,
    });
    const [one, two] = plan.days[0].items;
    expect(one.part).toBe(1);
    expect(one.start).toBe('09:00');
    expect(one.end).toBe('12:00');
    expect(two.part).toBe(2);
    expect(two.start).toBe('13:00');
  });

  it('place la partie 2 après la partie 1, même un autre jour', () => {
    const plan = buildPlan([make({ split: [4, 4], estimateHours: 8 })], {
      today: new Date('2026-11-23T06:00:00'),
      days: 2,
      capacityHours: 4,
    });
    expect(plan.days[0].items.map((i) => i.part)).toEqual([1]);
    expect(plan.days[1].items.map((i) => i.part)).toEqual([2]);
  });

  it('coupe automatiquement une tâche par une pause et reprend après', () => {
    // 11:00 – 11:45 libre, pause jusqu'à 14:00 : 2 h de travail = 45 min + 1 h 15.
    const plan = buildPlan([make({ estimateHours: 2 })], {
      today: new Date('2026-11-23T06:00:00'),
      days: 1,
      capacityHours: 8,
      schedule: () => ({
        start: '11:00',
        end: '18:00',
        breaks: [{ start: '11:45', end: '14:00' }],
      }),
    });
    expect(plan.days[0].items[0].segments).toEqual([
      { start: '11:00', end: '11:45' },
      { start: '14:00', end: '15:15' },
    ]);
  });

  it('ignore les plages libres de moins de 30 min', () => {
    const plan = buildPlan([make({ estimateHours: 1 })], {
      today: new Date('2026-11-23T06:00:00'),
      days: 1,
      capacityHours: 8,
      schedule: () => ({
        start: '09:00',
        end: '18:00',
        breaks: [{ start: '09:15', end: '10:00' }],
      }),
    });
    expect(plan.days[0].items[0].segments).toEqual([{ start: '10:00', end: '11:00' }]);
  });

  it('conserve le créneau d’une tâche déjà planifiée et place les autres autour', () => {
    const plan = buildPlan(
      [
        make({
          title: 'fixe',
          estimateHours: 2,
          workStart: '2026-11-23',
          workEnd: '2026-11-23',
          workStartTime: '09:00',
          workEndTime: '11:00',
        }),
        make({ title: 'libre', estimateHours: 1, priority: 'HIGH' }),
      ],
      { today: new Date('2026-11-23T06:00:00'), days: 1, capacityHours: 8 },
    );
    const byTitle = Object.fromEntries(plan.days[0].items.map((i) => [i.task.title, i]));
    expect(byTitle['fixe'].fixed).toBe(true);
    expect(byTitle['fixe'].start).toBe('09:00');
    expect(byTitle['libre'].start).toBe('11:00');
  });

  it('replace une tâche dont la planification est passée', () => {
    const plan = buildPlan(
      [
        make({
          estimateHours: 1,
          workStart: '2026-11-20',
          workEnd: '2026-11-20',
          workStartTime: '09:00',
          workEndTime: '10:00',
        }),
      ],
      { today: new Date('2026-11-23T06:00:00'), days: 1, capacityHours: 8 },
    );
    expect(plan.days[0].items[0].fixed).toBeUndefined();
  });

  it('conserve les créneaux enregistrés d’une tâche coupée par une pause', () => {
    const plan = buildPlan(
      [
        make({
          estimateHours: 2,
          workSlots: [
            { part: 0, date: '2026-11-23', start: '11:00', end: '11:45' },
            { part: 0, date: '2026-11-23', start: '14:00', end: '15:15' },
          ],
        }),
      ],
      { today: new Date('2026-11-23T06:00:00'), days: 1, capacityHours: 8 },
    );
    expect(plan.days[0].items[0].fixed).toBe(true);
    expect(plan.days[0].items[0].segments?.length).toBe(2);
  });

  it('évite les réunions par défaut, mais pas si la tâche le permet explicitement', () => {
    const base = {
      today: new Date('2026-11-23T06:00:00'),
      days: 1,
      capacityHours: 8,
      busy: { '2026-11-23': [{ start: 9 * 60, end: 11 * 60 }] },
    };
    const normal = buildPlan([make({ estimateHours: 1 })], base);
    const allowed = buildPlan([make({ estimateHours: 1, duringMeetings: true })], base);
    expect(normal.days[0].items[0].start).toBe('11:00');
    expect(allowed.days[0].items[0].start).toBe('09:00');
  });

  it('une tâche permise pendant une réunion respecte quand même les pauses', () => {
    const plan = buildPlan([make({ estimateHours: 1, duringMeetings: true })], {
      today: new Date('2026-11-23T06:00:00'),
      days: 1,
      capacityHours: 8,
      schedule: () => ({
        start: '09:00',
        end: '18:00',
        breaks: [{ start: '09:00', end: '10:00' }],
      }),
      busy: { '2026-11-23': [{ start: 9 * 60, end: 11 * 60 }] },
    });
    expect(plan.days[0].items[0].start).toBe('10:00');
  });
});
