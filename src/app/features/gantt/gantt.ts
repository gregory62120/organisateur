import { Component, signal } from '@angular/core';
import { FlowComponent } from './flow/flow';
import { FlowDestination, FlowSource } from './models/flow.models';

@Component({
  selector: 'app-gantt',

  standalone: true,

  templateUrl: './gantt.html',
  imports: [FlowComponent],
})
export class GanttComponent {
  tasks = [
    {
      id: '1',

      title: 'Analyse',

      start: new Date('2026-09-01'),

      end: new Date('2026-09-10'),

      progress: 100,

      dependencies: [],
    },

    {
      id: '2',

      title: 'Développement',

      start: new Date('2026-09-11'),

      end: new Date('2026-10-01'),

      progress: 60,

      dependencies: ['1'],
    },
  ];

  /**
   * Source du flux.
   */
  readonly source = signal<FlowSource>({
    id: 'source',
    label: 'Source',
    description: 'Envoi des données',
    icon: 'send',
  });

  /**
   * Destinations du flux.
   *
   * La première destination en erreur arrête le parcours.
   */
  readonly destinations = signal<FlowDestination[]>([
    {
      id: 'api',
      label: 'API REST',
      description: 'Service externe',
      icon: 'database',
      status: 'success',
    },
    {
      id: 'database',
      label: 'Base de données',
      description: 'Stockage des données',
      icon: 'cloud',
      status: 'success',
    },
    {
      id: 'notification',
      label: 'Notifications',
      description: "Envoi d'e-mails",
      icon: 'mail',
      status: 'error',
    },
  ]);
}
