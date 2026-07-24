import { Injectable, inject } from '@angular/core';

import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  storage = inject(StorageService);

  documents: any[] = [];

  async import(file: File) {
    let folder = 'documents';

    if (file.type.startsWith('image/')) {
      folder = 'images';
    }

    const path = await this.storage.saveFile(folder, file);

    const doc = {
      id: crypto.randomUUID(),

      name: file.name,

      path,

      type: file.type,

      size: file.size,

      date: new Date(),
    };

    this.documents.push(doc);

    await this.saveIndex();

    return doc;
  }

  private async saveIndex() {
    // sera écrit dans documents.json
  }

  getAll() {
    return this.documents;
  }
}
