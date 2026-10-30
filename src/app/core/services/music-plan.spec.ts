import { nextStart, PLAN_STEP, snapStart, toMinutes, toTime } from './music-plan';

describe('music-plan', () => {
  it('convertit les heures et les minutes', () => {
    expect(toMinutes('00:00')).toBe(0);
    expect(toMinutes('14:30')).toBe(870);
    expect(toTime(0)).toBe('00:00');
    expect(toTime(870)).toBe('14:30');
    expect(toTime(toMinutes('09:05'))).toBe('09:05');
  });

  describe('snapStart', () => {
    it('arrondit au pas de 5 minutes le plus proche', () => {
      expect(PLAN_STEP).toBe(5);
      expect(snapStart(602)).toBe(600);
      expect(snapStart(603)).toBe(605);
      expect(snapStart(600)).toBe(600);
    });

    it('reste dans la journée', () => {
      expect(snapStart(-30)).toBe(0);
      expect(snapStart(24 * 60 + 100)).toBe(23 * 60 + 55);
    });
  });

  describe('nextStart', () => {
    it('suit la dernière musique placée, arrondie au pas', () => {
      expect(nextStart({ ends: [600, 647], isToday: true, nowMinutes: 500 })).toBe(650);
    });

    it('propose maintenant, arrondi, pour aujourd’hui sans musique placée', () => {
      expect(nextStart({ ends: [], isToday: true, nowMinutes: 602 })).toBe(605);
    });

    it('propose 9 h pour un autre jour', () => {
      expect(nextStart({ ends: [], isToday: false, nowMinutes: 602 })).toBe(540);
    });

    it('ne dépasse pas 23:55', () => {
      expect(nextStart({ ends: [24 * 60], isToday: false, nowMinutes: 0 })).toBe(23 * 60 + 55);
    });
  });
});
