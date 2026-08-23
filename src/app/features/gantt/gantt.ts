import { Component } from '@angular/core';

@Component({
  selector: 'app-gantt',

  standalone: true,

  templateUrl: './gantt.html',
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
}
