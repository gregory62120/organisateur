import { Component, Input, inject } from '@angular/core';

import { Task } from '../../../core/models/task.model';

@Component({
  selector: 'app-task-detail',

  standalone: true,

  templateUrl: './task-detail.html',
})
export class TaskDetailComponent {
  @Input()
  task!: Task;
}
