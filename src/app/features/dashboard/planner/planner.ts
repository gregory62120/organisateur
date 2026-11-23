import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Task, WorkSlot } from '../../../core/models/task.model';
import { PRIORITY_LABELS } from '../../../core/models/task-labels';
import { buildPlan, PlanDay, PlanItem } from '../../../core/models/planner';
import { uniqueAssignees } from '../../../core/models/task-state';
import { EventService } from '../../../core/services/event.service';
import { ScheduleService } from '../../../core/services/schedule.service';
import { TaskService } from '../../../core/services/task.service';
import { TaskDialogService } from '../../kanban/services/task-dialog.service';

const ASSIGNEE_KEY = 'tf-planner-assignee';

@Component({
  selector: 'app-planner',
  imports: [NgTemplateOutlet],
  templateUrl: './planner.html',
  styleUrl: './planner.scss',
})
export class PlannerComponent {
  private readonly taskService = inject(TaskService);
  private readonly dialogs = inject(TaskDialogService);
  private readonly eventService = inject(EventService);
  readonly schedule = inject(ScheduleService);
  readonly scheduleOpen = signal(false);

  readonly priorityLabels = PRIORITY_LABELS;
  readonly horizon = signal(3);
  readonly assignee = signal(this.restoreAssignee());

  readonly assignees = computed(() => uniqueAssignees(this.taskService.tasksSignal()));

  /** Réunions du calendrier : le plan place les tâches autour d'elles. */
  private readonly busy = computed(() => {
    const result: Record<string, { start: number; end: number }[]> = {};
    for (const event of this.eventService.eventsSignal()) {
      if (!event.startTime) {
        continue;
      }
      const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
      const start = toMinutes(event.startTime);
      const end =
        event.endTime && event.endTime > event.startTime ? toMinutes(event.endTime) : start + 60;
      (result[event.date] ??= []).push({ start, end });
    }
    return result;
  });

  readonly plan = computed(() =>
    buildPlan(this.taskService.tasksSignal(), {
      today: new Date(),
      days: this.horizon(),
      assignee: this.assignee() || undefined,
      busy: this.busy(),
      schedule: this.schedule.forDay,
    }),
  );

  readonly sourceLabel = computed(() => {
    const plan = this.plan();
    return plan.capacitySource === 'history'
      ? `${plan.capacityHours} h/jour, d'après vos 28 derniers jours`
      : `${plan.capacityHours} h/jour (par défaut, l'historique est encore court)`;
  });

  setAssignee(name: string) {
    this.assignee.set(name);
    try {
      localStorage.setItem(ASSIGNEE_KEY, name);
    } catch {
      // Stockage indisponible : le choix ne sera pas conservé.
    }
  }

  label(date: string, index: number): string {
    const text = new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
    return index === 0 && date === this.todayKey() ? `Aujourd'hui · ${text}` : text;
  }

  open(task: Task) {
    this.dialogs.openTask(task);
  }

  /** Inscrit la journée dans les tâches (« prise en charge » du jour) pour la retrouver dans leur fiche. */
  commit(day: PlanDay) {
    // Une tâche peut avoir plusieurs éléments dans la journée (parties d'une tâche scindée) : on les
    // regroupe pour ne la mettre à jour qu'une fois.
    const byTask = new Map<string, PlanItem[]>();
    for (const item of day.items.filter((i) => !i.fixed)) {
      byTask.set(item.task.id, [...(byTask.get(item.task.id) ?? []), item]);
    }
    for (const items of byTask.values()) {
      const task = this.latest(items[0].task);
      const asSlots = items.some(
        (item) => item.part !== undefined || (item.segments?.length ?? 0) > 1,
      );
      if (!asSlots) {
        const item = items[0];
        this.taskService.update({
          ...task,
          workSlots: undefined,
          workStart: day.date,
          workEnd: day.date,
          workStartTime: item.start,
          workEndTime: item.end,
        });
        continue;
      }
      const replaced = new Set(items.map((item) => item.part ?? 0));
      const slots: WorkSlot[] = (task.workSlots ?? []).filter((slot) => !replaced.has(slot.part));
      for (const item of items) {
        for (const segment of item.segments ?? []) {
          slots.push({
            part: item.part ?? 0,
            date: day.date,
            start: segment.start,
            end: segment.end,
          });
        }
      }
      slots.sort(
        (a, b) => a.date.localeCompare(b.date) || (a.start ?? '').localeCompare(b.start ?? ''),
      );
      this.taskService.update({
        ...task,
        workSlots: slots,
        workStart: undefined,
        workEnd: undefined,
        workStartTime: undefined,
        workEndTime: undefined,
      });
    }
  }

  /** Plages du créneau, lisibles : « 11:00 – 11:45 · 14:00 – 15:15 ». */
  slotLabel(item: PlanItem): string {
    return (item.segments ?? [{ start: item.start ?? '', end: item.end ?? '' }])
      .map((segment) => `${segment.start} – ${segment.end}`)
      .join(' · ');
  }

  /** Tâche à jour (un `PlanItem` peut garder une version périmée après une première mise à jour). */
  private latest(task: Task): Task {
    return this.taskService.tasksSignal().find((t) => t.id === task.id) ?? task;
  }

  /** Scinde la tâche en deux parties égales (ou fusionne si elle l'est déjà). */
  toggleSplit(task: Task, hours: number) {
    const current = this.latest(task);
    if (current.split) {
      this.taskService.update({
        ...current,
        split: undefined,
        workSlots: undefined,
        estimateHours: current.split.reduce((sum, part) => sum + part, 0),
      });
      return;
    }
    const total = current.estimateHours ?? hours;
    const first = Math.max(0.5, Math.round(total / 2 / 0.5) * 0.5);
    const second = Math.max(0.5, total - first);
    this.taskService.update({
      ...current,
      split: [first, second],
      workStart: undefined,
      workEnd: undefined,
      workStartTime: undefined,
      workEndTime: undefined,
    });
  }

  /** Retire la prise en charge (dates et heures) d'une tâche. */
  unplan(task: Task, part?: number) {
    const current = this.latest(task);
    if (current.workSlots?.length && part !== undefined) {
      this.taskService.update({
        ...current,
        workSlots: (current.workSlots ?? []).filter((slot) => slot.part !== part),
      });
      return;
    }
    this.taskService.update({
      ...current,
      workSlots: undefined,
      workStart: undefined,
      workEnd: undefined,
      workStartTime: undefined,
      workEndTime: undefined,
    });
  }

  /** Déplanifie toutes les tâches de la journée. */
  uncommit(day: PlanDay) {
    day.items
      .filter((item) => this.isItemCommitted(item, day))
      .forEach((item) => this.unplan(item.task, item.part));
  }

  isItemCommitted(item: PlanItem, day: PlanDay): boolean {
    if (item.fixed) {
      return true;
    }
    if (item.part !== undefined || (item.segments?.length ?? 0) > 1) {
      const mine = (item.task.workSlots ?? []).filter(
        (slot) => slot.part === (item.part ?? 0) && slot.date === day.date,
      );
      const wanted = item.segments ?? [];
      return (
        mine.length === wanted.length &&
        wanted.every((segment, i) => mine[i].start === segment.start && mine[i].end === segment.end)
      );
    }
    return (
      item.task.workStart === day.date &&
      item.task.workEnd === day.date &&
      item.task.workStartTime === item.start &&
      item.task.workEndTime === item.end
    );
  }

  ignore(task: Task) {
    this.taskService.update({ ...task, planIgnored: true });
  }

  restore(task: Task) {
    this.taskService.update({ ...task, planIgnored: undefined });
  }

  isCommitted(day: PlanDay): boolean {
    return day.items.length > 0 && day.items.every((item) => this.isItemCommitted(item, day));
  }

  private todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private restoreAssignee(): string {
    try {
      return localStorage.getItem(ASSIGNEE_KEY) ?? '';
    } catch {
      return '';
    }
  }
}
