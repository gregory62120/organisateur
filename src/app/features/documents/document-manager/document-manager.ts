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
import { Router } from '@angular/router';
import { PopupService } from '../../../core/services/popup/popup';

@Component({
  selector: 'app-document-manager',
  standalone: true,
  imports: [EditorComponent, FormsModule],
  templateUrl: './document-manager.html',
  styleUrl: './document-manager.scss',
})
export class DocumentManagerComponent implements OnInit {
  private readonly service = inject(DocumentService);
  private readonly storage = inject(StorageService);
  private modal = inject(PopupService);
  private readonly router = inject(Router);
  private isInitialize: boolean = true;

  constructor() {
    // Se réactualiser quand un projet est ouvert
    effect(() => {
      const count = this.storage.projectOpened();
      if (count > 0) {
        this.reloadDocuments();
      }
    });
  }

  /** Chemin de la racine jusqu'à la page affichée, en remontant les `parentId`. */
  readonly breadcrumb = computed(() => {
    const pages = this.service.allPages();
    const trail: { id: string; title: string }[] = [];
    const seen = new Set<string>();
    let page = pages.find((item) => item.id === this.service.currentPageId());
    while (page && !seen.has(page.id)) {
      seen.add(page.id);
      trail.unshift({ id: page.id, title: this.service.pageTitle(page) || 'Sans titre' });
      const parentId: string | null = page.parentId;
      page = parentId ? pages.find((item) => item.id === parentId) : undefined;
    }
    return trail;
  });

  async openPage(id: string): Promise<void> {
    await this.router.navigate(['/document', id]);
    this.service.setCurrentPageId(id);
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
    if (this.isInitialize) {
      return;
    }
    if (typeof content !== 'string') {
      return;
    }

    this.service.updateContent(content);
  }
}
