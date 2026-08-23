import { Injectable } from '@angular/core';
import { Task } from '../models/task.model';
import { TaskService } from './task.service';

@Injectable({
  providedIn: 'root',
})
export class CalendarService {
  constructor(private taskService: TaskService) {}

  tasksForMonth(month: number, year: number) {
    return this.taskService.tasksSignal().filter((task) => {
      if (!task.dueDate) return false;

      const date = new Date(task.dueDate);

      return date.getMonth() === month && date.getFullYear() === year;
    });
  }

  overdue(task: Task) {
    if (!task.dueDate) return false;

    return new Date(task.dueDate) < new Date() && task.status !== 'DONE';
  }

  getTasksForDate(date: string): Task[] {
    return this.taskService.tasksSignal().filter((task) => {
      return task.dueDate === date;
    });
  }
}
