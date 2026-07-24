import { Component, inject } from '@angular/core';

import { TaskService } from '../../core/services/task.service';

@Component({
  selector: 'app-dashboard',

  standalone: true,

  templateUrl: './dashboard.html',
})
export class DashboardComponent {
  private tasks = inject(TaskService);

  get total() {
    return this.tasks.tasksSignal().length;
  }

  get done() {
    return this.tasks.tasksSignal().filter((t) => t.status === 'DONE').length;
  }

  get progress() {
    if (!this.total) return 0;

    return Math.round((this.done / this.total) * 100);
  }
}
