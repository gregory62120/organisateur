import { Component, computed, inject, input, signal } from '@angular/core';

import { Summary } from '../../../../core/models/summary.model';
import { formatShortDate } from '../../../../core/models/task-labels';
import { SummaryService } from '../../../../core/services/summary.service';
import { SummaryDialogService } from '../../services/summary-dialog.service';

const EXCERPT_LENGTH = 190;

/**
 * Texte brut d'un contenu HTML, sans balises ; l'HTML n'est jamais inséré dans la page.
 * Un espace est ajouté après chaque bloc pour que deux paragraphes ne se collent pas.
 */
export function plainText(html: string): string {
  const spaced = html.replace(/<\/(?:p|h[1-6]|li|ul|ol|div|blockquote)>|<br\s*\/?>/gi, '$& ');
  return (new DOMParser().parseFromString(spaced, 'text/html').body.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Les résumés enregistrés : recherche, consultation, modification et suppression. */
@Component({
  selector: 'app-report-summaries',
  standalone: true,
  templateUrl: './report-summaries.html',
  styleUrl: './report-summaries.scss',
})
export class ReportSummariesComponent {
  private service = inject(SummaryService);

  private dialogs = inject(SummaryDialogService);

  /** Étiquette choisie dans l'analyse : proposée par défaut pour un nouveau résumé. */
  readonly defaultLabel = input('');

  readonly formatDate = formatShortDate;

  readonly search = signal('');

  readonly labelFilter = signal('');

  readonly total = computed(() => this.service.summaries().length);

  readonly labels = computed(() =>
    [...new Set(this.service.summaries().map((s) => s.label))].sort((a, b) =>
      a.localeCompare(b, 'fr'),
    ),
  );

  /** Résumés correspondant à la recherche (titre, étiquette, texte) et à l'étiquette, du plus récent au plus ancien. */
  readonly items = computed(() => {
    const term = this.search().trim().toLowerCase();
    const label = this.labelFilter();

    return this.service
      .summaries()
      .filter(
        (s) =>
          (!label || s.label === label) &&
          (!term || `${s.title} ${s.label} ${plainText(s.content)}`.toLowerCase().includes(term)),
      )
      .map((summary) => ({ summary, excerpt: this.excerpt(summary) }))
      .sort((a, b) => b.summary.updatedAt.localeCompare(a.summary.updatedAt));
  });

  readonly hasFilter = computed(() => !!(this.search().trim() || this.labelFilter()));

  create() {
    this.dialogs.create(this.defaultLabel());
  }

  open(summary: Summary) {
    this.dialogs.show(summary);
  }

  edit(summary: Summary, event: Event) {
    event.stopPropagation();
    this.dialogs.show(summary, true);
  }

  remove(summary: Summary, event: Event) {
    event.stopPropagation();
    if (confirm(`Supprimer le résumé « ${summary.title} » ?`)) {
      void this.service.delete(summary.id);
    }
  }

  resetFilters() {
    this.search.set('');
    this.labelFilter.set('');
  }

  private excerpt(summary: Summary): string {
    const text = plainText(summary.content);
    return text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH).trimEnd()}…` : text;
  }
}
