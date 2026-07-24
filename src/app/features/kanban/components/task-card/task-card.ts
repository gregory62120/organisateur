import { Component, Input, inject } from '@angular/core';
import { Task } from '../../../../core/models/task.model';
import { TaskService } from '../../../../core/services/task.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-task-card',
  standalone: true,
  templateUrl: './task-card.html',
  styleUrl: './task-card.scss',
  imports: [FormsModule],
})
export class TaskCardComponent {
  @Input() task!: Task;

  service = inject(TaskService);

  editing = false;

  editedTask!: Task;

  edit() {
    this.editedTask = {
      ...this.task,
    };

    this.editing = true;
  }

  save() {
    this.service.update(this.editedTask);

    this.editing = false;
  }

  cancel() {
    this.editing = false;
  }

  delete() {
    this.service.delete(this.task.id);
  }
}
