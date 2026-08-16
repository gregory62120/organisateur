import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Task } from '../../../../core/models/task.model';
import { TaskService } from '../../../../core/services/task.service';
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
  private taskService = inject(TaskService);
  readonly task = structuredClone(inject(DIALOG_DATA) as Task);

  content = signal(this.task.description ?? '');

  updateContent(content: string) {
    this.content.update(() => content);
  }

  save() {
    console.log(this.task);
    this.taskService.update({
      ...this.task,
      description: this.content() ?? '',
    });
    this.close();
  }

  close() {
    this.dialogRef.close();
  }
}
