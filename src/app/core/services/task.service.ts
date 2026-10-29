import { effect, inject, Injectable, signal, untracked } from '@angular/core';

import { Task } from '../models/task.model';
import { StorageService } from './storage.service';

const TASKS_FILE = 'tasks.json';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private tasks = signal<Task[]>([]);

  tasksSignal = this.tasks.asReadonly();

  private storage = inject(StorageService);

  /** Message d'erreur de la dernière lecture / écriture de tasks.json (null si tout va bien). */
  readonly error = signal<string | null>(null);

  /** Vrai tant qu'une écriture de tasks.json est en cours. */
  readonly saving = signal(false);

  /** Les écritures sont chaînées : chacune enregistre l'état le plus récent, sans jamais en perdre. */
  private writeQueue: Promise<void> = Promise.resolve();

  /** Évite d'écraser un tasks.json illisible tant qu'il n'a pas été rechargé correctement. */
  private writeBlocked = false;

  constructor() {
    effect(() => {
      if (this.storage.projectOpened() > 0) {
        untracked(() => this.loadTask());
      }
    });
  }

  add(task: Task) {
    this.tasks.update((list) => [...list, task]);

    return this.save();
  }

  update(task: Task) {
    const updated = { ...task, updatedAt: new Date().toISOString() };
    this.tasks.update((list) => list.map((t) => (t.id === task.id ? updated : t)));

    return this.save();
  }

  updateTask(content: Task[]) {
    this.tasks.update(() => content);
  }

  delete(id: string) {
    this.tasks.update((list) => list.filter((t) => t.id !== id));

    return this.save();
  }

  move(id: string, status: Task['status']) {
    this.tasks.update((list) =>
      list.map((t) => (t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t)),
    );

    return this.save();
  }

  /**
   * Déplace une tâche dans une colonne à une position donnée.
   * `index` est la position dans la colonne de destination (tâche déplacée exclue).
   */
  moveTo(id: string, status: Task['status'], index: number) {
    const list = this.tasks();
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

    this.tasks.set([...others.slice(0, insertAt), moved, ...others.slice(insertAt)]);

    return this.save();
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

  private save(): Promise<void> {
    if (this.writeBlocked) {
      return Promise.resolve();
    }

    this.saving.set(true);
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        if (!this.storage.isOpen()) {
          throw new Error('Aucun projet ouvert : les modifications ne sont pas enregistrées.');
        }

        await this.storage.write(TASKS_FILE, JSON.stringify(this.tasks(), null, 2));
        this.error.set(null);
      } catch (error) {
        this.error.set(
          error instanceof Error ? error.message : "Impossible d'écrire le fichier tasks.json.",
        );
      } finally {
        this.saving.set(false);
      }
    });

    return this.writeQueue;
  }

  async loadTask() {
    try {
      const content = await this.storage.read(TASKS_FILE);

      if (content) {
        this.tasks.set(JSON.parse(content));
      }
      this.writeBlocked = false;
      this.error.set(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        // Pas encore de tasks.json dans ce dossier : il sera créé à la première écriture.
        this.tasks.set([]);
        this.writeBlocked = false;
        return;
      }

      this.writeBlocked = true;
      this.error.set(
        'tasks.json est illisible : aucune écriture ne sera faite tant que le fichier est invalide.',
      );
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
