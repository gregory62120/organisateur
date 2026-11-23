import {
  cumulativeBalance,
  Contract,
  DayEntry,
  dayResult,
  formatDuration,
  splitWeekly,
  mondayOf,
  normalizeEntry,
  weekResult,
  workedMinutes,
} from './timesheet';

const entry = (overrides: Partial<DayEntry>): DayEntry => ({ date: '2026-11-23', ...overrides });
const TODAY = '2026-11-27'; // vendredi
const DEFAULT_CONTRACT: Contract = {
  minutes: [420, 420, 420, 420, 420, 0, 0],
  days: [true, true, true, true, true, false, false],
};

describe('timesheet', () => {
  it('calcule le temps travaillé avec la pause', () => {
    expect(workedMinutes(entry({ start: '09:00', end: '18:00', breakMinutes: 60 }))).toBe(480);
    expect(workedMinutes(entry({ start: '09:00' }))).toBe(0);
    expect(workedMinutes(entry({ start: '18:00', end: '09:00' }))).toBe(0);
  });

  it('additionne le matin et l’après-midi : la pause du midi n’est pas comptée', () => {
    const day = entry({ amStart: '08:30', amEnd: '12:30', pmStart: '13:30', pmEnd: '17:30' });
    expect(workedMinutes(day)).toBe(480);
    // Autre pause en plus de celle du midi.
    expect(workedMinutes({ ...day, breakMinutes: 15 })).toBe(465);
    // Une demi-journée : seulement le matin.
    expect(workedMinutes(entry({ amStart: '08:30', amEnd: '12:30' }))).toBe(240);
    // Plage incomplète ignorée.
    expect(workedMinutes(entry({ amStart: '08:30', pmStart: '13:30', pmEnd: '17:30' }))).toBe(240);
  });

  it('convertit une ancienne saisie à plage unique en matin', () => {
    expect(normalizeEntry(entry({ start: '09:00', end: '12:00' }))).toEqual({
      date: '2026-11-23',
      amStart: '09:00',
      amEnd: '12:00',
    });
  });

  it('compte les heures en plus et manquantes sur un jour', () => {
    const over = dayResult(
      '2026-11-23',
      entry({ start: '09:00', end: '18:00', breakMinutes: 60 }),
      DEFAULT_CONTRACT,
      TODAY,
    );
    expect(over.balance).toBe(60);
    const under = dayResult(
      '2026-11-23',
      entry({ start: '09:00', end: '16:00', breakMinutes: 60 }),
      DEFAULT_CONTRACT,
      TODAY,
    );
    expect(under.balance).toBe(-60);
  });

  it('un jour passé sans saisie est manquant, un jour à venir ne compte pas', () => {
    expect(dayResult('2026-11-24', undefined, DEFAULT_CONTRACT, TODAY).balance).toBe(-420);
    const future = dayResult('2026-11-30', undefined, DEFAULT_CONTRACT, TODAY);
    expect(future.counted).toBe(false);
    expect(future.balance).toBe(0);
  });

  it('un week-end travaillé est entièrement en heures supplémentaires', () => {
    const saturday = dayResult(
      '2026-11-28',
      { date: '2026-11-28', start: '10:00', end: '12:00' },
      DEFAULT_CONTRACT,
      '2026-11-29',
    );
    expect(saturday.balance).toBe(120);
  });

  it('un congé ne manque pas, une récupération consomme des heures', () => {
    expect(
      dayResult(
        '2026-11-24',
        entry({ date: '2026-11-24', absence: 'leave' }),
        DEFAULT_CONTRACT,
        TODAY,
      ).balance,
    ).toBe(0);
    expect(
      dayResult(
        '2026-11-24',
        entry({ date: '2026-11-24', absence: 'recovery' }),
        DEFAULT_CONTRACT,
        TODAY,
      ).balance,
    ).toBe(-420);
  });

  it('totalise la semaine', () => {
    const entries = new Map<string, DayEntry>([
      ['2026-11-23', { date: '2026-11-23', start: '09:00', end: '18:00', breakMinutes: 60 }],
      ['2026-11-24', { date: '2026-11-24', start: '09:00', end: '17:00', breakMinutes: 60 }],
      ['2026-11-25', { date: '2026-11-25', absence: 'leave' }],
    ]);
    const week = weekResult('2026-11-23', entries, DEFAULT_CONTRACT, '2026-11-26');
    expect(week.worked).toBe(480 + 420);
    // lundi, mardi dus ; mercredi congé ; jeudi aujourd'hui sans saisie : pas encore compté.
    expect(week.expected).toBe(840);
    expect(week.balance).toBe(60);
  });

  it('cumule le solde depuis la première saisie', () => {
    const entries: DayEntry[] = [
      { date: '2026-11-23', start: '09:00', end: '18:00', breakMinutes: 60 },
    ];
    // +1 h lundi, puis mardi, mercredi, jeudi manquants (3 × 7 h) avant le vendredi en cours.
    expect(cumulativeBalance(entries, DEFAULT_CONTRACT, TODAY)).toBe(60 - 3 * 420);
  });

  it('formate les durées', () => {
    expect(formatDuration(450)).toBe('7h30');
    expect(formatDuration(75, true)).toBe('+1h15');
    expect(formatDuration(-45, true)).toBe('−0h45');
    expect(formatDuration(0, true)).toBe('0h00');
  });

  it('trouve le lundi d’une date', () => {
    expect(mondayOf(new Date('2026-11-29T12:00:00')).getDate()).toBe(23);
  });

  it('répartit un total hebdomadaire sur 5 jours', () => {
    const weekdays = [true, true, true, true, true, false, false];
    expect(splitWeekly(39, weekdays)).toEqual([468, 468, 468, 468, 468, 0, 0]);
    expect(splitWeekly(35, weekdays)).toEqual([420, 420, 420, 420, 420, 0, 0]);
    // 37 h 01 = 2221 min : la minute en trop va au premier jour.
    expect(splitWeekly(37 + 1 / 60, weekdays)).toEqual([445, 444, 444, 444, 444, 0, 0]);
  });

  it('répartit sur les 7 jours par défaut, ou sur les jours choisis', () => {
    expect(splitWeekly(35)).toEqual([300, 300, 300, 300, 300, 300, 300]);
    expect(splitWeekly(40, [true, true, true, true, false, false, false])).toEqual([
      600, 600, 600, 600, 0, 0, 0,
    ]);
    expect(splitWeekly(10, [false, false, false, false, false, false, false])).toEqual([
      0, 0, 0, 0, 0, 0, 0,
    ]);
  });
});
