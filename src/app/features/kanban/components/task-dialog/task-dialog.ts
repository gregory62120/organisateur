import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Priority, Task, TaskStatus } from '../../../../core/models/task.model';
import {
  PRIORITIES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUSES,
} from '../../../../core/models/task-labels';
import { TaskService } from '../../../../core/services/task.service';
import { EditorComponent } from '../../../editor/editor';

export interface TaskDialogData {
  task: Task;
  isNew?: boolean;
}

@Component({
  selector: 'app-task-dialog',
  standalone: true,
  imports: [FormsModule, EditorComponent],
  templateUrl: './task-dialog.html',
  styleUrl: './task-dialog.scss',
})
export class TaskDialogComponent {
  readonly dialogRef = inject(DialogRef<Task>);

  private taskService = inject(TaskService);

  private readonly data = inject(DIALOG_DATA) as TaskDialogData;

  private readonly initial = this.data.task;

  /** Une nouvelle tâche n'est écrite dans tasks.json qu'à l'enregistrement. */
  readonly isNew = !!this.data.isNew;

  readonly statuses = STATUSES;

  readonly statusLabels = STATUS_LABELS;

  readonly priorities = PRIORITIES;

  readonly priorityLabels = PRIORITY_LABELS;

  readonly title = signal(this.initial.title);

  readonly status = signal<TaskStatus>(this.initial.status);

  readonly priority = signal<Priority>(this.initial.priority);

  readonly dueDate = signal(this.initial.dueDate ?? '');

  readonly assignedTo = signal(this.initial.assignedTo ?? '');

  readonly tags = signal<string[]>([...(this.initial.tags ?? [])]);

  readonly content = signal(this.initial.description ?? '');

  readonly newTag = signal('');

  updateContent(content: string) {
    this.content.set(content);
  }

  addTag() {
    const tag = this.newTag().trim();
    if (tag && !this.tags().includes(tag)) {
      this.tags.update((tags) => [...tags, tag]);
    }
    this.newTag.set('');
  }

  removeTag(tag: string) {
    this.tags.update((tags) => tags.filter((t) => t !== tag));
  }

  save() {
    this.addTag();

    const task: Task = {
      ...this.initial,
      title: this.title().trim() || 'Sans titre',
      status: this.status(),
      priority: this.priority(),
      dueDate: this.dueDate() || undefined,
      assignedTo: this.assignedTo().trim() || undefined,
      tags: this.tags(),
      description: this.content() ?? '',
    };

    if (this.isNew) {
      this.taskService.add(task);
    } else {
      this.taskService.update(task);
    }
    this.close();
  }

  remove() {
    if (!confirm('Supprimer cette tâche ?')) {
      return;
    }
    this.taskService.delete(this.initial.id);
    this.close();
  }

  close() {
    this.dialogRef.close();
  }
}
