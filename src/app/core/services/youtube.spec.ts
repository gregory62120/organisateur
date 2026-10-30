import { formatClock, formatDuration, parseYoutubeVideoId } from './youtube';

describe('parseYoutubeVideoId', () => {
  const id = 'dQw4w9WgXcQ';

  it.each([
    [`https://www.youtube.com/watch?v=${id}`],
    [`https://youtube.com/watch?v=${id}&t=42s&list=PL123`],
    [`http://m.youtube.com/watch?v=${id}`],
    [`https://music.youtube.com/watch?v=${id}&si=abc`],
    [`https://youtu.be/${id}`],
    [`https://youtu.be/${id}?si=xyz`],
    [`https://www.youtube.com/embed/${id}`],
    [`https://www.youtube.com/shorts/${id}`],
    [`https://www.youtube.com/live/${id}?feature=share`],
    [`www.youtube.com/watch?v=${id}`],
    [`youtu.be/${id}`],
    [`  ${id}  `],
  ])('extrait l’identifiant de %s', (input) => {
    expect(parseYoutubeVideoId(input)).toBe(id);
  });

  it.each([
    [''],
    ['pas un lien'],
    ['https://example.com/watch?v=dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch'],
    ['https://www.youtube.com/watch?v=trop-court'],
    ['https://www.youtube.com/playlist?list=PL123'],
    ['https://youtu.be/'],
  ])('refuse %s', (input) => {
    expect(parseYoutubeVideoId(input)).toBeNull();
  });
});

describe('formatDuration', () => {
  it('formate les minutes et les heures', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3599)).toBe('59:59');
    expect(formatDuration(3725)).toBe('1:02:05');
  });

  it('arrondit à la seconde', () => {
    expect(formatDuration(59.6)).toBe('1:00');
  });

  it('retourne un tiret quand la durée est inconnue ou invalide', () => {
    expect(formatDuration(undefined)).toBe('—');
    expect(formatDuration(NaN)).toBe('—');
    expect(formatDuration(-3)).toBe('—');
  });
});

describe('formatClock', () => {
  it('formate l’heure sur deux chiffres', () => {
    expect(formatClock(new Date(2026, 9, 29, 9, 5))).toBe('09:05');
    expect(formatClock(new Date(2026, 9, 29, 23, 40))).toBe('23:40');
  });
});
