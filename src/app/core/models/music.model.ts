/** Une vidéo YouTube de la playlist du projet, écoutée pendant la journée de travail. */
export interface MusicTrack {
  id: string;

  /** Identifiant de la vidéo YouTube (11 caractères). */
  videoId: string;

  title: string;

  author?: string;

  /** Durée en secondes ; absente tant qu'elle n'a pas pu être lue depuis YouTube. */
  duration?: number;

  addedAt: string;
}

/** Une musique placée sur le calendrier, à un jour et une heure précis. */
export interface MusicSlot {
  id: string;

  trackId: string;

  /** Jour, au format YYYY-MM-DD. */
  date: string;

  /** Heure de début, au format HH:mm. */
  startTime: string;
}
