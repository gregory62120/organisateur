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
      [style.right.px]="offset().right"
      [style.bottom.px]="offset().bottom"
      aria-label="Lecteur de musique"
    >
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
