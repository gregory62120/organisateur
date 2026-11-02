import { effect, inject, Injectable, untracked } from '@angular/core';

import { CHART_KEYS, ReportSnapshot } from '../models/report-snapshot.model';
import { Summary, SummaryStats } from '../models/summary.model';
import { JsonFileStore } from './json-file-store';
import { StorageService } from './storage.service';

export const SUMMARIES_FILE = 'summaries.json';

/** Résumés rédigés à propos d'une étiquette : enregistrés, consultables, modifiables et supprimables. */
@Injectable({
  providedIn: 'root',
})
export class SummaryService {
  private storage = inject(StorageService);

  private store = new JsonFileStore<Summary>(this.storage, SUMMARIES_FILE);

  readonly summaries = this.store.items;

  /** Message d'erreur de la dernière lecture / écriture de summaries.json (null si tout va bien). */
  readonly error = this.store.error;

  readonly saving = this.store.saving;

  constructor() {
    effect(() => {
      if (this.storage.projectOpened() > 0) {
        untracked(() => this.load());
      }
    });
  }

  add(summary: Summary) {
    return this.store.update((list) => [...list, summary]);
  }

  update(summary: Summary) {
    return this.store.update((list) =>
      list.map((s) =>
        s.id === summary.id ? { ...summary, updatedAt: new Date().toISOString() } : s,
      ),
    );
  }

  delete(id: string) {
    return this.store.update((list) => list.filter((s) => s.id !== id));
  }

  /** Remplace les résumés en mémoire, sans écrire (utilisé après une synchronisation entrante). */
  updateSummaries(content: Summary[]) {
    this.store.set(content);
  }

  load() {
    return this.store.load();
  }

  /**
   * Nouveau résumé non enregistré, sur l'étiquette donnée. Avec un instantané, tous les graphiques
   * du rapport sont inclus par défaut.
   */
  createEmpty(
    label: string,
    stats: SummaryStats,
    content = '',
    snapshot?: ReportSnapshot,
  ): Summary {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      title: label ? `Résumé ${label}` : 'Nouveau résumé',
      label,
      content,
      stats,
      ...(snapshot ? { snapshot, charts: [...CHART_KEYS] } : {}),
      createdAt: now,
      updatedAt: now,
    };
  }
}
