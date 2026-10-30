/** Pas (minutes) sur lequel une musique se cale quand on la place ou qu'on la déplace. */
export const PLAN_STEP = 5;

/** Dernière heure de début possible : 23:55. */
const LAST_START = 24 * 60 - PLAN_STEP;

/** « 14:30 » en minutes depuis minuit. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** 870 en « 14:30 ». */
export function toTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  return `${String(h).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Arrondit au pas le plus proche et reste dans la journée (00:00 → 23:55). */
export function snapStart(minutes: number): number {
  const snapped = Math.round(minutes / PLAN_STEP) * PLAN_STEP;
  return Math.min(Math.max(snapped, 0), LAST_START);
}

/**
 * Heure proposée pour une musique ajoutée sans indication : à la suite de la dernière musique
 * déjà placée ce jour-là ; sinon maintenant (aujourd'hui) ou 9 h.
 */
export function nextStart(options: {
  /** Fins (minutes) des musiques déjà placées ce jour-là. */
  ends: number[];
  isToday: boolean;
  nowMinutes: number;
}): number {
  const { ends, isToday, nowMinutes } = options;
  if (ends.length) {
    return snapStart(Math.ceil(Math.max(...ends) / PLAN_STEP) * PLAN_STEP);
  }
  return snapStart(isToday ? Math.ceil(nowMinutes / PLAN_STEP) * PLAN_STEP : 9 * 60);
}

/** Type de donnée échangé quand on fait glisser une musique du panneau vers le calendrier. */
export const TRACK_DRAG_TYPE = 'application/x-tf-music-track';
