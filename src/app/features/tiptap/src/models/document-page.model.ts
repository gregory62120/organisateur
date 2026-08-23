// core/models/document-page.model.ts

export interface DocumentPage {
  id: string;
  parentId: string | null;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
