import { Injectable, computed, inject, signal } from '@angular/core';
import { PopupService } from './popup/popup';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private modal = inject(PopupService);
  private readonly rootState = signal<FileSystemDirectoryHandle | undefined>(undefined);
  readonly root = this.rootState.asReadonly();

  /**
   * Compteur incrémenté à chaque ouverture de projet.
   * Permet aux composants d'écouter les changements et de se réactualiser.
   */
  private readonly projectOpenedCount = signal<number>(0);
  readonly projectOpened = this.projectOpenedCount.asReadonly();

  readonly isOpen = computed(() => this.rootState() !== undefined);

  async openProject(): Promise<void> {
    const directory =
      'showDirectoryPicker' in window
        ? await window.showDirectoryPicker({ mode: 'readwrite' })
        : await navigator.storage.getDirectory();
    this.rootState.set(directory);
    this.projectOpenedCount.update((count) => count + 1);
  }

  getRoot(): FileSystemDirectoryHandle | undefined {
    const root = this.rootState();
    return root;
  }

  async write(path: string, content: string): Promise<void> {
    const root = this.getRoot();
    if (!root) {
      return;
    }
    const handle = await root.getFileHandle(path, {
      create: true,
    });

    const writer = await handle.createWritable();

    try {
      await writer.write(content);
    } finally {
      await writer.close();
    }
  }

  async read(path: string): Promise<string | undefined> {
    while (this.modal.isOpen()) {}
    const root = this.getRoot();
    if (!root) {
      this.modal.openPopup();
      return;
    }
    const handle = await root.getFileHandle(path);

    const file = await handle.getFile();
    return file.text();
  }
}
