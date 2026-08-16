import { Component, effect, inject } from '@angular/core';

import { CdkDropList, CdkDrag, CdkDropListGroup, CdkDragDrop } from '@angular/cdk/drag-drop';

import { TaskService } from '../../core/services/task.service';
import { TaskCardComponent } from './components/task-card/task-card';
import { Task, TaskStatus } from '../../core/models/task.model';
import { StorageService } from '../../core/services/storage.service';
import { Dialog } from '@angular/cdk/dialog';
import { TaskDialogComponent } from './components/task-dialog/task-dialog';
import { DocumentManagerComponent } from '../documents/document-manager/document-manager';
import { DocumentService } from '../../core/services/document.service';

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

  private documentService = inject(DocumentService);

  constructor() {
    // Se réactualiser quand un projet est ouvert
    effect(() => {
      const count = this.storage.projectOpened();
      if (count > 0) {
        this.taskService.loadTask();
      }
    });
  }

  columns: { name: string; status: TaskStatus }[] = [
    {
      name: 'A faire',
      status: 'TODO',
    },

    {
      name: 'En cours',
      status: 'IN_PROGRESS',
    },

    {
      name: 'Validation',
      status: 'VALIDATION',
    },

    {
      name: 'Terminé',
      status: 'DONE',
    },
  ];

  tasks(status: string) {
    return this.taskService.tasksSignal().filter((t) => t.status === status);
  }

  drop(event: CdkDragDrop<any[]>, status: TaskStatus) {
    const task = event.item.data;

    this.taskService.move(task.id, status);
  }

  addTask(status: TaskStatus) {
    const task = this.taskService.createEmpty();

    task.status = status;

    this.taskService.add(task);
  }

  async openProject() {
    await this.storage.openProject();

    await this.taskService.loadTask();
  }

  open(task: Task) {
    const ref = this.dialog.open(TaskDialogComponent, {
      data: task,
      width: '90vw',
      height: '90vh',
    });

    ref.closed.subscribe((result) => {
      if (result) {
        this.taskService.update(result as Task);
      }
    });
  }
}
