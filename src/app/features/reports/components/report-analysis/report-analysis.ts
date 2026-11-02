import { Component, computed, input } from '@angular/core';

import { Task } from '../../../../core/models/task.model';
import {
  formatShortDate,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '../../../../core/models/task-labels';
import { buildSnapshot, completionDate, reportStats } from '../../../../core/services/report';
import { ReportChartsComponent } from '../report-charts/report-charts';

/** Analyse de toutes les tâches portant une étiquette : chiffres clés, graphiques et liste des tâches. */
@Component({
  selector: 'app-report-analysis',
  standalone: true,
  imports: [ReportChartsComponent],
  templateUrl: './report-analysis.html',
  styleUrl: './report-analysis.scss',
})
export class ReportAnalysisComponent {
  /** Tâches portant l'étiquette (déjà filtrées par la page). */
  readonly tasks = input.required<Task[]>();

  readonly label = input.required<string>();

  readonly statusLabels = STATUS_LABELS;

  readonly priorityLabels = PRIORITY_LABELS;

  readonly formatDate = formatShortDate;

  readonly stats = computed(() => reportStats(this.tasks()));

  /** Les chiffres de tous les graphiques, calculés avec les tâches du moment. */
  readonly snapshot = computed(() => buildSnapshot(this.tasks()));

  readonly kpis = computed(() => {
    const s = this.stats();
    return [
      { label: 'Tâches', value: s.total, icon: 'assignment', tone: 'blue' },
      {
        label: 'Terminées',
        value: s.done,
        hint: `${s.completionRate} %`,
        icon: 'check_circle',
        tone: 'green',
      },
      { label: 'En cours', value: s.inProgress, icon: 'schedule', tone: 'violet' },
      { label: 'En revue', value: s.validation, icon: 'rate_review', tone: 'orange' },
      { label: 'À faire', value: s.todo, icon: 'radio_button_unchecked', tone: 'grey' },
      { label: 'En retard', value: s.overdue, icon: 'warning', tone: 'red' },
      {
        label: 'Durée moyenne',
        value: s.averageDays === null ? '—' : `${s.averageDays} j`,
        hint: 'création → fin',
        icon: 'timer',
        tone: 'blue',
      },
      {
        label: 'Sous-tâches',
        value: s.subtasksTotal ? `${s.subtasksDone}/${s.subtasksTotal}` : '—',
        icon: 'checklist',
        tone: 'violet',
      },
    ];
  });

  /** Tâches de l'étiquette : ouvertes d'abord (par échéance), puis terminées (la plus récente en tête). */
  readonly rows = computed(() =>
    [...this.tasks()]
      .map((task) => ({ task, doneAt: completionDate(task) }))
      .sort((a, b) => {
        const aDone = a.task.status === 'DONE';
        const bDone = b.task.status === 'DONE';
        if (aDone !== bDone) return Number(aDone) - Number(bDone);
        if (aDone) return (b.doneAt?.getTime() ?? 0) - (a.doneAt?.getTime() ?? 0);
        return (a.task.dueDate ?? '9999').localeCompare(b.task.dueDate ?? '9999');
      }),
  );

  doneLabel(date: Date | null): string {
    return date ? formatShortDate(date.toISOString()) : '';
  }
}
