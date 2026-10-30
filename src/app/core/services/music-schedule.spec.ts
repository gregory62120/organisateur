import { MusicTrack } from '../models/music.model';
import { buildSchedule, DEFAULT_TRACK_SECONDS, totalSeconds } from './music-schedule';

const track = (id: string, duration?: number): MusicTrack => ({
  id,
  videoId: id.padEnd(11, 'x'),
  title: id,
  duration,
  addedAt: '2026-01-01T00:00:00.000Z',
});

const at = (h: number, m = 0, s = 0) => new Date(2026, 9, 29, h, m, s);
const clock = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

describe('buildSchedule', () => {
  const tracks = [track('a', 180), track('b', 240), track('c', 300)];

  describe('à l’arrêt (aperçu)', () => {
    it('place les titres bout à bout à partir de l’heure arrondie aux 5 minutes suivantes', () => {
      const schedule = buildSchedule({ tracks, now: at(10, 2, 30) });

      expect(schedule.map((s) => s.status)).toEqual(['preview', 'preview', 'preview']);
      expect(schedule.map((s) => [clock(s.start), clock(s.end)])).toEqual([
        ['10:05', '10:08'],
        ['10:08', '10:12'],
        ['10:12', '10:17'],
      ]);
    });

    it('garde l’heure quand elle est déjà un multiple de 5 minutes', () => {
      expect(clock(buildSchedule({ tracks, now: at(10, 5) })[0].start)).toBe('10:05');
    });

    it('utilise une durée par défaut quand elle est inconnue, en le signalant', () => {
      const [first, second] = buildSchedule({
        tracks: [track('x'), track('y', 60)],
        now: at(9, 0),
      });

      expect(first.durationKnown).toBe(false);
      expect(first.end.getTime() - first.start.getTime()).toBe(DEFAULT_TRACK_SECONDS * 1000);
      expect(second.durationKnown).toBe(true);
    });

    it('accepte une playlist vide', () => {
      expect(buildSchedule({ tracks: [], now: at(9) })).toEqual([]);
    });

    it('traite un titre en cours introuvable comme un arrêt', () => {
      const schedule = buildSchedule({ tracks, now: at(9), currentId: 'disparu' });

      expect(schedule.every((s) => s.status === 'preview')).toBe(true);
    });
  });

  describe('en lecture', () => {
    it('cale le titre en cours sur sa position et enchaîne les suivants', () => {
      const schedule = buildSchedule({
        tracks,
        now: at(10, 0, 0),
        currentId: 'b',
        position: 60,
      });

      expect(schedule.map((s) => [s.track.id, s.status])).toEqual([
        ['b', 'current'],
        ['c', 'upcoming'],
      ]);
      expect(clock(schedule[0].start)).toBe('9:59');
      expect(clock(schedule[0].end)).toBe('10:03');
      expect(clock(schedule[1].start)).toBe('10:03');
      expect(clock(schedule[1].end)).toBe('10:08');
    });

    it('préfère la durée lue par le lecteur à celle enregistrée', () => {
      const [current] = buildSchedule({
        tracks,
        now: at(10, 0),
        currentId: 'a',
        position: 0,
        currentDuration: 600,
      });

      expect(current.end.getTime() - current.start.getTime()).toBe(600_000);
    });

    it('ajoute les titres déjà écoutés avec leurs heures réelles, en ignorant ceux supprimés', () => {
      const schedule = buildSchedule({
        tracks,
        now: at(10, 10),
        currentId: 'c',
        position: 0,
        history: [
          { trackId: 'a', start: at(9, 55).getTime(), end: at(9, 58).getTime() },
          { trackId: 'supprimé', start: at(9, 58).getTime(), end: at(10, 0).getTime() },
          { trackId: 'b', start: at(10, 0).getTime(), end: at(10, 4).getTime() },
        ],
      });

      expect(schedule.map((s) => [s.track.id, s.status])).toEqual([
        ['a', 'played'],
        ['b', 'played'],
        ['c', 'current'],
      ]);
      expect(clock(schedule[1].end)).toBe('10:04');
    });

    it('n’a pas de titre à venir quand le dernier est en cours', () => {
      const schedule = buildSchedule({ tracks, now: at(10), currentId: 'c' });

      expect(schedule.filter((s) => s.status === 'upcoming')).toEqual([]);
    });
  });
});

describe('totalSeconds', () => {
  it('additionne les durées, avec la durée par défaut pour les inconnues', () => {
    expect(totalSeconds([track('a', 100), track('b', 50)])).toBe(150);
    expect(totalSeconds([track('a', 100), track('b')])).toBe(100 + DEFAULT_TRACK_SECONDS);
    expect(totalSeconds([])).toBe(0);
  });
});
