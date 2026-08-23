import { Component, inject } from '@angular/core';

import { MatCalendar } from '@angular/material/datepicker';
import { Task } from '../../core/models/task.model';
import { CalendarService } from '../../core/services/calendar.service';

@Component({
  selector: 'app-calendar',

  standalone: true,

  imports: [MatCalendar],

  templateUrl: './calendar.html',
})
export class CalendarComponent {
  service = inject(CalendarService);

  selected = new Date();

  tasks: Task[] = [];

  change(date: Date) {
    this.selected = date;

    const iso = date.toISOString().substring(0, 10);

    this.tasks = this.service.getTasksForDate(iso);
  }
}
