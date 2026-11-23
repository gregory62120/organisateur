import { Task } from './task.model';
import {
  filterByRange,
  formatHms,
  formatMinutes,
  logMinutes,
  groupTime,
  NO_TAG,
  parseDuration,
  periodRange,
  splitSpan,
  TimeLog,
  totalMinutes,
} from './time-log';

const task = (id: string, overrides: Partial<Task> = {}): Task => ({
  id,
  title: `Tâche ${id}`,
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

const log = (taskId: string, date: string, minutes: number): TimeLog => ({
  id: `${taskId}-${date}-${minutes}`,
  taskId,
  date,
  minutes,
  createdAt: '2026-11-23T10:00:00.000Z',
});

describe('time-log', () => {
  const tasks = [
    task('a', { tags: ['front', 'urgent'], estimateHours: 2 }),
    task('b', { tags: ['front'] }),
    task('c'),
  ];
  const logs = [
    log('a', '2026-11-23', 60),
    log('a', '2026-11-24', 30),
    log('b', '2026-11-24', 45),
    log('c', '2026-11-25', 15),
    log('zz', '2026-11-25', 10),
  ];

  it('totalise et filtre par période', () => {
    expect(totalMinutes(logs)).toBe(160);
    const week = filterByRange(logs, periodRange('week', new Date('2026-11-25T12:00:00')));
    expect(week.length).toBe(5);
    expect(filterByRange(logs, { from: '2026-11-25' }).length).toBe(2);
    expect(filterByRange(logs, { to: '2026-11-23' }).length).toBe(1);
  });

  it('calcule les bornes de la semaine et du mois', () => {
    expect(periodRange('week', new Date('2026-11-29T12:00:00'))).toEqual({
      from: '2026-11-23',
      to: '2026-11-29',
    });
    expect(periodRange('month', new Date('2026-11-15T12:00:00'))).toEqual({
      from: '2026-11-01',
      to: '2026-11-30',
    });
    expect(periodRange('all', new Date())).toEqual({});
  });

  it('regroupe par tâche, avec estimation et tâche supprimée', () => {
    const groups = groupTime(logs, tasks, 'task');
    expect(groups[0]).toMatchObject({ key: 'a', minutes: 90, estimate: 120, spentAll: 90 });
    expect(groups.find((g) => g.key === 'zz')?.label).toBe('Tâche supprimée');
  });

  it('regroupe par étiquette : le temps compte dans chaque étiquette', () => {
    const groups = groupTime(logs, tasks, 'tag');
    const by = Object.fromEntries(groups.map((g) => [g.label, g]));
    expect(by['front'].minutes).toBe(60 + 30 + 45);
    expect(by['front'].tasks).toBe(2);
    expect(by['urgent'].minutes).toBe(90);
    expect(by[NO_TAG].minutes).toBe(15 + 10);
    expect(groups[0].label).toBe('front');
  });

  it('lit les durées saisies', () => {
    expect(parseDuration('1h30')).toBe(90);
    expect(parseDuration('1:30')).toBe(90);
    expect(parseDuration('2h')).toBe(120);
    expect(parseDuration('1,5')).toBe(90);
    expect(parseDuration('45min')).toBe(45);
    expect(parseDuration('90 min')).toBe(90);
    expect(parseDuration('0')).toBeUndefined();
    expect(parseDuration('abc')).toBeUndefined();
    expect(parseDuration('')).toBeUndefined();
  });

  it('formate les durées', () => {
    expect(formatMinutes(125)).toBe('2h05');
    expect(formatMinutes(45)).toBe('0h45');
  });

  it('regroupe par responsable, statut, priorité et jour', () => {
    const list = [
      task('a', { assignedTo: 'Alice', status: 'DONE', priority: 'HIGH' }),
      task('b', { assignedTo: 'Bob' }),
      task('c'),
    ];
    const data = [
      log('a', '2026-11-24', 60),
      log('b', '2026-11-23', 30),
      log('c', '2026-11-23', 15),
    ];
    const names = (by: Parameters<typeof groupTime>[2]) =>
      groupTime(data, list, by).map((g) => [g.label, g.minutes]);

    expect(names('assignee')).toEqual([
      ['Alice', 60],
      ['Bob', 30],
      ['Non assigné', 15],
    ]);
    expect(names('status')).toEqual([
      ['Terminé', 60],
      ['À faire', 45],
    ]);
    expect(names('priority')).toEqual([
      ['Haute', 60],
      ['Moyenne', 45],
    ]);
    // Les jours sont dans l'ordre chronologique, pas par durée.
    expect(groupTime(data, list, 'day').map((g) => g.key)).toEqual(['2026-11-23', '2026-11-24']);
  });

  it('découpe un chrono : secondes conservées, un jour, ou à cheval sur minuit', () => {
    const at = (h: number, m: number, day = 23) => new Date(2026, 10, day, h, m, 0).getTime();
    // Quelques secondes comptent aussi.
    expect(splitSpan(at(9, 0), at(9, 0) + 20_000)).toEqual([
      { date: '2026-11-23', minutes: 1, seconds: 20, start: '09:00', end: '09:00' },
    ]);
    expect(splitSpan(at(9, 0), at(9, 0) + 400)).toEqual([]);
    expect(splitSpan(at(9, 0), at(10, 30))).toEqual([
      { date: '2026-11-23', minutes: 90, seconds: 5400, start: '09:00', end: '10:30' },
    ]);
    expect(splitSpan(at(23, 30), at(0, 45, 24))).toEqual([
      { date: '2026-11-23', minutes: 30, seconds: 1800, start: '23:30', end: '23:59' },
      { date: '2026-11-24', minutes: 45, seconds: 2700, start: '00:00', end: '00:45' },
    ]);
  });

  it('affiche les secondes', () => {
    expect(formatHms(0.75)).toBe('45s');
    expect(formatHms(20 + 5 / 60)).toBe('20m05s');
    expect(formatHms(80 + 5 / 60)).toBe('1h20m05s');
    expect(formatHms(60)).toBe('1h00m00s');
  });

  it('compte les secondes exactes du chrono dans les totaux', () => {
    const exact: TimeLog = { ...log('a', '2026-11-23', 1), seconds: 75 };
    expect(logMinutes(exact)).toBe(1.25);
    expect(logMinutes(log('a', '2026-11-23', 2))).toBe(2);
    expect(totalMinutes([exact, log('a', '2026-11-23', 2)])).toBeCloseTo(3.25);
  });
});
