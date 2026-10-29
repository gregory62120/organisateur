import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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

  readonly taskService = inject(TaskService);

  async openProject(): Promise<void> {
    try {
      await this.storage.openProject();
    } catch {
      // Sélection de dossier annulée par l'utilisateur.
    }
  }
}
