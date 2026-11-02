import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable } from '@angular/core';

import { Summary } from '../../../core/models/summary.model';
import { TaskService } from '../../../core/services/task.service';
import {
  buildSnapshot,
  draftHtml,
  reportStats,
  tasksWithLabel,
} from '../../../core/services/report';
import { SummaryService } from '../../../core/services/summary.service';
import {
  SummaryDialogComponent,
  SummaryDialogData,
} from '../components/summary-dialog/summary-dialog';

/** Ouvre le formulaire d'un résumé, depuis l'analyse comme depuis la liste des résumés. */
@Injectable({
  providedIn: 'root',
})
export class SummaryDialogService {
  private dialog = inject(Dialog);

  private summaries = inject(SummaryService);

  private tasks = inject(TaskService);

  /**
   * Nouveau résumé sur une étiquette. Avec une étiquette, le texte démarre par un brouillon construit
   * à partir des chiffres ; sans, il est vide et l'étiquette se choisit dans le formulaire.
   */
  create(label = '') {
    const labelTasks = tasksWithLabel(this.tasks.tasksSignal(), label);
    const stats = reportStats(labelTasks);
    const content = label ? draftHtml(label, stats) : '';
    const snapshot = buildSnapshot(labelTasks);
    return this.open({
      summary: this.summaries.createEmpty(label, stats, content, snapshot),
      isNew: true,
    });
  }

  /** Ouvre un résumé enregistré, en lecture ou directement en modification. */
  show(summary: Summary, editing = false) {
    return this.open({ summary, isNew: false, editing });
  }

  private open(data: SummaryDialogData) {
    return this.dialog.open<unknown, SummaryDialogData>(SummaryDialogComponent, {
      panelClass: 'tf-dialog-panel',
      maxWidth: '96vw',
      maxHeight: '94vh',
      data,
    });
  }
}
