import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Task } from '../../../../core/models/task.model';
import { EditorComponent } from '../../../editor/editor';

@Component({
  selector: 'app-task-dialog',
  standalone: true,
  imports: [FormsModule, EditorComponent, ReactiveFormsModule],
  templateUrl: './task-dialog.html',
  styleUrl: './task-dialog.scss',
})
export class TaskDialogComponent {
  @ViewChild('editor')
  editor!: ElementRef<HTMLDivElement>;

  readonly dialogRef = inject(DialogRef<Task>);
  readonly task = structuredClone(inject(DIALOG_DATA) as Task);

  descriptionControl = new FormControl(this.task.description ?? '');

  save() {
    console.log(this.descriptionControl.value);
    this.dialogRef.close({
      ...this.task,
      description: this.descriptionControl.value ?? '',
    });
  }

  close() {
    this.dialogRef.close();
  }
}
