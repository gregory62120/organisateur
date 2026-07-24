import { Injectable } from '@angular/core';
import { SearchResult } from '../models/search-result.model';

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  search(query: string) {
    const results: SearchResult[] = [];

    // recherche tâches

    // recherche documents

    // recherche commentaires

    return results.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()));
  }
}
