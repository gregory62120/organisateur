import { Component, inject } from '@angular/core';

import { CdkDropList, CdkDrag, CdkDropListGroup } from '@angular/cdk/drag-drop';

import { TaskService } from '../../core/services/task.service';
import { TaskCardComponent } from "./components/task-card/task-card";

@Component({
  selector: 'app-kanban',

  standalone: true,

  imports: [CdkDropList, CdkDrag, CdkDropListGroup, TaskCardComponent],

  templateUrl: './kanban.html',
})
export class KanbanComponent {
  service = inject(TaskService);

  columns = [
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

  drop(event: any, status: any) {
    const task = event.item.data;

    this.service.move(task.id, status);
  }
}
