import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { Task, TaskStatus } from '../../core/models/task.model';
import { STATUS_LABELS, STATUSES, formatShortDate, isOverdue } from '../../core/models/task-labels';
import {
  countByGroup,
  TaskGroup,
  taskGroup,
  toggleArchived,
  toggleSprint,
  uniqueAssignees,
} from '../../core/models/task-state';
import {
  DAY_WIDTHS,
  GanttScale,
  GanttService,
  SCALE_LABELS,
  TaskSpan,
} from '../../core/services/gantt.service';
import { StorageService } from '../../core/services/storage.service';
import { TaskService } from '../../core/services/task.service';
import { CollapsibleSectionComponent } from '../../shared/collapsible-section/collapsible-section';
import { TaskDialogService } from '../kanban/services/task-dialog.service';

/** Largeur (px) en dessous de laquelle le titre sort de la barre. */
const NARROW_BAR = 130;

type DragMode = 'move' | 'start' | 'end';

interface Drag {
  id: string;
  mode: DragMode;
  originX: number;
  delta: number;
}

export interface GanttRow {
  task: Task;
  span: TaskSpan | null;
  left: number;
  width: number;
  /** Barre trop courte pour contenir son titre : il s'affiche à sa droite. */
  narrow: boolean;
  progress: number;
  overdue: boolean;
  group: TaskGroup;
  statusLabel: string;
  startLabel: string;
  endLabel: string;
}

@Component({
  selector: 'app-gantt',
  standalone: true,
  imports: [NgTemplateOutlet, CollapsibleSectionComponent],
  templateUrl: './gantt.html',
  styleUrl: './gantt.scss',
})
export class GanttComponent {
  private gantt = inject(GanttService);

  private dialogs = inject(TaskDialogService);

  taskService = inject(TaskService);

  storage = inject(StorageService);

  private readonly hasTasks = computed(() => this.taskService.tasksSignal().length > 0);

  private scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  readonly scales = Object.keys(SCALE_LABELS) as GanttScale[];

  readonly scaleLabels = SCALE_LABELS;

  readonly statuses = STATUSES;

  readonly statusLabels = STATUS_LABELS;

  readonly scale = signal<GanttScale>('day');

  readonly search = signal('');

  readonly statusFilter = signal<TaskStatus | ''>('');

  readonly assigneeFilter = signal('');

  private readonly drag = signal<Drag | null>(null);

  readonly dayWidth = computed(() => DAY_WIDTHS[this.scale()]);

  readonly assignees = computed(() => uniqueAssignees(this.taskService.tasksSignal()));

  private readonly visibleTasks = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    const assignee = this.assigneeFilter();

    return this.taskService
      .tasksSignal()
      .filter(
        (t) =>
          (!term || t.title.toLowerCase().includes(term)) &&
          (!status || t.status === status) &&
          (!assignee || t.assignedTo === assignee),
      );
  });

  /** La plage dépend de toutes les tâches (pas des filtres) pour ne pas bouger quand on filtre. */
  readonly range = computed(() => this.gantt.range(this.taskService.tasksSignal()));

  readonly width = computed(() => this.range().days * this.dayWidth());

  readonly months = computed(() => this.gantt.ticks(this.range(), 'month'));

  readonly subTicks = computed(() => {
    const scale = this.scale();
    return scale === 'month'
      ? []
      : this.gantt.ticks(this.range(), scale === 'day' ? 'day' : 'week');
  });

  /** Graduations des lignes verticales de la grille. */
  readonly gridlines = computed(() =>
    (this.subTicks().length ? this.subTicks() : this.months()).map(
      (t) => t.offset * this.dayWidth(),
    ),
  );

  readonly todayOffset = computed(() => {
    const today = new Date();
    const offset = this.gantt.diffDays(
      this.range().start,
      new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    );
    return offset * this.dayWidth();
  });

  private readonly allRows = computed<GanttRow[]>(() => {
    const drag = this.drag();
    const width = this.dayWidth();
    const range = this.range();

    return this.visibleTasks()
      .map((task) => {
        const base = this.gantt.span(task);
        const span = base && drag?.id === task.id ? this.applyDrag(base, drag) : base;
        return {
          task,
          span,
          left: span ? this.gantt.diffDays(range.start, span.start) * width : 0,
          width: span ? (this.gantt.diffDays(span.start, span.end) + 1) * width : 0,
          narrow: !!span && (this.gantt.diffDays(span.start, span.end) + 1) * width < NARROW_BAR,
          progress: this.gantt.progress(task),
          overdue: isOverdue(task),
          group: taskGroup(task),
          statusLabel: STATUS_LABELS[task.status],
          startLabel: formatShortDate(span ? this.gantt.toIso(span.start) : ''),
          endLabel: formatShortDate(span ? this.gantt.toIso(span.end) : ''),
        };
      })
      .sort((a, b) => {
        if (!a.span || !b.span) {
          return a.span ? -1 : b.span ? 1 : 0;
        }
        return a.span.start.getTime() - b.span.start.getTime();
      });
  });

  /** Tâches du sprint : celles affichées dans le Kanban. */
  readonly rows = computed(() => this.allRows().filter((r) => r.group === 'sprint'));

  /** Tâches masquées (hors sprint), dans la section dépliable. */
  readonly hiddenRows = computed(() => this.allRows().filter((r) => r.group === 'hidden'));

  /** Tâches archivées, dans leur propre section dépliable. */
  readonly archivedRows = computed(() => this.allRows().filter((r) => r.group === 'archived'));

  /** Totaux par groupe, filtres ignorés. */
  private readonly counts = computed(() => countByGroup(this.taskService.tasksSignal()));

  readonly hiddenCount = computed(() => this.counts().hidden);

  readonly archivedCount = computed(() => this.counts().archived);

  readonly hiddenOpen = signal(false);

  readonly archivedOpen = signal(false);

  readonly hasFilter = computed(
    () => !!(this.search().trim() || this.statusFilter() || this.assigneeFilter()),
  );

  constructor() {
    // La frise n'existe qu'une fois un projet ouvert, et sa plage s'élargit quand les tâches
    // sont lues : on se recentre sur aujourd'hui dans les deux cas.
    effect(() => {
      const timeline = this.scroller();
      this.hasTasks();
      if (timeline) {
        untracked(() => setTimeout(() => this.scrollToToday()));
      }
    });
  }

  scrollToToday() {
    const el = this.scroller()?.nativeElement;
    if (el) {
      el.scrollTo({
        left: Math.max(this.todayOffset() - el.clientWidth / 3, 0),
        behavior: 'smooth',
      });
    }
  }

  setScale(scale: GanttScale) {
    this.scale.set(scale);
    queueMicrotask(() => this.scrollToToday());
  }

  toggleArchive(event: Event, task: Task) {
    event.stopPropagation();
    this.taskService.update(toggleArchived(task));
  }

  toggleKanban(event: Event, task: Task) {
    event.stopPropagation();
    this.taskService.update(toggleSprint(task));
  }

  resetFilters() {
    this.search.set('');
    this.statusFilter.set('');
    this.assigneeFilter.set('');
  }

  async openProject() {
    try {
      await this.storage.openProject();
    } catch {
      // Sélection de dossier annulée par l'utilisateur.
    }
  }

  open(task: Task) {
    this.dialogs.openTask(task);
  }

  startDrag(event: PointerEvent, row: GanttRow, mode: DragMode) {
    if (!row.span || event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.drag.set({ id: row.task.id, mode, originX: event.clientX, delta: 0 });
  }

  moveDrag(event: PointerEvent) {
    const drag = this.drag();
    if (drag) {
      const delta = Math.round((event.clientX - drag.originX) / this.dayWidth());
      if (delta !== drag.delta) {
        this.drag.set({ ...drag, delta });
      }
    }
  }

  /** Termine le glissement : sans déplacement c'est un clic (ouvre la tâche), sinon on enregistre les dates. */
  endDrag(row: GanttRow) {
    const drag = this.drag();
    this.drag.set(null);

    if (!drag || drag.id !== row.task.id) {
      return;
    }
    if (drag.delta === 0) {
      if (drag.mode === 'move') {
        this.open(row.task);
      }
      return;
    }

    const base = this.gantt.span(row.task);
    if (!base) {
      return;
    }
    const next = this.applyDrag(base, drag);
    this.taskService.update({
      ...row.task,
      startDate: this.gantt.toIso(next.start),
      dueDate: this.gantt.toIso(next.end),
    });
  }

  cancelDrag() {
    this.drag.set(null);
  }

  private applyDrag(span: TaskSpan, drag: Drag): TaskSpan {
    const shift = (date: Date) => this.gantt.addDays(date, drag.delta);
    switch (drag.mode) {
      case 'move':
        return { start: shift(span.start), end: shift(span.end) };
      case 'start': {
        const start = shift(span.start);
        return { start: start > span.end ? span.end : start, end: span.end };
      }
      case 'end': {
        const end = shift(span.end);
        return { start: span.start, end: end < span.start ? span.start : end };
      }
    }
  }
}
