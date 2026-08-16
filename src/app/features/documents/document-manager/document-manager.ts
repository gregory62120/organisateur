import {
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
  WritableSignal,
} from '@angular/core';
import { DocumentService } from '../../../core/services/document.service';
import { EditorComponent } from '../../editor/editor';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../../core/services/storage.service';
import { PopupService } from '../../../core/services/popup/popup';

@Component({
  selector: 'app-document-manager',
  standalone: true,
  imports: [EditorComponent, FormsModule],
  templateUrl: './document-manager.html',
})
export class DocumentManagerComponent implements OnInit {
  private readonly service = inject(DocumentService);
  private readonly storage = inject(StorageService);
  private modal = inject(PopupService);
  private isInitialize: boolean = true;

  constructor() {
    effect(() => console.log(this.content()));

    // Se réactualiser quand un projet est ouvert
    effect(() => {
      const count = this.storage.projectOpened();
      if (count > 0) {
        this.reloadDocuments();
      }
    });
  }

  content = computed(() => {
    const pages = this.service.documents();
    if (pages.length < 1) {
      return '<p></p>';
    } else if (pages.length == 1) {
      return pages[0].content;
    } else {
      throw new Error('page en double');
    }
  });

  ngOnInit() {
    this.init();
  }

  private async init(): Promise<void> {
    console.log('init');
    if (!this.storage.getRoot()) {
      this.modal.openPopup();
      return;
    }
    await this.reloadDocuments();
    this.isInitialize = false;
  }

  private async reloadDocuments(): Promise<void> {
    await this.service.loadDocumentFromStorage();
    await this.service.refreshRootPage();
  }

  onContentChange(content: unknown): void {
    console.log('onContentChange', content);
    if (this.isInitialize) {
      return;
    }
    if (typeof content !== 'string') {
      return;
    }

    this.service.updateContent(content);
  }
}
