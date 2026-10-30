import { Component, computed, input, output, signal } from '@angular/core';
import { Task } from '../../../../core/models/task.model';
import { TaskGroup } from '../../../../core/models/task-state';
import {
  avatarColor,
  formatDueDate,
  initials,
  isOverdue,
  PRIORITY_LABELS,
  STATUS_LABELS,
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

  /**
   * Groupe de la carte : hors du sprint, elle affiche son statut ;
   * archivée, seule la restauration est proposée.
   */
  readonly group = input<TaskGroup>('sprint');

  readonly opened = output<void>();

  /** Demande de faire passer la tâche du sprint au groupe masqué, ou l'inverse. */
  readonly sprintToggled = output<void>();

  /** Demande d'archivage, ou de restauration pour une tâche archivée. */
  readonly archiveToggled = output<void>();

  readonly removed = output<void>();

  /** Émis avec l'identifiant de la sous-tâche cochée ou décochée. */
  readonly subtaskToggled = output<string>();

  /** Émis avec l'identifiant de la sous-tâche à éditer. */
  readonly subtaskOpened = output<string>();

  readonly subtasksOpen = signal(true);

  readonly statusLabel = computed(() => STATUS_LABELS[this.task().status]);

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

  readonly formatDate = formatDueDate;

  /** Les actions de la carte ne doivent pas ouvrir la tâche. */
  private act(event: Event, action: () => void) {
    event.stopPropagation();
    action();
  }

  toggleSubtasks(event: Event) {
    this.act(event, () => this.subtasksOpen.update((open) => !open));
  }

  openSubtask(event: Event, id: string) {
    this.act(event, () => this.subtaskOpened.emit(id));
  }

  toggleSubtask(event: Event, id: string) {
    this.act(event, () => this.subtaskToggled.emit(id));
  }

  toggleArchive(event: Event) {
    this.act(event, () => this.archiveToggled.emit());
  }

  toggleSprint(event: Event) {
    this.act(event, () => this.sprintToggled.emit());
  }

  delete(event: Event) {
    this.act(event, () => this.removed.emit());
  }
}
