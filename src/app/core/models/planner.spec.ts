import { Task } from './task.model';
import { bestSubset, buildPlan, workingDays } from './planner';

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

  it('utilise tout le temps libre de la journée, sans capacité apprise qui la bride', () => {
    // 8 h libres (9 h – 18 h moins le déjeuner) : sept tâches d'une heure tiennent le jour même.
    const tasks = Array.from({ length: 7 }, (_, i) => make({ title: `t${i}`, estimateHours: 1 }));
    const plan = buildPlan(tasks, { today: new Date('2026-11-23T06:00:00'), days: 2 });
    expect(plan.capacitySource).toBe('schedule');
    expect(plan.days[0].capacity).toBe(8);
    expect(plan.days[0].items.length).toBe(7);
    expect(plan.days[1].items.length).toBe(0);
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

  it('remplit mieux la journée : deux tâches de 3 h plutôt qu’une de 4 h qui laisse un trou', () => {
    // Capacité 6 h : A (4 h) ne laisse que 2 h de libre, alors que B + C = 6 h pile.
    const plan = buildPlan(
      [
        make({ title: 'A', estimateHours: 4 }),
        make({ title: 'B', estimateHours: 3 }),
        make({ title: 'C', estimateHours: 3 }),
      ],
      { today: new Date('2026-11-23T06:00:00'), days: 2, capacityHours: 6 },
    );
    expect(plan.days[0].items.map((i) => i.task.title).sort()).toEqual(['B', 'C']);
    expect(plan.days[0].hours).toBe(6);
    expect(plan.days[1].items.map((i) => i.task.title)).toEqual(['A']);
  });

  it('tient d’abord les échéances de la période, même face à une tâche plus prioritaire', () => {
    const plan = buildPlan(
      [
        make({ title: 'sans échéance', priority: 'HIGH', estimateHours: 4 }),
        make({
          title: 'échéance demain',
          priority: 'LOW',
          estimateHours: 4,
          dueDate: '2026-11-24',
        }),
        make({ title: 'échéance auj.', priority: 'LOW', estimateHours: 4, dueDate: '2026-11-23' }),
      ],
      { today: new Date('2026-11-23T06:00:00'), days: 2, capacityHours: 4 },
    );
    expect(plan.days[0].items.map((i) => i.task.title)).toEqual(['échéance auj.']);
    expect(plan.days[1].items.map((i) => i.task.title)).toEqual(['échéance demain']);
    expect(plan.later.map((i) => i.task.title)).toEqual(['sans échéance']);
  });

  it('place une tâche plus longue que la capacité sur une journée vide', () => {
    const plan = buildPlan([make({ estimateHours: 9 })], {
      today: new Date('2026-11-23T06:00:00'),
      days: 1,
      capacityHours: 6,
    });
    expect(plan.days[0].items.length).toBe(1);
  });

  it('sac à dos : meilleure valeur sous la capacité', () => {
    const picked = bestSubset(
      [
        { weight: 4, value: 10 },
        { weight: 3, value: 7 },
        { weight: 3, value: 7 },
      ],
      6,
    );
    expect(picked).toEqual([1, 2]);
    expect(bestSubset([{ weight: 5, value: 1 }], 3)).toEqual([]);
  });

  it('interruption voulue : début de A, B, puis reprise de A', () => {
    const b = make({ title: 'B', estimateHours: 1 });
    const a = make({
      title: 'A',
      estimateHours: 3,
      priority: 'HIGH',
      interruption: { by: b.id, afterMinutes: 60 },
    });
    const plan = buildPlan([a, b], {
      today: new Date('2026-11-23T06:00:00'),
      days: 1,
      capacityHours: 8,
    });
    const rows = plan.days[0].items.map((i) => [i.task.title, i.part ?? 0, i.start, i.end]);
    // La reprise de A (2 h restantes) s'étale de 11 h à 14 h autour de la pause du déjeuner.
    expect(rows).toEqual([
      ['A', 1, '09:00', '10:00'],
      ['B', 0, '10:00', '11:00'],
      ['A', 2, '11:00', '14:00'],
    ]);
    const resume = plan.days[0].items.filter((i) => i.task.title === 'A' && i.part === 2)[0];
    expect(resume.segments).toEqual([
      { start: '11:00', end: '12:00' },
      { start: '13:00', end: '14:00' },
    ]);
    expect(resume.reasons[0]).toContain('Reprise après');
  });

  it('interruption sans début : B passe d’abord puis A', () => {
    const b = make({ title: 'B', estimateHours: 1 });
    const a = make({
      title: 'A',
      estimateHours: 2,
      priority: 'HIGH',
      interruption: { by: b.id, afterMinutes: 0 },
    });
    const plan = buildPlan([a, b], {
      today: new Date('2026-11-23T06:00:00'),
      days: 1,
      capacityHours: 8,
    });
    expect(plan.days[0].items.map((i) => [i.task.title, i.start])).toEqual([
      ['B', '09:00'],
      ['A', '10:00'],
    ]);
  });

  it('une tâche se coupe autour d’une tâche déjà fixée et reprend après', () => {
    const plan = buildPlan(
      [
        make({
          title: 'fixe',
          estimateHours: 1,
          workStart: '2026-11-23',
          workEnd: '2026-11-23',
          workStartTime: '10:00',
          workEndTime: '11:00',
        }),
        make({ title: 'longue', estimateHours: 3, priority: 'HIGH' }),
      ],
      { today: new Date('2026-11-23T06:00:00'), days: 1, capacityHours: 8 },
    );
    const longue = plan.days[0].items.find((i) => i.task.title === 'longue');
    expect(longue?.segments).toEqual([
      { start: '09:00', end: '10:00' },
      { start: '11:00', end: '12:00' },
      { start: '13:00', end: '14:00' },
    ]);
  });

  it('ne replanifie que le temps restant d’une tâche déjà commencée', () => {
    const task = make({ estimateHours: 3 });
    const plan = buildPlan([task], {
      today: new Date('2026-11-23T06:00:00'),
      days: 1,
      capacityHours: 8,
      spent: { [task.id]: 90 },
    });
    expect(plan.days[0].items[0].hours).toBe(1.5);
    expect(plan.days[0].items[0].reasons.join(' ')).toContain('Reprise');
  });

  it('commence à l’heure de début saisie (8 h) et s’arrête à la fin (11 h 45)', () => {
    const plan = buildPlan(
      [make({ title: 'a', estimateHours: 2 }), make({ title: 'b', estimateHours: 3 })],
      {
        today: new Date('2026-11-23T06:00:00'),
        days: 1,
        schedule: () => ({ start: '08:00', end: '11:45', breaks: [] }),
      },
    );
    const items = plan.days[0].items;
    expect(items[0].start).toBe('08:00');
    // 3 h 45 libres : 2 h + 3 h ne tiennent pas ensemble, la seconde tâche passe au lendemain.
    expect(plan.days[0].capacity).toBe(3.75);
    expect(items.length).toBe(1);
    expect(plan.later.length).toBe(1);
  });

  it('replanifie un créneau déjà planifié devenu hors des horaires saisis', () => {
    const plan = buildPlan(
      [
        make({
          estimateHours: 1,
          workStart: '2026-11-23',
          workEnd: '2026-11-23',
          workStartTime: '09:00',
          workEndTime: '10:00',
        }),
      ],
      {
        today: new Date('2026-11-23T06:00:00'),
        days: 1,
        // Le créneau planifié à 9 h tombe maintenant dans une pause : il est replacé.
        schedule: () => ({
          start: '08:00',
          end: '11:45',
          breaks: [{ start: '08:30', end: '10:30' }],
        }),
      },
    );
    const item = plan.days[0].items[0];
    expect(item.fixed).toBeUndefined();
    expect(item.start).toBe('08:00');
  });
});
