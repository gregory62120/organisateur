import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable } from '@angular/core';

import { ProjectEvent } from '../../../core/models/event.model';
import { EventService } from '../../../core/services/event.service';
import { EventDialogComponent, EventDialogData } from '../components/event-dialog/event-dialog';

/** Ouvre le formulaire d'un évènement du calendrier. */
@Injectable({
  providedIn: 'root',
})
export class EventDialogService {
  private dialog = inject(Dialog);

  private events = inject(EventService);

  /**
   * Nouvel évènement à la date donnée (YYYY-MM-DD). Il propose des heures, à partir de
   * `startTime` (HH:mm) si elle est fournie, sauf si `allDay` demande de le créer sans horaire.
   */
  create(date: string, startTime?: string, allDay = false) {
    return this.open(this.events.createEmpty(date, startTime), true, allDay);
  }

  edit(event: ProjectEvent) {
    return this.open(event, false);
  }

  private open(event: ProjectEvent, isNew: boolean, allDay = false) {
    return this.dialog.open<unknown, EventDialogData>(EventDialogComponent, {
      panelClass: 'tf-dialog-panel',
      maxWidth: '96vw',
      maxHeight: '94vh',
      data: { event, isNew, allDay },
    });
  }
}
