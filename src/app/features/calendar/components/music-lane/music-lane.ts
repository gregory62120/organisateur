import { Component, computed, inject, input, signal } from '@angular/core';

import { MusicSlot, MusicTrack } from '../../../../core/models/music.model';
import { CalendarService } from '../../../../core/services/calendar.service';
import { GanttService } from '../../../../core/services/gantt.service';
import { MusicPlanService } from '../../../../core/services/music-plan.service';
import {
  PLAN_STEP,
  snapStart,
  toMinutes,
  toTime,
  TRACK_DRAG_TYPE,
} from '../../../../core/services/music-plan';
import { MusicPlayerService } from '../../../../core/services/music-player.service';
import { DEFAULT_TRACK_SECONDS, ScheduleStatus } from '../../../../core/services/music-schedule';
import { MusicService } from '../../../../core/services/music.service';
import { formatClock } from '../../../../core/services/youtube';

const DAY_MINUTES = 24 * 60;

/** Hauteur minimale (px) d'un bloc pour y écrire le titre, puis pour y mettre les boutons. */
const LABEL_MIN = 22;
const ACTIONS_MIN = 44;

/** Une musique placée sur le calendrier, que l'on peut déplacer. */
export interface PlanBlock {
  slot: MusicSlot;
  track: MusicTrack;
  /** Début et fin en minutes depuis minuit, déplacement en cours compris. */
  start: number;
  end: number;
  top: number;
  height: number;
  lane: number;
  lanes: number;
  time: string;
  labelled: boolean;
  actions: boolean;
}

/** Un titre de la lecture en cours (ou son aperçu), dans la bande à droite. */
export interface LiveBlock {
  key: string;
  title: string;
  status: ScheduleStatus;
  top: number;
  height: number;
  time: string;
  durationKnown: boolean;
}

interface PlanDrag {
  id: string;
  originY: number;
  deltaMinutes: number;
}

/**
 * Voie musicale d'une journée (vue jour) : les musiques placées à l'avance, déplaçables à la souris
 * ou déposables depuis le panneau Musique, et à droite la lecture en cours.
 * La planification sert de repère : rien ne démarre tout seul.
 */
@Component({
  selector: 'app-music-lane',
  standalone: true,
  host: { '(click)': '$event.stopPropagation()', '(dblclick)': '$event.stopPropagation()' },
  templateUrl: './music-lane.html',
  styleUrl: './music-lane.scss',
})
export class MusicLaneComponent {
  private plan = inject(MusicPlanService);

  private music = inject(MusicService);

  private calendar = inject(CalendarService);

  private gantt = inject(GanttService);

  readonly player = inject(MusicPlayerService);

  readonly day = input.required<Date>();

  readonly hourPx = input.required<number>();

  private readonly dayIso = computed(() => this.gantt.toIso(this.day()));

  private readonly drag = signal<PlanDrag | null>(null);

  readonly draggingId = computed(() => this.drag()?.id ?? null);

  /** Vrai pendant qu'une musique du panneau survole la voie. */
  readonly dropping = signal(false);

  readonly planBlocks = computed<PlanBlock[]>(() => {
    const tracks = new Map(this.music.tracks().map((t) => [t.id, t]));
    const drag = this.drag();
    const px = this.hourPx();

    const items = this.plan
      .slots()
      .filter((slot) => slot.date === this.dayIso() && tracks.has(slot.trackId))
      .map((slot) => {
        const track = tracks.get(slot.trackId) as MusicTrack;
        const moved = drag?.id === slot.id ? drag.deltaMinutes : 0;
        const start = snapStart(toMinutes(slot.startTime) + moved);
        const length = (track.duration || DEFAULT_TRACK_SECONDS) / 60;
        return { slot, track, start, end: Math.min(start + length, DAY_MINUTES) };
      });

    return this.calendar.assignLanes(items).map(({ item, lane, lanes }) => {
      const heightPx = ((item.end - item.start) / 60) * px;
      return {
        ...item,
        top: (item.start / DAY_MINUTES) * 100,
        height: ((item.end - item.start) / DAY_MINUTES) * 100,
        lane,
        lanes,
        time: `${toTime(item.start)} – ${toTime(Math.min(Math.round(item.end), DAY_MINUTES - 1))}`,
        labelled: heightPx >= LABEL_MIN,
        actions: heightPx >= ACTIONS_MIN,
      };
    });
  });

  /** Lecture en cours découpée aux limites du jour ; l'aperçu n'apparaît que sans planification. */
  readonly liveBlocks = computed<LiveBlock[]>(() => {
    const dayStart = this.day().getTime();
    const dayEnd = dayStart + DAY_MINUTES * 60_000;
    const hasPlan = this.planBlocks().length > 0;

    return this.player.schedule().flatMap((entry, index) => {
      const start = Math.max(entry.start.getTime(), dayStart);
      const end = Math.min(entry.end.getTime(), dayEnd);
      if (end <= start || (hasPlan && entry.status === 'preview')) {
        return [];
      }
      return [
        {
          key: `${entry.track.id}:${index}`,
          title: entry.track.title,
          status: entry.status,
          top: ((start - dayStart) / (dayEnd - dayStart)) * 100,
          height: ((end - start) / (dayEnd - dayStart)) * 100,
          time: `${formatClock(entry.start)} – ${formatClock(entry.end)}`,
          durationKnown: entry.durationKnown,
        },
      ];
    });
  });

  // --- Dépôt d'une musique du panneau -------------------------------------------------

  onDragOver(event: DragEvent) {
    if (event.dataTransfer?.types.includes(TRACK_DRAG_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      this.dropping.set(true);
    }
  }

  onDragLeave() {
    this.dropping.set(false);
  }

  onDrop(event: DragEvent) {
    this.dropping.set(false);
    const trackId = event.dataTransfer?.getData(TRACK_DRAG_TYPE);
    if (!trackId) {
      return;
    }
    event.preventDefault();
    void this.plan.add(trackId, this.dayIso(), this.minutesAt(event.clientY, event.currentTarget));
  }

  // --- Déplacement d'un bloc ----------------------------------------------------------

  startDrag(event: PointerEvent, block: PlanBlock) {
    if (event.button) {
      return;
    }
    (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    this.drag.set({ id: block.slot.id, originY: event.clientY, deltaMinutes: 0 });
  }

  moveDrag(event: PointerEvent) {
    const drag = this.drag();
    if (drag) {
      const deltaMinutes = ((event.clientY - drag.originY) / this.hourPx()) * 60;
      this.drag.set({ ...drag, deltaMinutes });
    }
  }

  /** Relâchement : le bloc est enregistré à sa nouvelle heure, sauf s'il n'a pas bougé. */
  endDrag(block: PlanBlock) {
    const drag = this.drag();
    this.drag.set(null);
    if (drag?.id !== block.slot.id) {
      return;
    }
    const start = snapStart(toMinutes(block.slot.startTime) + drag.deltaMinutes);
    if (start !== toMinutes(block.slot.startTime)) {
      void this.plan.move(block.slot.id, block.slot.date, start);
    }
  }

  cancelDrag() {
    this.drag.set(null);
  }

  /** Suppr retire le bloc, les flèches haut et bas le décalent de 5 minutes. */
  onKey(event: KeyboardEvent, block: PlanBlock) {
    const start = toMinutes(block.slot.startTime);
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      void this.remove(block);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const delta = event.key === 'ArrowUp' ? -PLAN_STEP : PLAN_STEP;
      void this.plan.move(block.slot.id, block.slot.date, start + delta);
    }
  }

  play(block: PlanBlock) {
    return this.player.play(block.track.id);
  }

  remove(block: PlanBlock) {
    return this.plan.remove(block.slot.id);
  }

  /** Minutes depuis minuit correspondant à une position verticale dans la voie. */
  private minutesAt(clientY: number, target: EventTarget | null): number {
    const top = (target as HTMLElement).getBoundingClientRect().top;
    return ((clientY - top) / this.hourPx()) * 60;
  }
}
