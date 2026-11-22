export interface TimeRange {
  /** HH:mm */
  start: string;
  end: string;
}

/** Horaires de travail d'une journée : plage de travail et pauses (déjeuner, café…). */
export interface DaySchedule {
  start: string;
  end: string;
  breaks: TimeRange[];
  /** Journée sans travail (congé, week-end travaillé à l'inverse…) : rien n'est planifié. */
  off?: boolean;
}

export const DEFAULT_SCHEDULE: DaySchedule = {
  start: '09:00',
  end: '18:00',
  breaks: [{ start: '12:00', end: '13:00' }],
};

export const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

export const fromMinutes = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
