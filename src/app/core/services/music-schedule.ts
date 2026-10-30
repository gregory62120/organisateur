import { MusicTrack } from '../models/music.model';

export type ScheduleStatus = 'played' | 'current' | 'upcoming' | 'preview';

/** Un titre placé sur la journée. */
export interface ScheduledTrack {
  track: MusicTrack;
  start: Date;
  end: Date;
  status: ScheduleStatus;
  /** Faux quand la durée n'est pas connue : une durée par défaut est alors utilisée. */
  durationKnown: boolean;
}

/** Un titre déjà écouté pendant la session, avec ses heures réelles. */
export interface PlayedTrack {
  trackId: string;
  start: number;
  end: number;
}

/** Durée supposée d'un titre dont la durée n'est pas connue (secondes). */
export const DEFAULT_TRACK_SECONDS = 4 * 60;

/** Pas d'arrondi de l'heure de départ de l'aperçu (minutes). */
const PREVIEW_STEP = 5;

interface ScheduleInput {
  tracks: MusicTrack[];
  now: Date;
  /** Titre en cours de lecture, s'il y en a un. */
  currentId?: string | null;
  /** Position de lecture dans le titre en cours (secondes). */
  position?: number;
  /** Durée du titre en cours lue par le lecteur, plus fiable que celle enregistrée. */
  currentDuration?: number;
  history?: PlayedTrack[];
}

/**
 * Place la playlist sur la journée.
 * - À l'arrêt : un aperçu, les titres bout à bout à partir de l'heure actuelle arrondie à 5 min.
 * - En lecture : les titres déjà écoutés (heures réelles), le titre en cours (calé sur sa position)
 *   puis ceux à venir, à la suite.
 */
export function buildSchedule(input: ScheduleInput): ScheduledTrack[] {
  const { tracks, now, currentId, position = 0, currentDuration, history = [] } = input;
  const seconds = (track: MusicTrack, override?: number) =>
    override || track.duration || DEFAULT_TRACK_SECONDS;
  const known = (track: MusicTrack, override?: number) => !!(override || track.duration);

  const currentIndex = currentId ? tracks.findIndex((t) => t.id === currentId) : -1;

  if (currentIndex === -1) {
    const step = PREVIEW_STEP * 60_000;
    let cursor = Math.ceil(now.getTime() / step) * step;
    return tracks.map((track) => {
      const start = new Date(cursor);
      cursor += seconds(track) * 1000;
      return {
        track,
        start,
        end: new Date(cursor),
        status: 'preview',
        durationKnown: known(track),
      };
    });
  }

  const byId = new Map(tracks.map((t) => [t.id, t]));
  const played: ScheduledTrack[] = history
    .filter((h) => byId.has(h.trackId))
    .map((h) => ({
      track: byId.get(h.trackId) as MusicTrack,
      start: new Date(h.start),
      end: new Date(h.end),
      status: 'played' as const,
      durationKnown: true,
    }));

  const current = tracks[currentIndex];
  const start = now.getTime() - position * 1000;
  let cursor = start + seconds(current, currentDuration) * 1000;
  const schedule: ScheduledTrack[] = [
    ...played,
    {
      track: current,
      start: new Date(start),
      end: new Date(cursor),
      status: 'current',
      durationKnown: known(current, currentDuration),
    },
  ];

  for (const track of tracks.slice(currentIndex + 1)) {
    const trackStart = new Date(cursor);
    cursor += seconds(track) * 1000;
    schedule.push({
      track,
      start: trackStart,
      end: new Date(cursor),
      status: 'upcoming',
      durationKnown: known(track),
    });
  }
  return schedule;
}

/** Durée totale (secondes) d'une liste de titres, durées inconnues comprises. */
export function totalSeconds(tracks: MusicTrack[]): number {
  return tracks.reduce((sum, t) => sum + (t.duration || DEFAULT_TRACK_SECONDS), 0);
}
