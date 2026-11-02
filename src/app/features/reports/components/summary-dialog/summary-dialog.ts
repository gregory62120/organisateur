import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, inject, signal } from '@angular/core';

import {
  CHART_KEYS,
  CHART_LABELS,
  ChartKey,
  ReportSnapshot,
} from '../../../../core/models/report-snapshot.model';
import { Summary, SummaryStats } from '../../../../core/models/summary.model';
import { formatShortDate } from '../../../../core/models/task-labels';
import {
  buildSnapshot,
  draftHtml,
  labelsOf,
  reportStats,
  tasksWithLabel,
} from '../../../../core/services/report';
import { SummaryService } from '../../../../core/services/summary.service';
import { TaskService } from '../../../../core/services/task.service';
import { EditorComponent } from '../../../editor/editor';
import { ReportChartsComponent } from '../report-charts/report-charts';

export interface SummaryDialogData {
  summary: Summary;
  /** Un nouveau résumé n'est écrit dans summaries.json qu'à l'enregistrement. */
  isNew?: boolean;
  /** Ouvre un résumé existant directement en modification plutôt qu'en lecture. */
  editing?: boolean;
}

/** Lecture, rédaction et suppression d'un résumé. */
@Component({
  selector: 'app-summary-dialog',
  standalone: true,
  imports: [EditorComponent, ReportChartsComponent],
  templateUrl: './summary-dialog.html',
  // Même mise en page que le formulaire d'une tâche, complétée par les styles propres aux résumés.
  styleUrls: ['../../../kanban/components/task-dialog/task-dialog.scss', './summary-dialog.scss'],
})
export class SummaryDialogComponent {
  readonly dialogRef = inject(DialogRef);

  private summaries = inject(SummaryService);

  private tasks = inject(TaskService);

  private readonly data = inject(DIALOG_DATA) as SummaryDialogData;

  readonly isNew = !!this.data.isNew;

  /** Dernier état enregistré : sert à annuler une modification. */
  private readonly saved = signal(this.data.summary);

  readonly editing = signal(this.isNew || !!this.data.editing);

  readonly title = signal(this.data.summary.title);

  readonly label = signal(this.data.summary.label);

  readonly content = signal(this.data.summary.content);

  readonly stats = signal<SummaryStats>(this.data.summary.stats);

  /** Chiffres des graphiques ; absents des résumés écrits avant l'arrivée des graphiques. */
  readonly snapshot = signal<ReportSnapshot | undefined>(this.data.summary.snapshot);

  /** Graphiques inclus dans le résumé. */
  readonly charts = signal<ChartKey[]>(this.data.summary.charts ?? []);

  readonly chartOptions = CHART_KEYS.map((key) => ({ key, label: CHART_LABELS[key] }));

  /** Vrai quand le résumé contient au moins un graphique à afficher. */
  readonly hasCharts = computed(() => !!this.snapshot() && this.charts().length > 0);

  readonly snapshotDate = computed(() => {
    const at = this.snapshot()?.generatedAt;
    return at ? formatShortDate(at) : '';
  });

  /** Étiquettes proposées : celles des tâches, plus celle du résumé si plus aucune tâche ne la porte. */
  readonly labels = computed(() => {
    const labels = labelsOf(this.tasks.tasksSignal()).map((l) => l.label);
    const current = this.label();
    return current && !labels.some((l) => l.toLowerCase() === current.toLowerCase())
      ? [...labels, current]
      : labels;
  });

  readonly canSave = computed(() => !!this.title().trim() && !!this.label().trim());

  readonly createdOn = computed(() => formatShortDate(this.saved().createdAt));

  readonly updatedOn = computed(() => formatShortDate(this.saved().updatedAt));

  readonly modified = computed(() => this.saved().updatedAt !== this.saved().createdAt);

  /** Étiquette choisie : pour un nouveau résumé, les chiffres suivent ce choix. */
  setLabel(label: string) {
    this.label.set(label);
    if (this.isNew) {
      this.refreshStats();
    }
  }

  /**
   * Recalcule les chiffres et les graphiques du résumé avec les tâches actuelles de l'étiquette. Un résumé
   * qui n'avait pas encore de graphiques les reçoit tous ; sinon sa sélection est conservée.
   */
  refreshStats() {
    const labelTasks = tasksWithLabel(this.tasks.tasksSignal(), this.label());
    this.stats.set(reportStats(labelTasks));
    if (!this.snapshot()) {
      this.charts.set([...CHART_KEYS]);
    }
    this.snapshot.set(buildSnapshot(labelTasks));
  }

  /** Inclut ou retire un graphique du résumé. */
  toggleChart(key: ChartKey) {
    this.charts.update((keys) =>
      keys.includes(key)
        ? keys.filter((k) => k !== key)
        : CHART_KEYS.filter((k) => k === key || keys.includes(k)),
    );
  }

  setAllCharts(all: boolean) {
    this.charts.set(all ? [...CHART_KEYS] : []);
  }

  /** Ajoute en fin de texte un paragraphe construit à partir des chiffres actuels. */
  insertDraft() {
    this.refreshStats();
    this.content.update((c) => c + draftHtml(this.label(), this.stats()));
  }

  edit() {
    this.editing.set(true);
  }

  /** Abandonne la modification : ferme pour un nouveau résumé, sinon revient à la lecture. */
  cancel() {
    if (this.isNew) {
      this.close();
      return;
    }
    const saved = this.saved();
    this.title.set(saved.title);
    this.label.set(saved.label);
    this.content.set(saved.content);
    this.stats.set(saved.stats);
    this.snapshot.set(saved.snapshot);
    this.charts.set(saved.charts ?? []);
    this.editing.set(false);
  }

  async save() {
    if (!this.canSave()) {
      return;
    }
    const summary: Summary = {
      ...this.saved(),
      title: this.title().trim(),
      label: this.label().trim(),
      content: this.content(),
      stats: this.stats(),
      snapshot: this.snapshot(),
      charts: this.charts(),
    };

    if (this.isNew) {
      await this.summaries.add(summary);
      this.close();
      return;
    }
    await this.summaries.update(summary);
    this.saved.set({ ...summary, updatedAt: new Date().toISOString() });
    this.editing.set(false);
  }

  remove() {
    if (!confirm('Supprimer ce résumé ?')) {
      return;
    }
    void this.summaries.delete(this.saved().id);
    this.close();
  }

  close() {
    this.dialogRef.close();
  }
}
