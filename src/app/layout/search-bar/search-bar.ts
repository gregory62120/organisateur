import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { SearchResult, SearchResultType } from '../../core/models/search-result.model';
import { DocumentService } from '../../core/services/document.service';
import { EventService } from '../../core/services/event.service';
import { SearchService } from '../../core/services/search.service';
import { TaskService } from '../../core/services/task.service';

const TYPE_META: Record<SearchResultType, { label: string; icon: string }> = {
  document: { label: 'Documents', icon: 'description' },
  task: { label: 'Tâches', icon: 'task_alt' },
  event: { label: 'Évènements', icon: 'event' },
};

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss',
})
export class SearchBar {
  private readonly search = inject(SearchService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly tasks = inject(TaskService);
  private readonly events = inject(EventService);
  private readonly documents = inject(DocumentService);
  private readonly injector = inject(Injector);

  readonly query = signal('');
  readonly open = signal(false);
  readonly active = signal(0);
  /** Position du menu (fixe, pour ne pas être coupé par le défilement de la barre latérale). */
  readonly panelPos = signal({ top: 0, left: 0 });

  readonly results = computed(() => this.search.search(this.query()));

  /** Résultats regroupés par type, en conservant un index global pour la navigation au clavier. */
  readonly groups = computed(() => {
    const list = this.results();
    return (Object.keys(TYPE_META) as SearchResultType[])
      .map((type) => ({
        ...TYPE_META[type],
        items: list
          .map((result, index) => ({ result, index }))
          .filter((entry) => entry.result.type === type),
      }))
      .filter((group) => group.items.length > 0);
  });

  readonly icon = (type: SearchResultType) => TYPE_META[type].icon;

  async onFocus(): Promise<void> {
    const rect = this.host.nativeElement.getBoundingClientRect();
    this.panelPos.set({ top: rect.top, left: rect.right + 12 });
    this.open.set(true);
    await this.search.ensureDocumentsLoaded();
  }

  onInput(value: string): void {
    this.query.set(value);
    this.active.set(0);
    this.open.set(true);
  }

  onKeydown(event: KeyboardEvent): void {
    const count = this.results().length;
    if (event.key === 'ArrowDown' && count) {
      event.preventDefault();
      this.active.set((this.active() + 1) % count);
    } else if (event.key === 'ArrowUp' && count) {
      event.preventDefault();
      this.active.set((this.active() - 1 + count) % count);
    } else if (event.key === 'Enter' && count) {
      event.preventDefault();
      void this.select(this.results()[this.active()]);
    } else if (event.key === 'Escape') {
      this.open.set(false);
    }
  }

  @HostListener('document:pointerdown', ['$event'])
  onOutside(event: Event): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  async select(result: SearchResult): Promise<void> {
    this.open.set(false);
    this.query.set('');
    if (result.type === 'document') {
      await this.router.navigate(['/document', result.id]);
      // Si on était déjà sur un document, le composant n'est pas recréé : on change la page à la main.
      this.documents.setCurrentPageId(result.id);
    } else if (result.type === 'task') {
      const task = this.tasks.tasksSignal().find((item) => item.id === result.id);
      await this.router.navigate(['/kanban']);
      if (task) {
        // Chargé à la demande : ces fenêtres ne doivent pas alourdir le bundle initial.
        const { TaskDialogService } =
          await import('../../features/kanban/services/task-dialog.service');
        this.injector.get(TaskDialogService).openTask(task);
      }
    } else {
      const event = this.events.eventsSignal().find((item) => item.id === result.id);
      await this.router.navigate(['/calendar']);
      if (event) {
        const { EventDialogService } =
          await import('../../features/calendar/services/event-dialog.service');
        this.injector.get(EventDialogService).edit(event);
      }
    }
  }
}
