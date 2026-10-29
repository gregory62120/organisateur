import { Dialog } from '@angular/cdk/dialog';
import {
  Component,
  afterNextRender,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { Task, TaskStatus } from '../../core/models/task.model';
import {
  STATUS_LABELS,
  STATUSES,
  formatDueDate,
  initials,
  isOverdue,
} from '../../core/models/task-labels';
import {
  DAY_WIDTHS,
  GanttScale,
  GanttService,
  SCALE_LABELS,
  TaskSpan,
} from '../../core/services/gantt.service';
import { StorageService } from '../../core/services/storage.service';
import { TaskService } from '../../core/services/task.service';
import { TaskDialogComponent, TaskDialogData } from '../kanban/components/task-dialog/task-dialog';

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
  progress: number;
  overdue: boolean;
  startLabel: string;
  endLabel: string;
  initials: string;
}

@Component({
  selector: 'app-gantt',
  standalone: true,
  templateUrl: './gantt.html',
  styleUrl: './gantt.scss',
})
export class GanttComponent {
  private gantt = inject(GanttService);

  private dialog = inject(Dialog);

  taskService = inject(TaskService);

  storage = inject(StorageService);

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

  readonly assignees = computed(() =>
    [...new Set(this.taskService.tasksSignal().map((t) => t.assignedTo?.trim()))]
      .filter((a): a is string => !!a)
      .sort((a, b) => a.localeCompare(b)),
  );

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

  readonly rows = computed<GanttRow[]>(() => {
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
          progress: this.gantt.progress(task),
          overdue: isOverdue(task),
          startLabel: formatDueDate(span ? this.gantt.toIso(span.start) : ''),
          endLabel: formatDueDate(span ? this.gantt.toIso(span.end) : ''),
          initials: initials(task.assignedTo),
        };
      })
      .sort((a, b) => {
        if (!a.span || !b.span) {
          return a.span ? -1 : b.span ? 1 : 0;
        }
        return a.span.start.getTime() - b.span.start.getTime();
      });
  });

  readonly hasFilter = computed(
    () => !!(this.search().trim() || this.statusFilter() || this.assigneeFilter()),
  );

  constructor() {
    afterNextRender(() => this.scrollToToday());
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
    this.dialog.open<unknown, TaskDialogData>(TaskDialogComponent, {
      data: { task, isNew: false },
      panelClass: 'tf-dialog-panel',
      maxWidth: '96vw',
      maxHeight: '94vh',
    });
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
