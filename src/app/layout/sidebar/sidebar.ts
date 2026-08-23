import { Component, inject } from '@angular/core';

import { RouterLink } from '@angular/router';

import { MatListModule } from '@angular/material/list';
import { GithubSyncService } from '../../core/services/github-sync.service';

@Component({
  selector: 'app-sidebar',

  standalone: true,

  imports: [RouterLink, MatListModule],

  templateUrl: './sidebar.html',
})
export class Sidebar {
  private readonly githubSync = inject(GithubSyncService);

  readonly syncing = this.githubSync.syncing;

  readonly pulling = this.githubSync.pulling;

  menu = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      url: '/dashboard',
    },

    {
      label: 'Kanban',
      icon: 'view_kanban',
      url: '/kanban',
    },

    {
      label: 'Calendrier',
      icon: 'calendar_month',
      url: '/calendar',
    },

    {
      label: 'Gantt',
      icon: 'timeline',
      url: '/gantt',
    },

    {
      label: 'Documents',
      icon: 'folder',
      url: '/documents',
    },

    {
      label: 'Recherche',
      icon: 'search',
      url: '/search',
    },

    {
      label: 'Equipe',
      icon: 'group',
      url: '/users',
    },
  ];

  constructor() {
    this.githubSync.setConfig({
      owner: 'gregory62120',
      repo: 'sauvegarde-organisateur',
      branch: 'main',
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

      console.log('Projet récupéré depuis GitHub');
    } catch (error) {
      console.error('Erreur lors de la récupération GitHub', error);
    }
  }
}
