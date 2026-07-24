import { Component, inject } from '@angular/core';

import { CdkDropList, CdkDrag, CdkDropListGroup, CdkDragDrop } from '@angular/cdk/drag-drop';

import { TaskService } from '../../core/services/task.service';
import { TaskCardComponent } from './components/task-card/task-card';
import { Task, TaskStatus } from '../../core/models/task.model';

@Component({
  selector: 'app-kanban',

  standalone: true,

  imports: [CdkDropList, CdkDrag, CdkDropListGroup, TaskCardComponent],

  templateUrl: './kanban.html',
  styleUrl: './kanban.scss',
})
export class KanbanComponent {
  service = inject(TaskService);

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
}
