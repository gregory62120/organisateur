import { effect, inject, Injectable, Signal, signal } from '@angular/core';
import { DocumentPage } from '../../features/tiptap/src/models/document-page.model';
import { StorageService } from './storage.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private readonly documentsState = signal<DocumentPage[]>([]);

  /**
   * Toutes les pages.
   */
  readonly documents = this.documentsState.asReadonly();

  /**
   * Identifiant de la page actuellement affichée.
   */
  private readonly currentPageIdState = signal<string | null>(null);

  readonly currentPageId = this.currentPageIdState.asReadonly();

  private readonly rootPageState = signal<DocumentPage | null>(null);

  private storage = inject(StorageService);

  readonly rootPage = this.rootPageState.asReadonly();

  private readonly router = inject(Router);

  constructor(storageService: StorageService) {
    effect(() => storageService.write('document.json', JSON.stringify(this.documentsState())));
  }

  /**
   * Retourne toutes les pages.
   */
  getAll(): DocumentPage[] {
    return this.documentsState();
  }

  /**
   * Retourne une page avec son identifiant.
   */
  getById(id: string): DocumentPage | undefined {
    return this.documentsState().find((page) => page.id === id);
  }

  /**
   * Retourne la page racine.
   */
  getRoot(): DocumentPage | undefined {
    console.log('getRoot');
    return this.documentsState().find((page) => page.parentId === null);
  }

  async refreshRootPage(): Promise<DocumentPage> {
    await this.loadDocuments();

    const id = this.getCurrentDocumentIdFromUrl();

    console.log('id url', id);

    const page = id ? this.getById(id) : this.getOrCreateRoot();

    console.log('refresh', page);

    if (page) {
      this.rootPageState.set(page);
      if (id) {
        this.setCurrentPage(id);
      }
      return page;
    } else {
      const now = new Date().toISOString();

      return {
        id: crypto.randomUUID(),
        parentId: null,
        title: 'Espace de travail',
        content: '<p></p>',
        createdAt: now,
        updatedAt: now,
      };
    }
  }

  async loadDocuments() {
    try {
      const content = await this.storage.read('document.json');

      this.documentsState.update(() => JSON.parse(content));
    } catch {
      this.documentsState.set([]);
    }
  }

  /**
   * Crée la page racine si elle n'existe pas.
   */
  getOrCreateRoot(): DocumentPage {
    const existingRoot = this.getRoot();

    if (existingRoot) {
      this.setCurrentPage(existingRoot.id);
      this.rootPageState.set(existingRoot);
      return existingRoot;
    }

    const now = new Date().toISOString();

    const root: DocumentPage = {
      id: crypto.randomUUID(),
      parentId: null,
      title: 'Espace de travail',
      content: '<p></p>',
      createdAt: now,
      updatedAt: now,
    };

    this.documentsState.update((documents) => [...documents, root]);

    this.setCurrentPage(root.id);
    this.rootPageState.set(root);

    return root;
  }

  /**
   * Définit la page actuellement ouverte.
   */
  setCurrentPage(id: string): void {
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
   * Retourne les enfants directs d'une page.
   */
  getChildren(parentId: string): DocumentPage[] {
    return this.documentsState().filter((page) => page.parentId === parentId);
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

  /**
   * Modifie le titre d'une page.
   */
  updateTitle(id: string, title: string): void {
    this.documentsState.update((documents) =>
      documents.map((page) =>
        page.id === id
          ? {
              ...page,
              title,
              updatedAt: new Date().toISOString(),
            }
          : page,
      ),
    );
  }

  openPage(id: string): DocumentPage | undefined {
    const page = this.getById(id);

    if (page) {
      this.setCurrentPage(id);
    }

    return page;
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
