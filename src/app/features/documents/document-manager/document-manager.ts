import { Component, inject, signal } from '@angular/core';
import { DocumentService } from '../../../core/services/document.service';
import { EditorComponent } from '../../editor/editor';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-document-manager',
  standalone: true,
  imports: [EditorComponent, FormsModule],
  templateUrl: './document-manager.html',
})
export class DocumentManagerComponent {
  private readonly service = inject(DocumentService);

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    console.log('test');

    const page = await this.service.refreshRootPage();

    if (page) {
      this.content = page.content;
    }
  }

  /**
   * La page principale possède maintenant
   * son propre identifiant.
   */
  readonly rootPage = this.service.getOrCreateRoot();

  content?: string;

  onContentChange(content: unknown): void {
    if (typeof content !== 'string') {
      return;
    }

    console.log(content);
    this.content = content;

    this.service.updateContent(content);
  }
}
