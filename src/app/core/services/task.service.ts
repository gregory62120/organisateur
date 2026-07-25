import { inject, Injectable, signal } from '@angular/core';

import { Task } from '../models/task.model';
import { AutoSaveService } from './autosave.service';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private tasks = signal<Task[]>([]);

  tasksSignal = this.tasks.asReadonly();

  private storage = inject(StorageService);

  private autoSave = inject(AutoSaveService);

  add(task: Task) {
    this.tasks.update((list) => [...list, task]);

    this.save();
  }

  update(task: Task) {
    this.tasks.update((list) => list.map((t) => (t.id === task.id ? task : t)));
    this.save();
  }

  delete(id: string) {
    this.tasks.update((list) => list.filter((t) => t.id !== id));
    this.save();
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
    this.save();
  }

  createEmpty(): Task {
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

  private save() {
    this.autoSave.schedule(async () => {
      const content = JSON.stringify(this.tasks(), null, 2);

      await this.storage.write('tasks.json', content);
    });
  }

  async load() {
    try {
      const content = await this.storage.read('tasks.json');

      this.tasks.set(JSON.parse(content));
    } catch {
      this.tasks.set([]);
    }
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
