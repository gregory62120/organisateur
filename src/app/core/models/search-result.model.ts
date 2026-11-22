export type SearchResultType = 'task' | 'document' | 'event';

export interface SearchResult {
  type: SearchResultType;

  /** Identifiant de la tâche, de l'évènement ou de la page de document trouvé. */
  id: string;

  title: string;

  /** Extrait montrant l'endroit où la recherche correspond. */
  description: string;
}
