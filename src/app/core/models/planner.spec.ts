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
    expect(second.start).toBe('13:00');
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
});
