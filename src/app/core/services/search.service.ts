import { inject, Injectable } from '@angular/core';
import { SearchResult } from '../models/search-result.model';
import { DocumentService } from './document.service';
import { EventService } from './event.service';
import { TaskService } from './task.service';

const MAX_PER_TYPE = 20;

/** Minuscules et sans accents, pour que « evenement » trouve « Évènement ». */
const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Texte brut d'une page de document : les balises (et donc les dessins) sont ignorées. */
const htmlToText = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Extrait de `text` autour de la première occurrence de `needle` (déjà normalisé). */
const excerpt = (text: string, needle: string) => {
  const index = normalize(text).indexOf(needle);
  if (index < 0) {
    return text.slice(0, 90);
  }
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + needle.length + 60);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
};

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private readonly tasks = inject(TaskService);

  private readonly events = inject(EventService);

  private readonly documents = inject(DocumentService);

  /** Lit les signaux des services : appelée dans un `computed`, elle se met à jour toute seule. */
  search(query: string): SearchResult[] {
    const needle = normalize(query.trim());
    if (needle.length < 2) {
      return [];
    }
    const matches = (text: string | undefined) => !!text && normalize(text).includes(needle);

    const taskResults: SearchResult[] = [];
    for (const task of this.tasks.tasksSignal()) {
      const fields = [
        task.description,
        task.assignedTo,
        ...(task.tags ?? []),
        ...task.checklist.flatMap((item) => [item.label, item.description]),
        ...task.comments.map((comment) => comment.message),
      ];
      const hit = fields.find(matches);
      if (matches(task.title) || hit !== undefined) {
        taskResults.push({
          type: 'task',
          id: task.id,
          title: task.title,
          description: matches(task.title)
            ? (task.description ?? '').slice(0, 90)
            : excerpt(hit ?? '', needle),
        });
      }
    }

    const eventResults: SearchResult[] = [];
    for (const event of this.events.eventsSignal()) {
      if (matches(event.title) || matches(event.description) || matches(event.date)) {
        eventResults.push({
          type: 'event',
          id: event.id,
          title: event.title,
          description: `${event.date}${event.startTime ? ` · ${event.startTime}` : ''}${
            matches(event.description) ? ` — ${excerpt(event.description, needle)}` : ''
          }`,
        });
      }
    }

    const documentResults: SearchResult[] = [];
    for (const page of this.documents.allPages()) {
      const text = htmlToText(page.content);
      if (matches(this.documents.pageTitle(page)) || matches(text)) {
        documentResults.push({
          type: 'document',
          id: page.id,
          title: this.documents.pageTitle(page),
          description: matches(text) ? excerpt(text, needle) : '',
        });
      }
    }

    return [
      ...documentResults.slice(0, MAX_PER_TYPE),
      ...taskResults.slice(0, MAX_PER_TYPE),
      ...eventResults.slice(0, MAX_PER_TYPE),
    ];
  }

  /** Les pages de document ne sont chargées que quand on ouvre l'onglet Documents : on les charge au besoin. */
  async ensureDocumentsLoaded(): Promise<void> {
    if (this.documents.allPages().length === 0) {
      await this.documents.loadDocumentFromStorage();
    }
  }
}
