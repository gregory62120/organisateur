import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { Task, TaskStatus } from '../../core/models/task.model';
import {
  formatDueDate,
  initials,
  isOverdue,
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUSES,
} from '../../core/models/task-labels';
import { StorageService } from '../../core/services/storage.service';
import { TaskService } from '../../core/services/task.service';

const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: '#9aa8c7',
  IN_PROGRESS: '#2f6bff',
  VALIDATION: '#ff9f1a',
  DONE: '#19b36b',
};

const DAY_MS = 24 * 60 * 60 * 1000;

@Component({
  selector: 'app-dashboard',

  standalone: true,

  imports: [BaseChartDirective, RouterLink],

  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  private taskService = inject(TaskService);

  readonly storage = inject(StorageService);

  readonly priorityLabels = PRIORITY_LABELS;

  readonly formatDueDate = formatDueDate;

  readonly initials = initials;

  private readonly tasks = this.taskService.tasksSignal;

  readonly total = computed(() => this.tasks().length);

  readonly done = computed(() => this.count('DONE'));

  readonly inProgress = computed(() => this.count('IN_PROGRESS'));

  readonly overdue = computed(() => this.tasks().filter((t) => isOverdue(t)).length);

  readonly progress = computed(() =>
    this.total() ? Math.round((this.done() / this.total()) * 100) : 0,
  );

  readonly stats = computed(() => [
    { label: 'Tâches totales', value: this.total(), icon: 'assignment', tone: 'blue' },
    { label: 'En cours', value: this.inProgress(), icon: 'schedule', tone: 'violet' },
    { label: 'En retard', value: this.overdue(), icon: 'warning', tone: 'orange' },
    { label: 'Terminées', value: this.done(), icon: 'check_circle', tone: 'green' },
  ]);

  readonly statusBreakdown = computed(() =>
    STATUSES.map((status) => {
      const value = this.count(status);
      return {
        status,
        label: STATUS_LABELS[status],
        color: STATUS_COLORS[status],
        value,
        percent: this.total() ? Math.round((value / this.total()) * 100) : 0,
      };
    }),
  );

  readonly upcoming = computed(() =>
    this.tasks()
      .filter((t) => t.status !== 'DONE' && t.dueDate)
      .sort((a, b) => (a.dueDate as string).localeCompare(b.dueDate as string))
      .slice(0, 5),
  );

  readonly recent = computed(() =>
    [...this.tasks()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
  );

  readonly doughnutData = computed<ChartConfiguration<'doughnut'>['data']>(() => ({
    labels: this.statusBreakdown().map((s) => s.label),
    datasets: [
      {
        data: this.statusBreakdown().map((s) => s.value),
        backgroundColor: this.statusBreakdown().map((s) => s.color),
        borderWidth: 4,
        borderColor: '#ffffff',
      },
    ],
  }));

  readonly doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '70%',
    plugins: { legend: { display: false } },
  };

  /** Créées / terminées sur les 7 derniers jours. */
  readonly lineData = computed<ChartConfiguration<'line'>['data']>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 7 }, (_, i) => new Date(today.getTime() - (6 - i) * DAY_MS));
    const sameDay = (iso: string, day: Date) => {
      const date = new Date(iso);
      return date >= day && date.getTime() < day.getTime() + DAY_MS;
    };

    return {
      labels: days.map((d) => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Créées',
          data: days.map((d) => this.tasks().filter((t) => sameDay(t.createdAt, d)).length),
          borderColor: '#2f6bff',
          backgroundColor: 'rgba(47, 107, 255, 0.1)',
          tension: 0.35,
          fill: true,
          pointRadius: 3,
        },
        {
          label: 'Terminées',
          data: days.map(
            (d) =>
              this.tasks().filter((t) => t.status === 'DONE' && sameDay(t.updatedAt, d)).length,
          ),
          borderColor: '#19b36b',
          backgroundColor: 'rgba(25, 179, 107, 0.1)',
          tension: 0.35,
          fill: true,
          pointRadius: 3,
        },
      ],
    };
  });

  readonly lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#eef2fa' } },
    },
  };

  isOverdue(task: Task): boolean {
    return isOverdue(task);
  }

  relativeTime(iso: string): string {
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `Il y a ${hours} h`;
    const days = Math.round(hours / 24);
    return days === 1 ? 'Hier' : `Il y a ${days} jours`;
  }

  statusLabel(status: TaskStatus): string {
    return STATUS_LABELS[status];
  }

  private count(status: TaskStatus): number {
    return this.tasks().filter((t) => t.status === status).length;
  }
}
