import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-file-drop-zone',

  standalone: true,

  templateUrl: './file-drop-zone.html',
})
export class FileDropZoneComponent {
  @Output()
  files = new EventEmitter<File[]>();

  drop(event: DragEvent) {
    event.preventDefault();

    const files = Array.from(event.dataTransfer!.files);

    this.files.emit(files);
  }

  allow(event: DragEvent) {
    event.preventDefault();
  }
}
