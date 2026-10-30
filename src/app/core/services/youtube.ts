const VIDEO_ID = /^[\w-]{11}$/;

const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'];

/** Identifiant de la vidéo d'un lien YouTube (watch, youtu.be, shorts, embed, live) ou d'un identifiant seul. */
export function parseYoutubeVideoId(input: string): string | null {
  const text = input.trim();
  if (VIDEO_ID.test(text)) {
    return text;
  }

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const [first, second] = url.pathname.split('/').filter(Boolean);
  let candidate: string | null | undefined;

  if (host === 'youtu.be') {
    candidate = first;
  } else if (YOUTUBE_HOSTS.includes(host)) {
    candidate = ['embed', 'shorts', 'live', 'v'].includes(first)
      ? second
      : url.searchParams.get('v');
  }

  return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}

/** « 3:05 » ou « 1:02:09 » ; « — » quand la durée est inconnue. */
export function formatDuration(seconds?: number): string {
  if (seconds === undefined || !isFinite(seconds) || seconds < 0) {
    return '—';
  }
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** « 14:05 » */
export function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
