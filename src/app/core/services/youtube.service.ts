import { Injectable } from '@angular/core';

import { YTNamespace, YTPlayer, YTPlayerOptions } from './youtube-api.types';

const API_URL = 'https://www.youtube.com/iframe_api';
const OEMBED_URL = 'https://www.youtube.com/oembed';

/** Temps maximal (ms) pour lire la durée d'une vidéo, et intervalle entre deux essais. */
const DURATION_TIMEOUT = 8000;
const DURATION_POLL = 200;

export interface VideoMetadata {
  title: string;
  author?: string;
}

/** Accès à YouTube : métadonnées d'une vidéo, durée, et lecteur intégré. */
@Injectable({
  providedIn: 'root',
})
export class YoutubeService {
  private api?: Promise<YTNamespace>;

  /** Charge l'API IFrame une seule fois. */
  loadApi(): Promise<YTNamespace> {
    if (window.YT?.Player) {
      return Promise.resolve(window.YT);
    }
    this.api ??= new Promise<YTNamespace>((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve(window.YT as YTNamespace);
      };

      const script = document.createElement('script');
      script.src = API_URL;
      script.async = true;
      script.onerror = () => {
        this.api = undefined;
        reject(new Error('Impossible de charger le lecteur YouTube (connexion ?).'));
      };
      document.head.appendChild(script);
    });
    return this.api;
  }

  /** Titre et auteur d'une vidéo, ou une erreur si elle est introuvable, privée ou hors ligne. */
  async metadata(videoId: string): Promise<VideoMetadata> {
    const url = `${OEMBED_URL}?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`;
    let response: Response;
    try {
      response = await fetch(url);
    } catch {
      throw new Error('YouTube est injoignable : vérifiez la connexion.');
    }
    if (!response.ok) {
      throw new Error('Vidéo introuvable, privée ou non intégrable.');
    }
    const data = (await response.json()) as { title?: string; author_name?: string };
    return { title: data.title || `Vidéo ${videoId}`, author: data.author_name };
  }

  /**
   * Durée en secondes, lue par un lecteur invisible qui n'est jamais lancé ;
   * `undefined` si elle n'a pas pu être lue à temps.
   */
  async duration(videoId: string): Promise<number | undefined> {
    let host: HTMLElement | undefined;
    let player: YTPlayer | undefined;
    try {
      const yt = await this.loadApi();
      host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;overflow:hidden';
      host.appendChild(document.createElement('div'));
      document.body.appendChild(host);

      player = await new Promise<YTPlayer>((resolve) => {
        const created = new yt.Player(host!.firstElementChild as HTMLElement, {
          width: 1,
          height: 1,
          videoId,
          events: { onReady: () => resolve(created) },
        });
      });

      const deadline = Date.now() + DURATION_TIMEOUT;
      while (Date.now() < deadline) {
        const seconds = player.getDuration();
        if (seconds > 0) {
          return seconds;
        }
        await new Promise((r) => setTimeout(r, DURATION_POLL));
      }
      return undefined;
    } catch {
      return undefined;
    } finally {
      player?.destroy();
      host?.remove();
    }
  }

  /** Lecteur visible dans l'élément donné. */
  async createPlayer(element: HTMLElement, options: YTPlayerOptions): Promise<YTPlayer> {
    const yt = await this.loadApi();
    return new yt.Player(element, options);
  }
}
