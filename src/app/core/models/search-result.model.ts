export interface SearchResult {
  type: 'task' | 'document' | 'comment';

  title: string;

  description: string;

  reference: string;
}
