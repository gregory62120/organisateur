import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, inject, signal } from '@angular/core';

import {
  EVENT_COLOR_LABELS,
  EVENT_COLORS,
  EventColor,
  ProjectEvent,
} from '../../../../core/models/event.model';
import { EventService } from '../../../../core/services/event.service';

export interface EventDialogData {
  event: ProjectEvent;
  /** Un nouvel évènement n'est écrit dans events.json qu'à l'enregistrement. */
  isNew?: boolean;
  /** Pour un nouvel évènement : le créer sans horaire plutôt qu'avec des heures proposées. */
  allDay?: boolean;
}

const DEFAULT_START = '09:00';
const DEFAULT_END = '10:00';

@Component({
  selector: 'app-event-dialog',
  standalone: true,
  templateUrl: './event-dialog.html',
  // Même mise en page que le formulaire d'une tâche, complétée par les styles propres aux évènements.
  styleUrls: ['../../../kanban/components/task-dialog/task-dialog.scss', './event-dialog.scss'],
})
export class EventDialogComponent {
  readonly dialogRef = inject(DialogRef);

  private eventService = inject(EventService);

  private readonly data = inject(DIALOG_DATA) as EventDialogData;

  private readonly initial = this.data.event;

  readonly isNew = !!this.data.isNew;

  readonly colors = EVENT_COLORS;

  readonly colorLabels = EVENT_COLOR_LABELS;

  readonly title = signal(this.initial.title);

  readonly date = signal(this.initial.date);

  /** Un nouvel évènement propose des heures, sauf demande contraire ; un existant reflète ses données. */
  readonly allDay = signal(this.isNew ? !!this.data.allDay : !this.initial.startTime);

  readonly startTime = signal(this.initial.startTime ?? DEFAULT_START);

  readonly endTime = signal(this.initial.endTime ?? DEFAULT_END);

  readonly color = signal<EventColor>(this.initial.color);

  readonly description = signal(this.initial.description);

  readonly endBeforeStart = computed(
    () => !this.allDay() && !!this.endTime() && this.endTime() < this.startTime(),
  );

  readonly canSave = computed(() => !!this.title().trim() && !!this.date());

  setAllDay(allDay: boolean) {
    this.allDay.set(allDay);
  }

  save() {
    if (!this.canSave()) {
      return;
    }

    const allDay = this.allDay();
    // Une fin avant le début n'a pas de sens : elle est ramenée au début.
    const end = this.endBeforeStart() ? this.startTime() : this.endTime();

    const event: ProjectEvent = {
      ...this.initial,
      title: this.title().trim(),
      date: this.date(),
      startTime: allDay ? undefined : this.startTime(),
      endTime: allDay ? undefined : end,
      description: this.description().trim(),
      color: this.color(),
    };

    if (this.isNew) {
      this.eventService.add(event);
    } else {
      this.eventService.update(event);
    }
    this.close();
  }

  remove() {
    if (!confirm('Supprimer cet évènement ?')) {
      return;
    }
    this.eventService.delete(this.initial.id);
    this.close();
  }

  close() {
    this.dialogRef.close();
  }
}
