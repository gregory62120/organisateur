import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Task } from '../../../core/models/task.model';
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
    for (const item of day.items) {
      this.taskService.update({
        ...item.task,
        workStart: day.date,
        workEnd: day.date,
        workStartTime: item.start,
        workEndTime: item.end,
      });
    }
  }

  /** Retire la prise en charge (dates et heures) d'une tâche. */
  unplan(task: Task) {
    this.taskService.update({
      ...task,
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
      .forEach((item) => this.unplan(item.task));
  }

  isItemCommitted(item: PlanItem, day: PlanDay): boolean {
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
    return (
      day.items.length > 0 &&
      day.items.every(
        (i) =>
          i.task.workStart === day.date &&
          i.task.workEnd === day.date &&
          i.task.workStartTime === i.start &&
          i.task.workEndTime === i.end,
      )
    );
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
