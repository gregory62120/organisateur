import { Component, inject } from '@angular/core';
import { DocumentService } from '../../../core/services/document.service';
import { FileDropZoneComponent } from '../file-drop-zone/file-drop-zone';
import { EditorComponent } from "../../editor/editor";

@Component({
  selector: 'app-document-manager',

  standalone: true,

  imports: [FileDropZoneComponent, EditorComponent],

  templateUrl: './document-manager.html',
})
export class DocumentManagerComponent {
  service = inject(DocumentService);

  documents = this.service.getAll();

  async add(files: File[]) {
    for (const file of files) {
      await this.service.import(file);
    }
  }
}
