import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MusicPlanService } from '../../core/services/music-plan.service';
import { MusicService } from '../../core/services/music.service';
import { EventService } from '../../core/services/event.service';
import { StorageService } from '../../core/services/storage.service';
import { TaskService } from '../../core/services/task.service';
import { MusicMiniPlayerComponent } from '../../shared/music/music-mini-player/music-mini-player';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Sidebar, MusicMiniPlayerComponent],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  readonly storage = inject(StorageService);

  private readonly taskService = inject(TaskService);

  private readonly eventService = inject(EventService);

  private readonly musicService = inject(MusicService);

  private readonly musicPlanService = inject(MusicPlanService);

  /** Première erreur de lecture / écriture, qu'elle vienne de tasks.json, events.json, music.json ou music-plan.json. */
  readonly error = computed(
    () =>
      this.taskService.error() ??
      this.eventService.error() ??
      this.musicService.error() ??
      this.musicPlanService.error(),
  );

  readonly saving = computed(
    () =>
      this.taskService.saving() ||
      this.eventService.saving() ||
      this.musicService.saving() ||
      this.musicPlanService.saving(),
  );

  async openProject(): Promise<void> {
    try {
      await this.storage.openProject();
    } catch {
      // Sélection de dossier annulée par l'utilisateur.
    }
  }
}
