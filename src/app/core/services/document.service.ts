import { computed, effect, inject, Injectable, Signal, signal } from '@angular/core';
import { DocumentPage } from '../../features/tiptap/src/models/document-page.model';
import { StorageService } from './storage.service';
import { Router } from '@angular/router';

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
    console.log(document);
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
    console.log('init service');
    effect(() => {
      const documentState = this.documentsState();
      console.log('écriture', documentState);
      if (documentState.length) {
        storageService.write('document.json', JSON.stringify(documentState));
      }
    });
    effect(() => console.log(this.currentPageId()));
    effect(() => console.log(this.documents()));
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

    console.log('refresh', page);

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
      console.log('loadDocumentFromStorage');
      if (content) {
        this.documentsState.update(() => JSON.parse(content));
      }
    } catch {
      console.log('loadDocumentFromStorage 1');
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

    console.log('getOrCreateRootPage');
    this.documentsState.update((documents) => {
      console.log('update');
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
    console.log('updateContent');
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
    console.log('content', content);
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
