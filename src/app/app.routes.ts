import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: '',

    component: MainLayout,

    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((c) => c.DashboardComponent),
      },

      {
        path: 'kanban',
        loadComponent: () => import('./features/kanban/kanban').then((c) => c.KanbanComponent),
      },

      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/calendar/calendar').then((c) => c.CalendarComponent),
      },

      {
        path: 'gantt',
        loadComponent: () => import('./features/gantt/gantt').then((c) => c.GanttComponent),
      },
    ],
  },
];
