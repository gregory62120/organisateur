import { Component, computed, inject, signal } from '@angular/core';

import {
  ABSENCE_LABELS,
  Absence,
  addDaysToKey,
  cumulativeBalance,
  formatDuration,
  mondayOf,
  toKey,
  weekResult,
} from '../../core/models/timesheet';
import { ScheduleService } from '../../core/services/schedule.service';
import { StorageService } from '../../core/services/storage.service';
import { TimesheetService } from '../../core/services/timesheet.service';
import { toMinutes } from '../../core/models/schedule';

const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

@Component({
  selector: 'app-hours',
  templateUrl: './hours.html',
  styleUrl: './hours.scss',
})
export class HoursComponent {
  readonly storage = inject(StorageService);
  readonly timesheet = inject(TimesheetService);
  private readonly schedule = inject(ScheduleService);

  readonly weekdays = WEEKDAYS;
  readonly absences = Object.keys(ABSENCE_LABELS) as Absence[];
  readonly absenceLabels = ABSENCE_LABELS;
  readonly format = formatDuration;

  readonly monday = signal(toKey(mondayOf(new Date())));
  readonly contractOpen = signal(true);

  private readonly today = () => toKey(new Date());

  readonly week = computed(() =>
    weekResult(this.monday(), this.timesheet.byDate(), this.timesheet.contract(), this.today()),
  );

  readonly rows = computed(() =>
    this.week().days.map((result, index) => ({
      result,
      label: WEEKDAYS[index],
      entry: this.timesheet.byDate().get(result.date),
      dayNumber: new Date(`${result.date}T00:00:00`).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
      }),
      isToday: result.date === this.today(),
    })),
  );

  readonly cumulative = computed(() =>
    cumulativeBalance(this.timesheet.entries(), this.timesheet.contract(), this.today()),
  );

  readonly weekTitle = computed(() => {
    const format = (date: string) =>
      new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    return `${format(this.monday())} – ${format(addDaysToKey(this.monday(), 6))}`;
  });

  readonly isCurrentWeek = computed(() => this.monday() === toKey(mondayOf(new Date())));

  shift(weeks: number) {
    this.monday.set(addDaysToKey(this.monday(), weeks * 7));
  }

  goToday() {
    this.monday.set(toKey(mondayOf(new Date())));
  }

  setTime(date: string, field: 'amStart' | 'amEnd' | 'pmStart' | 'pmEnd', value: string) {
    this.timesheet.save(date, { [field]: value || undefined });
  }

  setBreak(date: string, value: string) {
    const minutes = Number(value);
    this.timesheet.save(date, { breakMinutes: minutes > 0 ? minutes : undefined });
  }

  setAbsence(date: string, value: string) {
    this.timesheet.save(date, value ? { absence: value as Absence } : { absence: undefined });
  }

  setNote(date: string, value: string) {
    this.timesheet.save(date, { note: value.trim() || undefined });
  }

  /** Remplit les jours ouvrés vides avec les horaires par défaut du plan (pause du midi = la plus longue pause). */
  prefill() {
    const defaults = this.schedule.defaults();
    const lengthOf = (b: { start: string; end: string }) =>
      Math.max(0, toMinutes(b.end) - toMinutes(b.start));
    const lunch = [...defaults.breaks].sort((a, b) => lengthOf(b) - lengthOf(a))[0] ?? {
      start: '12:00',
      end: '13:00',
    };
    const others = defaults.breaks
      .filter((b) => b !== lunch)
      .reduce((sum, b) => sum + lengthOf(b), 0);
    for (const { result, entry } of this.rows()) {
      if (result.contract > 0 && !entry) {
        this.timesheet.save(result.date, {
          amStart: defaults.start,
          amEnd: lunch.start,
          pmStart: lunch.end,
          pmEnd: defaults.end,
          breakMinutes: others || undefined,
        });
      }
    }
  }

  contractHours(index: number): string {
    return String((this.timesheet.contract().minutes[index] ?? 0) / 60);
  }

  setContract(index: number, value: string) {
    const hours = Number(value.replace(',', '.'));
    if (Number.isFinite(hours)) {
      this.timesheet.setContractDay(index, Math.round(hours * 60));
    }
  }

  /** Total hebdomadaire saisi : réparti à parts égales du lundi au vendredi. */
  setWeekly(value: string) {
    const hours = Number(value.replace(',', '.'));
    if (Number.isFinite(hours) && hours >= 0) {
      this.timesheet.setContractWeekly(hours);
    }
  }

  weeklyHours(): string {
    return String(Math.round((this.contractTotal() / 60) * 100) / 100);
  }

  /** Coche ou décoche un jour travaillé ; le total est redistribué entre les jours choisis. */
  toggleDay(index: number) {
    const days = this.timesheet
      .contract()
      .days.map((worked, i) => (i === index ? !worked : worked));
    this.timesheet.setContractDays(days);
  }

  dayCount(): number {
    return this.timesheet.contract().days.filter(Boolean).length;
  }

  /** Durée par jour travaillé si la semaine est répartie à parts égales (ex. « 7h48 »), sinon rien. */
  evenPerDay(): string | null {
    const { minutes, days } = this.timesheet.contract();
    const worked = minutes.filter((_, i) => days[i]);
    if (!worked.length) {
      return null;
    }
    const even = worked.every((m) => Math.abs(m - worked[0]) <= 1);
    return even ? formatDuration(Math.max(...worked)) : null;
  }

  contractTotal(): number {
    return this.timesheet.contract().minutes.reduce((sum, m) => sum + m, 0);
  }

  tone(minutes: number): string {
    return minutes > 0 ? 'plus' : minutes < 0 ? 'minus' : '';
  }

  async openProject() {
    try {
      await this.storage.openProject();
    } catch {
      // Sélection de dossier annulée par l'utilisateur.
    }
  }
}
