import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable } from '@angular/core';

import { Task } from '../../../core/models/task.model';
import {
  SubtaskDialogComponent,
  SubtaskDialogData,
} from '../components/subtask-dialog/subtask-dialog';
import { TaskDialogComponent, TaskDialogData } from '../components/task-dialog/task-dialog';

const PANEL = {
  panelClass: 'tf-dialog-panel',
  maxWidth: '96vw',
  maxHeight: '94vh',
};

/** Ouvre les formulaires de tâche et de sous-tâche, partagés par le Kanban et le Gantt. */
@Injectable({
  providedIn: 'root',
})
export class TaskDialogService {
  private dialog = inject(Dialog);

  /** `isNew` : la tâche n'est écrite dans tasks.json qu'à la validation du formulaire. */
  openTask(task: Task, isNew = false) {
    return this.dialog.open<unknown, TaskDialogData>(TaskDialogComponent, {
      ...PANEL,
      data: { task, isNew },
    });
  }

  openSubtask(task: Task, subtaskId: string) {
    return this.dialog.open<unknown, SubtaskDialogData>(SubtaskDialogComponent, {
      ...PANEL,
      data: { task, subtaskId },
    });
  }
}
