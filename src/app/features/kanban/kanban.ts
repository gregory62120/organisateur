import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Dialog } from '@angular/cdk/dialog';
import { Component, computed, inject, signal } from '@angular/core';
import { Priority, Task, TaskStatus } from '../../core/models/task.model';
import {
  compareTasks,
  PRIORITIES,
  PRIORITY_LABELS,
  SORT_LABELS,
  SORTS,
  STATUS_LABELS,
  TaskSort,
} from '../../core/models/task-labels';
import { StorageService } from '../../core/services/storage.service';
import { TaskService } from '../../core/services/task.service';
import { TaskCardComponent } from './components/task-card/task-card';
import { TaskDialogComponent, TaskDialogData } from './components/task-dialog/task-dialog';

interface Column {
  status: TaskStatus;
  name: string;
  tone: 'todo' | 'progress' | 'review' | 'done';
}

@Component({
  selector: 'app-kanban',

  standalone: true,

  imports: [CdkDropList, CdkDrag, CdkDropListGroup, TaskCardComponent],

  templateUrl: './kanban.html',
  styleUrl: './kanban.scss',
})
export class KanbanComponent {
  taskService = inject(TaskService);

  storage = inject(StorageService);

  private dialog = inject(Dialog);

  readonly columns: Column[] = [
    { status: 'TODO', name: STATUS_LABELS.TODO, tone: 'todo' },
    { status: 'IN_PROGRESS', name: STATUS_LABELS.IN_PROGRESS, tone: 'progress' },
    { status: 'VALIDATION', name: STATUS_LABELS.VALIDATION, tone: 'review' },
    { status: 'DONE', name: STATUS_LABELS.DONE, tone: 'done' },
  ];

  readonly priorities = PRIORITIES;

  readonly priorityLabels = PRIORITY_LABELS;

  readonly search = signal('');

  readonly priorityFilter = signal<Priority | ''>('');

  readonly assigneeFilter = signal('');

  readonly tagFilter = signal('');

  readonly sort = signal<TaskSort>('manual');

  readonly sorts = SORTS;

  readonly sortLabels = SORT_LABELS;

  readonly projectName = computed(() => this.storage.root()?.name ?? '');

  readonly tags = computed(() =>
    [...new Set(this.taskService.tasksSignal().flatMap((t) => t.tags ?? []))].sort((a, b) =>
      a.localeCompare(b),
    ),
  );

  readonly assignees = computed(() =>
    [...new Set(this.taskService.tasksSignal().map((t) => t.assignedTo?.trim()))]
      .filter((a): a is string => !!a)
      .sort((a, b) => a.localeCompare(b)),
  );

  private readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const priority = this.priorityFilter();
    const assignee = this.assigneeFilter();
    const tag = this.tagFilter();

    return this.taskService.tasksSignal().filter((t) => {
      const text = `${t.title} ${(t.tags ?? []).join(' ')}`.toLowerCase();
      return (
        (!term || text.includes(term)) &&
        (!priority || t.priority === priority) &&
        (!assignee || t.assignedTo === assignee) &&
        (!tag || (t.tags ?? []).includes(tag))
      );
    });
  });

  readonly byStatus = computed(() => {
    const groups: Record<TaskStatus, Task[]> = {
      TODO: [],
      IN_PROGRESS: [],
      VALIDATION: [],
      DONE: [],
    };
    for (const task of this.filtered()) {
      groups[task.status]?.push(task);
    }
    const compare = compareTasks(this.sort());
    if (compare) {
      for (const list of Object.values(groups)) {
        list.sort(compare);
      }
    }
    return groups;
  });

  readonly hasFilter = computed(
    () =>
      !!(this.search().trim() || this.priorityFilter() || this.assigneeFilter() || this.tagFilter()),
  );

  drop(event: CdkDragDrop<Task[]>, status: TaskStatus) {
    const task = event.item.data as Task;

    // Avec un tri actif, l'ordre dans une colonne est calculé : seul le changement de colonne compte.
    if (this.sort() !== 'manual' && task.status === status) {
      return;
    }

    // L'index du drop porte sur la liste filtrée : on le convertit en index dans la colonne complète.
    const visible = this.byStatus()[status].filter((t) => t.id !== task.id);
    const reference = visible[event.currentIndex];
    const full = this.taskService
      .tasksSignal()
      .filter((t) => t.status === status && t.id !== task.id);
    const index = reference ? full.indexOf(reference) : full.length;

    this.taskService.moveTo(task.id, status, index);
  }

  addTask(status: TaskStatus = 'TODO') {
    const task = this.taskService.createEmpty();

    task.status = status;

    // La tâche n'est écrite dans tasks.json qu'à la validation du formulaire.
    this.open(task, true);
  }

  resetFilters() {
    this.search.set('');
    this.priorityFilter.set('');
    this.assigneeFilter.set('');
    this.tagFilter.set('');
  }

  async openProject() {
    try {
      await this.storage.openProject();
    } catch {
      // Sélection de dossier annulée par l'utilisateur.
    }
  }

  open(task: Task, isNew = false) {
    this.dialog.open<unknown, TaskDialogData>(TaskDialogComponent, {
      data: { task, isNew },
      panelClass: 'tf-dialog-panel',
      maxWidth: '96vw',
      maxHeight: '94vh',
    });
  }

  remove(task: Task) {
    if (!confirm(`Supprimer la tâche « ${task.title} » ?`)) {
      return;
    }
    this.taskService.delete(task.id);
  }
}
