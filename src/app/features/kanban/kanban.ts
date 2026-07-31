import { Component, inject } from '@angular/core';

import { CdkDropList, CdkDrag, CdkDropListGroup, CdkDragDrop } from '@angular/cdk/drag-drop';

import { TaskService } from '../../core/services/task.service';
import { TaskCardComponent } from './components/task-card/task-card';
import { Task, TaskStatus } from '../../core/models/task.model';
import { StorageService } from '../../core/services/storage.service';
import { Dialog } from '@angular/cdk/dialog';
import { TaskDialogComponent } from './components/task-dialog/task-dialog';

@Component({
  selector: 'app-kanban',

  standalone: true,

  imports: [CdkDropList, CdkDrag, CdkDropListGroup, TaskCardComponent],

  templateUrl: './kanban.html',
  styleUrl: './kanban.scss',
})
export class KanbanComponent {
  service = inject(TaskService);

  storage = inject(StorageService);

  private dialog = inject(Dialog);

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
    return this.service.tasksSignal().filter((t) => t.status === status);
  }

  drop(event: CdkDragDrop<any[]>, status: TaskStatus) {
    const task = event.item.data;

    this.service.move(task.id, status);
  }

  addTask(status: TaskStatus) {
    const task = this.service.createEmpty();

    task.status = status;

    this.service.add(task);
  }

  async openProject() {
    await this.storage.openProject();

    await this.service.load();
  }

  open(task: Task) {
    const ref = this.dialog.open(TaskDialogComponent, {
      data: task,
      width: '90vw',
      height: '90vh',
    });

    ref.closed.subscribe((result) => {
      if (result) {
        this.service.update(result as Task);
      }
    });
  }
}
