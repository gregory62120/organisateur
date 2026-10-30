import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EventService } from '../../core/services/event.service';
import { StorageService } from '../../core/services/storage.service';
import { TaskService } from '../../core/services/task.service';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Sidebar],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  readonly storage = inject(StorageService);

  private readonly taskService = inject(TaskService);

  private readonly eventService = inject(EventService);

  /** Première erreur de lecture / écriture, qu'elle vienne de tasks.json ou de events.json. */
  readonly error = computed(() => this.taskService.error() ?? this.eventService.error());

  readonly saving = computed(() => this.taskService.saving() || this.eventService.saving());

  async openProject(): Promise<void> {
    try {
      await this.storage.openProject();
    } catch {
      // Sélection de dossier annulée par l'utilisateur.
    }
  }
}
