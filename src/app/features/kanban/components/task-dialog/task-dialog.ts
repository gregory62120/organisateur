import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Task } from '../../../../core/models/task.model';

@Component({
  selector: 'app-task-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './task-dialog.html',
  styleUrl: './task-dialog.scss',
})
export class TaskDialogComponent {
  readonly dialogRef = inject(DialogRef<Task>);
  readonly task = structuredClone(inject(DIALOG_DATA) as Task);

  save() {
    this.dialogRef.close(this.task);
  }

  close() {
    this.dialogRef.close();
  }
}
