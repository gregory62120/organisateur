import { Component, Input } from '@angular/core';
import { Task } from '../../../../core/models/task.model';

@Component({
  selector: 'app-task-card',

  standalone: true,

  templateUrl: './task-card.html',
})
export class TaskCardComponent {
  @Input()
  task!: Task;
}
