import { Component, computed, inject, signal } from '@angular/core';

import { labelsOf, tasksWithLabel } from '../../core/services/report';
import { StorageService } from '../../core/services/storage.service';
import { TaskService } from '../../core/services/task.service';
import { ReportAnalysisComponent } from './components/report-analysis/report-analysis';
import { ReportSummariesComponent } from './components/report-summaries/report-summaries';
import { SummaryDialogService } from './services/summary-dialog.service';

export type ReportTab = 'analysis' | 'summaries';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [ReportAnalysisComponent, ReportSummariesComponent],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class ReportsComponent {
  private taskService = inject(TaskService);

  private dialogs = inject(SummaryDialogService);

  readonly storage = inject(StorageService);

  readonly tab = signal<ReportTab>('analysis');

  /** Étiquette analysée. */
  readonly label = signal('');

  readonly labels = computed(() => labelsOf(this.taskService.tasksSignal()));

  /** Toutes les tâches portant l'étiquette choisie, archivées comprises. */
  readonly labelTasks = computed(() =>
    tasksWithLabel(this.taskService.tasksSignal(), this.label()),
  );

  setTab(tab: ReportTab) {
    this.tab.set(tab);
  }

  /** Rédige un résumé de l'étiquette analysée, démarré par un brouillon construit à partir des chiffres. */
  writeSummary() {
    if (this.label()) {
      this.dialogs.create(this.label());
    }
  }

  async openProject() {
    try {
      await this.storage.openProject();
    } catch {
      // Sélection de dossier annulée par l'utilisateur.
    }
  }
}
