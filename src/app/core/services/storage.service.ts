import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private root?: FileSystemDirectoryHandle;

  async openProject() {
    this.root = await window.showDirectoryPicker({
      mode: 'readwrite',
    });
  }

  private checkRoot(): FileSystemDirectoryHandle {
    if (!this.root) {
      throw new Error('Projet fermé');
    }

    return this.root;
  }

  private async getFolder(path: string) {
    return this.checkRoot().getDirectoryHandle(path, {
      create: true,
    });
  }

  async saveFile(folder: string, file: File) {
    const dir = await this.getFolder(folder);

    const handle = await dir.getFileHandle(file.name, {
      create: true,
    });

    const writer = await handle.createWritable();

    await writer.write(file);

    await writer.close();

    return `${folder}/${file.name}`;
  }

  async write(path: string, content: string) {
    const handle = await this.checkRoot().getFileHandle(path, {
      create: true,
    });

    const writer = await handle.createWritable();

    await writer.write(content);

    await writer.close();
  }

  async read(path: string): Promise<string> {
    const handle = await this.checkRoot().getFileHandle(path);

    const file = await handle.getFile();

    return file.text();
  }
}
