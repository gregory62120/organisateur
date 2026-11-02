import { Routes } from '@angular/router';
import { reportsGuard } from './core/guards/reports.guard';
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
      {
        path: 'reports',
        canActivate: [reportsGuard],
        loadComponent: () => import('./features/reports/reports').then((c) => c.ReportsComponent),
      },

      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings').then((c) => c.SettingsComponent),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./features/documents/document-manager/document-manager').then(
            (c) => c.DocumentManagerComponent,
          ),
      },
      {
        path: 'document/:id',
        loadComponent: () =>
          import('./features/documents/document-manager/document-manager').then(
            (c) => c.DocumentManagerComponent,
          ),
      },
    ],
  },
];
