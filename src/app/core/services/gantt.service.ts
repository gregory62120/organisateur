import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GanttService {
  dayWidth = 35;

  offset(date: Date, projectStart: Date) {
    const diff = date.getTime() - projectStart.getTime();

    return (diff / 86400000) * this.dayWidth;
  }

  duration(start: Date, end: Date) {
    return ((end.getTime() - start.getTime()) / 86400000) * this.dayWidth;
  }
}
