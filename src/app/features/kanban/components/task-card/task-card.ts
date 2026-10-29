import { Component, computed, input, output } from '@angular/core';
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

  readonly priorityLabel = computed(() => PRIORITY_LABELS[this.task().priority]);

  readonly dueLabel = computed(() => formatDueDate(this.task().dueDate));

  readonly overdue = computed(() => isOverdue(this.task()));

  readonly assigneeInitials = computed(() => initials(this.task().assignedTo));

  readonly checklistDone = computed(() => this.task().checklist.filter((c) => c.completed).length);

  readonly avatarBg = computed(() => avatarColor(this.task().assignedTo));

  readonly tone = tagTone;

  delete(event: Event) {
    event.stopPropagation();
    this.removed.emit();
  }
}
