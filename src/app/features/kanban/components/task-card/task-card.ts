import { Component, computed, input, output, signal } from '@angular/core';
import { Task } from '../../../../core/models/task.model';
import {
  avatarColor,
  formatDueDate,
  initials,
  isOverdue,
  PRIORITY_LABELS,
  tagTone,
} from '../../../../core/models/task-labels';

@Component({
  selector: 'app-task-card',
  standalone: true,
  templateUrl: './task-card.html',
  styleUrl: './task-card.scss',
})
export class TaskCardComponent {
  readonly task = input.required<Task>();

  readonly opened = output<void>();

  readonly removed = output<void>();

  /** Émis avec l'identifiant de la sous-tâche cochée ou décochée. */
  readonly subtaskToggled = output<string>();

  /** Émis avec l'identifiant de la sous-tâche à éditer. */
  readonly subtaskOpened = output<string>();

  readonly subtasksOpen = signal(true);

  readonly priorityLabel = computed(() => PRIORITY_LABELS[this.task().priority]);

  readonly dueLabel = computed(() => formatDueDate(this.task().dueDate));

  readonly overdue = computed(() => isOverdue(this.task()));

  readonly assigneeInitials = computed(() => initials(this.task().assignedTo));

  readonly checklistDone = computed(() => this.task().checklist.filter((c) => c.completed).length);

  readonly checklistProgress = computed(() => {
    const total = this.task().checklist.length;
    return total ? Math.round((this.checklistDone() / total) * 100) : 0;
  });

  readonly avatarBg = computed(() => avatarColor(this.task().assignedTo));

  readonly tone = tagTone;

  dueShort(date: string): string {
    return formatDueDate(date);
  }

  toggleSubtasks(event: Event) {
    event.stopPropagation();
    this.subtasksOpen.update((open) => !open);
  }

  openSubtask(event: Event, id: string) {
    event.preventDefault();
    event.stopPropagation();
    this.subtaskOpened.emit(id);
  }

  toggleSubtask(event: Event, id: string) {
    event.stopPropagation();
    this.subtaskToggled.emit(id);
  }

  delete(event: Event) {
    event.stopPropagation();
    this.removed.emit();
  }
}
