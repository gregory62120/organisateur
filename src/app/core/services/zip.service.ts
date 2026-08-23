import { Injectable } from '@angular/core';

import JSZip from 'jszip';

import { saveAs } from 'file-saver';

@Injectable({
  providedIn: 'root',
})
export class ZipService {
  async createProjectZip(files: any[]) {
    const zip = new JSZip();

    for (const file of files) {
      zip.file(
        file.path,

        file.blob,
      );
    }

    const result = await zip.generateAsync({
      type: 'blob',
    });

    saveAs(
      result,

      'projet.zip',
    );
  }
}
