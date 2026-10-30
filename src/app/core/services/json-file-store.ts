import { signal } from '@angular/core';

import { StorageService } from './storage.service';

/**
 * Liste d'éléments persistée dans un fichier JSON du projet ouvert.
 *
 * - les écritures sont chaînées : chacune enregistre l'état le plus récent, sans en perdre ;
 * - un fichier illisible n'est jamais écrasé tant qu'il n'a pas été rechargé correctement ;
 * - un fichier absent est simplement créé à la première écriture.
 */
export class JsonFileStore<T> {
  private readonly state = signal<T[]>([]);

  readonly items = this.state.asReadonly();

  /** Message d'erreur de la dernière lecture / écriture (null si tout va bien). */
  readonly error = signal<string | null>(null);

  /** Vrai tant qu'une écriture est en cours. */
  readonly saving = signal(false);

  private writeQueue: Promise<void> = Promise.resolve();

  private writeBlocked = false;

  constructor(
    private readonly storage: StorageService,
    private readonly file: string,
  ) {}

  /** Remplace le contenu en mémoire, sans écrire. */
  set(items: T[]) {
    this.state.set(items);
  }

  /** Modifie le contenu puis l'écrit dans le fichier. */
  update(change: (items: T[]) => T[]): Promise<void> {
    this.state.update(change);
    return this.save();
  }

  /** Remplace le contenu puis l'écrit dans le fichier. */
  replace(items: T[]): Promise<void> {
    this.state.set(items);
    return this.save();
  }

  async load() {
    try {
      const content = await this.storage.read(this.file);

      if (content) {
        this.state.set(JSON.parse(content));
      }
      this.writeBlocked = false;
      this.error.set(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        // Pas encore de fichier dans ce dossier : il sera créé à la première écriture.
        this.state.set([]);
        this.writeBlocked = false;
        return;
      }

      this.writeBlocked = true;
      this.error.set(
        `${this.file} est illisible : aucune écriture ne sera faite tant que le fichier est invalide.`,
      );
    }
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

        await this.storage.write(this.file, JSON.stringify(this.state(), null, 2));
        this.error.set(null);
      } catch (error) {
        this.error.set(
          error instanceof Error ? error.message : `Impossible d'écrire le fichier ${this.file}.`,
        );
      } finally {
        this.saving.set(false);
      }
    });

    return this.writeQueue;
  }
}
