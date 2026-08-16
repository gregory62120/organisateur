import { Injectable, computed, inject, signal } from '@angular/core';
import { PopupService } from './popup/popup';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private modal = inject(PopupService);
  private readonly rootState = signal<FileSystemDirectoryHandle | undefined>(undefined);
  readonly root = this.rootState.asReadonly();

  readonly isOpen = computed(() => this.rootState() !== undefined);

  async openProject(): Promise<void> {
    const directory = await window.showDirectoryPicker({
      mode: 'readwrite',
    });

    this.rootState.set(directory);
  }

  getRoot(): FileSystemDirectoryHandle | undefined {
    console.log('getRoot');
    const root = this.rootState();
    return root;
  }

  async write(path: string, content: string): Promise<void> {
    const root = this.getRoot();
    if (!root) {
      console.log('erreur projet fermée');
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
    console.log('read');
    const root = this.getRoot();
    if (!root) {
      console.log('erreur projet fermée');
      this.modal.openPopup();
      return;
    }
    const handle = await root.getFileHandle(path);

    const file = await handle.getFile();

    return file.text();
  }
}
