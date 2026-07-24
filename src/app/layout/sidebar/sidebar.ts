import { Component } from '@angular/core';

import { RouterLink } from '@angular/router';

import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-sidebar',

  standalone: true,

  imports: [RouterLink, MatListModule],

  templateUrl: './sidebar.html',
})
export class Sidebar {
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
}
