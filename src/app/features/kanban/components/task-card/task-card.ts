import { Component, Input, inject } from '@angular/core';
import { Task } from '../../../../core/models/task.model';
import { TaskService } from '../../../../core/services/task.service';

@Component({
  selector: 'app-task-card',
  standalone: true,
  templateUrl: './task-card.html',
  styleUrl: './task-card.scss',
})
export class TaskCardComponent {
  @Input() task!: Task;

  service = inject(TaskService);

  delete() {
    this.service.delete(this.task.id);
  }
}
