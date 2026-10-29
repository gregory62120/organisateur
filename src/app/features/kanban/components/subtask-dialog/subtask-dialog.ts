import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject, signal } from '@angular/core';

import { ChecklistItem, Task } from '../../../../core/models/task.model';
import { TaskService } from '../../../../core/services/task.service';
import { EditorComponent } from '../../../editor/editor';

export interface SubtaskDialogData {
  task: Task;
  subtaskId: string;
}

@Component({
  selector: 'app-subtask-dialog',
  standalone: true,
  imports: [EditorComponent],
  templateUrl: './subtask-dialog.html',
  // Même mise en page que le formulaire d'une tâche principale.
  styleUrl: '../task-dialog/task-dialog.scss',
})
export class SubtaskDialogComponent {
  readonly dialogRef = inject(DialogRef);

  private taskService = inject(TaskService);

  private readonly data = inject(DIALOG_DATA) as SubtaskDialogData;

  private readonly initial = this.data.task.checklist.find(
    (item) => item.id === this.data.subtaskId,
  ) as ChecklistItem;

  readonly parentTitle = this.data.task.title;

  readonly label = signal(this.initial.label);

  readonly completed = signal(this.initial.completed);

  readonly assignedTo = signal(this.initial.assignedTo ?? '');

  readonly dueDate = signal(this.initial.dueDate ?? '');

  readonly content = signal(this.initial.description ?? '');

  save() {
    const updated: ChecklistItem = {
      ...this.initial,
      label: this.label().trim() || 'Sans titre',
      completed: this.completed(),
      assignedTo: this.assignedTo().trim() || undefined,
      dueDate: this.dueDate() || undefined,
      description: this.content() || undefined,
    };

    this.taskService.update({
      ...this.data.task,
      checklist: this.data.task.checklist.map((item) => (item.id === updated.id ? updated : item)),
    });
    this.close();
  }

  remove() {
    if (!confirm('Supprimer cette sous-tâche ?')) {
      return;
    }
    this.taskService.update({
      ...this.data.task,
      checklist: this.data.task.checklist.filter((item) => item.id !== this.initial.id),
    });
    this.close();
  }

  close() {
    this.dialogRef.close();
  }
}
