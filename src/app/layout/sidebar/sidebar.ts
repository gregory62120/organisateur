import { Component, computed, effect, inject, OnInit } from '@angular/core';

import { RouterLink, RouterLinkActive } from '@angular/router';
import { GithubSyncService } from '../../core/services/github-sync.service';
import { SettingsService } from '../../core/services/settings.service';
import { StorageService } from '../../core/services/storage.service';

@Component({
  selector: 'app-sidebar',

  standalone: true,

  imports: [RouterLink, RouterLinkActive],

  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly DEFAULT_CONFIG: string = `
  {
  "github": {
    "owner": "gregory62120",
    "repo": "sauvegarde-organisateur",
    "branch": "main"
  }
}
  `;
  private readonly githubSync = inject(GithubSyncService);
  private readonly storageService = inject(StorageService);

  readonly syncing = this.githubSync.syncing;

  readonly pulling = this.githubSync.pulling;

  private readonly settings = inject(SettingsService);

  /** Entrées du menu ; « Rapports » n'apparaît que si l'option est activée dans les paramètres. */
  readonly menu = computed(() => {
    const reports = this.settings.reportsEnabled()
      ? [{ label: 'Rapports', icon: 'monitoring', url: '/reports' }]
      : [];
    return [
      { label: 'Dashboard', icon: 'dashboard', url: '/dashboard' },
      { label: 'Kanban', icon: 'view_kanban', url: '/kanban' },
      { label: 'Calendrier', icon: 'calendar_month', url: '/calendar' },
      { label: 'Gantt', icon: 'timeline', url: '/gantt' },
      ...reports,
      { label: 'Documents', icon: 'folder', url: '/documents' },
      { label: 'Recherche', icon: 'search', url: '/search' },
      { label: 'Equipe', icon: 'group', url: '/users' },
      { label: 'Paramètres', icon: 'settings', url: '/settings' },
    ];
  });

  constructor() {
    this.loadConfig();
  }

  async loadConfig() {
    effect(async () => {
      const count = this.storageService.projectOpened();
      if (count > 0) {
        let configContent;

        try {
          configContent = await this.storageService.read('config.json');
        } catch (error) {
          configContent = this.DEFAULT_CONFIG;
        }

        if (configContent) {
          try {
            const config = JSON.parse(configContent);
            this.githubSync.setConfig({
              owner: config.github.owner,
              repo: config.github.repo,
              branch: config.github.branch,
            });
          } catch (error) {
            console.error('Error parsing config.json', error);
          }
        }
      }
    });
  }

  async synchronize(): Promise<void> {
    const token = prompt('Token GitHub');

    if (!token) {
      return;
    }

    try {
      await this.githubSync.sync(token);

      alert('Synchronisation terminée.');
    } catch (error) {
      console.error(error);

      alert(error instanceof Error ? error.message : 'Erreur lors de la synchronisation.');
    }
  }

  async pullFromGithub() {
    try {
      const token = prompt('Token GitHub');

      if (!token) {
        return;
      }

      await this.githubSync.pull(token);
    } catch (error) {
      console.error('Erreur lors de la récupération GitHub', error);
    }
  }
}
