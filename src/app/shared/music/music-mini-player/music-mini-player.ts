import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { MusicPlayerService } from '../../../core/services/music-player.service';
import { formatDuration } from '../../../core/services/youtube';

/** Distance par défaut (px) entre le lecteur et les bords droit et bas de la fenêtre. */
const DEFAULT_MARGIN = 20;

/** Pas (px) d'un déplacement au clavier. */
const KEY_STEP = 16;

const STORAGE_KEY = 'tf-music-mini-position';

const SIZE_KEY = 'tf-music-mini-size';

/** Largeur (px) de la vidéo : par défaut, minimale et maximale. */
const DEFAULT_VIDEO_WIDTH = 220;
const MIN_VIDEO_WIDTH = 180;
const MAX_VIDEO_WIDTH = 720;

/** Pas (px) d'un redimensionnement au clavier. */
const SIZE_STEP = 20;

interface Offset {
  right: number;
  bottom: number;
}

/**
 * Lecteur flottant affiché sur toutes les pages tant qu'une musique est lancée :
 * il accueille la vidéo YouTube et les commandes, pour que l'écoute continue en changeant de page.
 */
@Component({
  selector: 'app-music-mini-player',
  standalone: true,
  template: `
    <aside
      class="mini"
      #mini
      [class.visible]="player.isActive()"
      [class.dragging]="dragging()"
      [class.resizing]="resizing()"
      [style.right.px]="offset().right"
      [style.bottom.px]="offset().bottom"
      [style.--video-w.px]="videoWidth()"
      aria-label="Lecteur de musique"
    >
      <button
        type="button"
        class="resize"
        title="Redimensionner la vidéo (double-clic : taille d'origine)"
        aria-label="Redimensionner le lecteur"
        (pointerdown)="startResize($event)"
        (pointermove)="moveResize($event)"
        (pointerup)="endResize()"
        (pointercancel)="endResize()"
        (dblclick)="resetSize()"
        (keydown)="onResizeKey($event)"
      >
        <span class="material-symbols-outlined">open_in_full</span>
      </button>

      <button
        type="button"
        class="grip"
        title="Déplacer le lecteur (double-clic : remettre en bas à droite)"
        aria-label="Déplacer le lecteur"
        (pointerdown)="startDrag($event)"
        (pointermove)="moveDrag($event)"
        (pointerup)="endDrag()"
        (pointercancel)="endDrag()"
        (dblclick)="reset()"
        (keydown)="onKey($event)"
      >
        <span class="material-symbols-outlined">drag_indicator</span>
      </button>

      <div class="video" #video></div>

      <div
        class="body"
        (pointerdown)="startDrag($event)"
        (pointermove)="moveDrag($event)"
        (pointerup)="endDrag()"
        (pointercancel)="endDrag()"
      >
        <span class="title" [title]="player.current()?.title ?? ''">
          {{ player.current()?.title ?? '' }}
        </span>
        <span class="time">
          {{ formatDuration(player.position()) }} / {{ formatDuration(player.duration()) }}
        </span>
      </div>

      <div class="controls">
        <button
          type="button"
          title="Titre précédent"
          [disabled]="!player.hasPrevious() && player.position() <= 3"
          (click)="player.previous()"
        >
          <span class="material-symbols-outlined">skip_previous</span>
        </button>
        <button
          type="button"
          class="main"
          [title]="player.status() === 'playing' ? 'Pause' : 'Lecture'"
          (click)="player.toggle()"
        >
          <span class="material-symbols-outlined">
            {{ player.status() === 'playing' ? 'pause' : 'play_arrow' }}
          </span>
        </button>
        <button
          type="button"
          title="Titre suivant"
          [disabled]="!player.hasNext()"
          (click)="player.next()"
        >
          <span class="material-symbols-outlined">skip_next</span>
        </button>
        <button type="button" title="Arrêter la musique" (click)="player.stop()">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    </aside>
  `,
  styleUrl: './music-mini-player.scss',
})
export class MusicMiniPlayerComponent implements AfterViewInit {
  readonly player = inject(MusicPlayerService);

  readonly formatDuration = formatDuration;

  private video = viewChild.required<ElementRef<HTMLElement>>('video');

  private mini = viewChild.required<ElementRef<HTMLElement>>('mini');

  /** Position du lecteur, mesurée depuis les bords droit et bas pour rester accroché au coin. */
  readonly offset = signal<Offset>(this.restore());

  readonly dragging = signal(false);

  /** Largeur de la vidéo, en px (la hauteur suit en 16/9). */
  readonly videoWidth = signal(this.restoreSize());

  readonly resizing = signal(false);

  private resize?: { x: number; y: number; start: number };

  private drag?: { x: number; y: number; start: Offset };

  ngAfterViewInit() {
    this.player.attachHost(this.video().nativeElement);
  }

  startDrag(event: PointerEvent) {
    if (event.button) {
      return;
    }
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.drag = { x: event.clientX, y: event.clientY, start: this.offset() };
    this.dragging.set(true);
  }

  moveDrag(event: PointerEvent) {
    if (!this.drag) {
      return;
    }
    this.place({
      right: this.drag.start.right - (event.clientX - this.drag.x),
      bottom: this.drag.start.bottom - (event.clientY - this.drag.y),
    });
  }

  endDrag() {
    if (this.drag) {
      this.drag = undefined;
      this.dragging.set(false);
      this.save();
    }
  }

  /** Flèches du clavier sur la poignée : déplace le lecteur par pas de 16 px. */
  onKey(event: KeyboardEvent) {
    const move: Record<string, [number, number]> = {
      ArrowLeft: [KEY_STEP, 0],
      ArrowRight: [-KEY_STEP, 0],
      ArrowUp: [0, KEY_STEP],
      ArrowDown: [0, -KEY_STEP],
    };
    const delta = move[event.key];
    if (delta) {
      event.preventDefault();
      this.place({
        right: this.offset().right + delta[0],
        bottom: this.offset().bottom + delta[1],
      });
      this.save();
    }
  }

  startResize(event: PointerEvent) {
    if (event.button) {
      return;
    }
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.resize = { x: event.clientX, y: event.clientY, start: this.videoWidth() };
    this.resizing.set(true);
  }

  /** La poignée est en haut à gauche : tirer vers la gauche ou vers le haut agrandit. */
  moveResize(event: PointerEvent) {
    if (!this.resize) {
      return;
    }
    const byX = this.resize.x - event.clientX;
    const byY = ((this.resize.y - event.clientY) * 16) / 9;
    this.setWidth(this.resize.start + (Math.abs(byX) >= Math.abs(byY) ? byX : byY));
  }

  endResize() {
    if (this.resize) {
      this.resize = undefined;
      this.resizing.set(false);
      this.saveSize();
    }
  }

  /** Flèches sur la poignée : + / − par pas de 20 px (haut, gauche = plus grand). */
  onResizeKey(event: KeyboardEvent) {
    const delta: Record<string, number> = {
      ArrowUp: SIZE_STEP,
      ArrowLeft: SIZE_STEP,
      '+': SIZE_STEP,
      ArrowDown: -SIZE_STEP,
      ArrowRight: -SIZE_STEP,
      '-': -SIZE_STEP,
    };
    if (event.key in delta) {
      event.preventDefault();
      this.setWidth(this.videoWidth() + delta[event.key]);
      this.saveSize();
    }
  }

  resetSize() {
    this.setWidth(DEFAULT_VIDEO_WIDTH);
    this.saveSize();
  }

  /** Borne la largeur (la vidéo doit tenir dans la fenêtre) puis garde le lecteur visible. */
  private setWidth(width: number) {
    const max = Math.max(MIN_VIDEO_WIDTH, Math.min(MAX_VIDEO_WIDTH, window.innerWidth - 40));
    this.videoWidth.set(Math.round(Math.min(Math.max(width, MIN_VIDEO_WIDTH), max)));
    queueMicrotask(() => this.place(this.offset()));
  }

  private saveSize() {
    try {
      localStorage.setItem(SIZE_KEY, String(this.videoWidth()));
    } catch {
      // Stockage indisponible : la taille ne sera pas conservée.
    }
  }

  private restoreSize(): number {
    try {
      const saved = Number(localStorage.getItem(SIZE_KEY));
      if (Number.isFinite(saved) && saved >= MIN_VIDEO_WIDTH) {
        return Math.min(saved, MAX_VIDEO_WIDTH);
      }
    } catch {
      // Valeur illisible ou stockage indisponible : taille par défaut.
    }
    return DEFAULT_VIDEO_WIDTH;
  }

  /** Remet le lecteur dans le coin en bas à droite. */
  reset() {
    this.offset.set({ right: DEFAULT_MARGIN, bottom: DEFAULT_MARGIN });
    this.save();
  }

  /** Garde le lecteur dans la fenêtre quand elle se réduit. */
  @HostListener('window:resize')
  keepInside() {
    this.place(this.offset());
  }

  /** Applique une position en la ramenant dans la fenêtre, pour que le lecteur reste atteignable. */
  private place(next: Offset) {
    const { width, height } = this.mini().nativeElement.getBoundingClientRect();
    this.offset.set({
      right: Math.round(Math.min(Math.max(next.right, 0), Math.max(window.innerWidth - width, 0))),
      bottom: Math.round(
        Math.min(Math.max(next.bottom, 0), Math.max(window.innerHeight - height, 0)),
      ),
    });
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.offset()));
    } catch {
      // Stockage indisponible (navigation privée…) : la position ne sera pas conservée.
    }
  }

  private restore(): Offset {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (Number.isFinite(saved?.right) && Number.isFinite(saved?.bottom)) {
        return { right: saved.right, bottom: saved.bottom };
      }
    } catch {
      // Valeur illisible ou stockage indisponible : position par défaut.
    }
    return { right: DEFAULT_MARGIN, bottom: DEFAULT_MARGIN };
  }
}
