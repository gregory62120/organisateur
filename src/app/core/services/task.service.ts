import { Injectable, signal } from '@angular/core';

import { Task } from '../models/task.model';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private tasks = signal<Task[]>([]);

  tasksSignal = this.tasks.asReadonly();

  add(task: Task) {
    this.tasks.update((list) => [...list, task]);
  }

  update(task: Task) {
    this.tasks.update((list) => list.map((t) => (t.id === task.id ? task : t)));
  }

  delete(id: string) {
    this.tasks.update((list) => list.filter((t) => t.id !== id));
  }

  move(id: string, status: Task['status']) {
    this.tasks.update((list) =>
      list.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
            }
          : t,
      ),
    );
  }

  createEmpty() {
    return {
      id: crypto.randomUUID(),

      title: 'Nouvelle tâche',

      description: '',

      status: 'TODO',

      priority: 'MEDIUM',

      checklist: [],

      comments: [],

      attachments: [],

      createdAt: new Date().toISOString(),

      updatedAt: new Date().toISOString(),
    };
  }

  projectProgress() {
    const tasks = this.tasksSignal();

    if (!tasks.length) return 0;

    const values = tasks.map((t) => {
      switch (t.status) {
        case 'DONE':
          return 100;

        case 'IN_PROGRESS':
          return 50;

        default:
          return 0;
      }
    });

    return Math.round(values.reduce((a: number, b: number) => a + b, 0) / tasks.length);
  }
}
