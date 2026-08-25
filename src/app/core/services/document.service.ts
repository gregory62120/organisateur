import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DocumentPage } from '../../features/tiptap/src/models/document-page.model';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private readonly documentsState = signal<DocumentPage[]>([]);

  /**
   * La page à afficher.
   */
  readonly documents = computed(() => {
    const document = this.documentsState();
    return document.filter((page) => page.id == this.currentPageId());
  });

  /**
   * Identifiant de la page actuellement affichée.
   */
  private readonly currentPageIdState = signal<string | null>(null);

  readonly currentPageId = this.currentPageIdState.asReadonly();

  private storage = inject(StorageService);

  private readonly router = inject(Router);

  constructor(storageService: StorageService) {
    effect(() => {
      const documentState = this.documentsState();
      if (documentState.length) {
        storageService.write('document.json', JSON.stringify(documentState));
      }
    });
  }

  /**
   * Retourne une page avec son identifiant.
   */
  getPagebyId(id: string): DocumentPage | undefined {
    return this.documentsState().find((page) => page.id === id);
  }

  async refreshRootPage(): Promise<void> {
    const id = this.getCurrentDocumentIdFromUrl();

    const page = id ? this.getPagebyId(id) : this.getOrCreateRootPage();

    if (page) {
      if (id) {
        this.setCurrentPageId(id);
      }
    } else {
      const now = new Date().toISOString();

      // return {
      //   id: crypto.randomUUID(),
      //   parentId: null,
      //   title: 'Espace de travail',
      //   content: '<p></p>',
      //   createdAt: now,
      //   updatedAt: now,
      // };
    }
  }

  async loadDocumentFromStorage() {
    try {
      const content = await this.storage.read('document.json');
      if (content) {
        this.documentsState.update(() => JSON.parse(content));
      }
    } catch {
      this.documentsState.set([]);
    }
  }

  getOrCreateRootPage(): DocumentPage {
    const rootPage = this.documentsState().find((page) => page.parentId === null);

    if (rootPage) {
      this.setCurrentPageId(rootPage.id);
      return rootPage;
    }

    const now = new Date().toISOString();

    const root: DocumentPage = {
      id: crypto.randomUUID(),
      parentId: null,
      title: 'Espace de travail de test',
      content: '<p></p>',
      createdAt: now,
      updatedAt: now,
    };

    this.documentsState.update((documents) => {
      return [...documents, root];
    });

    this.setCurrentPageId(root.id);

    return root;
  }

  /**
   * Définit la page actuellement ouverte.
   */
  setCurrentPageId(id: string): void {
    this.currentPageIdState.set(id);
  }

  createChildOfCurrentPage(title = 'Nouvelle page'): DocumentPage {
    const parentId = this.currentPageIdState();

    if (!parentId) {
      throw new Error('Aucune page courante.');
    }

    return this.createChild(parentId, title);
  }

  createChild(parentId: string, title = 'Nouvelle page'): DocumentPage {
    const now = new Date().toISOString();

    const page: DocumentPage = {
      id: crypto.randomUUID(),
      parentId,
      title,
      content: '<p></p>',
      createdAt: now,
      updatedAt: now,
    };

    this.documentsState.update((documents) => [...documents, page]);

    return page;
  }

  /**
   * Met à jour le contenu d'une page.
   */
  updateContent(content: string): void {
    this.documentsState.update((documents) =>
      documents.map((page) =>
        page.id === this.currentPageId()
          ? {
              ...page,
              content,
              updatedAt: new Date().toISOString(),
            }
          : page,
      ),
    );
  }

  updateDocuments(content: DocumentPage[]) {
    this.documentsState.update(() => content);
  }

  private getCurrentDocumentIdFromUrl(): string | null {
    const segments = this.router.url.split('/');

    const index = segments.indexOf('document');

    if (index !== -1 && segments[index + 1]) {
      return segments[index + 1];
    }

    return null;
  }
}
