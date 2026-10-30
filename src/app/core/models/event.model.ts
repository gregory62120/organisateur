export type EventColor = 'blue' | 'violet' | 'green' | 'orange' | 'red' | 'cyan';

export const EVENT_COLORS: EventColor[] = ['blue', 'violet', 'green', 'orange', 'red', 'cyan'];

export const EVENT_COLOR_LABELS: Record<EventColor, string> = {
  blue: 'Bleu',
  violet: 'Violet',
  green: 'Vert',
  orange: 'Orange',
  red: 'Rouge',
  cyan: 'Turquoise',
};

/** Un évènement du calendrier (réunion, revue de sprint, jalon…), distinct des tâches. */
export interface ProjectEvent {
  id: string;

  title: string;

  /** Jour de l'évènement, au format YYYY-MM-DD. */
  date: string;

  /** Heures au format HH:mm ; absentes pour un évènement sur toute la journée. */
  startTime?: string;

  endTime?: string;

  description: string;

  color: EventColor;

  createdAt: string;

  updatedAt: string;
}
