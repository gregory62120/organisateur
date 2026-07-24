export type DocumentType = 'IMAGE' | 'PDF' | 'OTHER';

export interface ProjectDocument {
  id: string;

  name: string;

  path: string;

  type: DocumentType;

  size: number;

  createdAt: string;
}
