import { effect, inject, Injectable, untracked } from '@angular/core';

import { Task } from '../models/task.model';
import { JsonFileStore } from './json-file-store';
import { StorageService } from './storage.service';

const TASKS_FILE = 'tasks.json';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private storage = inject(StorageService);

  private store = new JsonFileStore<Task>(this.storage, TASKS_FILE);

  tasksSignal = this.store.items;

  /** Message d'erreur de la dernière lecture / écriture de tasks.json (null si tout va bien). */
  readonly error = this.store.error;

  /** Vrai tant qu'une écriture de tasks.json est en cours. */
  readonly saving = this.store.saving;

  constructor() {
    effect(() => {
      if (this.storage.projectOpened() > 0) {
        untracked(() => this.loadTask());
      }
    });
  }

  add(task: Task) {
    return this.store.update((list) => [...list, task]);
  }

  update(task: Task) {
    const updated = { ...task, updatedAt: new Date().toISOString() };
    return this.store.update((list) => list.map((t) => (t.id === task.id ? updated : t)));
  }

  /** Remplace les tâches en mémoire, sans écrire (utilisé après une synchronisation entrante). */
  updateTask(content: Task[]) {
    this.store.set(content);
  }

  delete(id: string) {
    return this.store.update((list) => list.filter((t) => t.id !== id));
  }

  move(id: string, status: Task['status']) {
    return this.store.update((list) =>
      list.map((t) => (t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t)),
    );
  }

  /**
   * Déplace une tâche dans une colonne à une position donnée.
   * `index` est la position dans la colonne de destination (tâche déplacée exclue).
   */
  moveTo(id: string, status: Task['status'], index: number) {
    const list = this.tasksSignal();
    const task = list.find((t) => t.id === id);
    if (!task) {
      return Promise.resolve();
    }

    const others = list.filter((t) => t.id !== id);
    const column = others.filter((t) => t.status === status);
    const moved: Task = {
      ...task,
      status,
      updatedAt: task.status === status ? task.updatedAt : new Date().toISOString(),
    };

    let insertAt = others.length;
    if (index < column.length) {
      insertAt = others.indexOf(column[index]);
    } else if (column.length) {
      insertAt = others.indexOf(column[column.length - 1]) + 1;
    }

    return this.store.replace([...others.slice(0, insertAt), moved, ...others.slice(insertAt)]);
  }

  createEmpty(): Task {
    return {
      id: crypto.randomUUID(),

      title: 'Nouvelle tâche',

      description: '',

      status: 'TODO',

      priority: 'MEDIUM',

      tags: [],

      checklist: [],

      comments: [],

      attachments: [],

      createdAt: new Date().toISOString(),

      updatedAt: new Date().toISOString(),
    };
  }

  loadTask() {
    return this.store.load();
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
