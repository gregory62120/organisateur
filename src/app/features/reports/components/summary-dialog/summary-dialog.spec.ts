import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ChartKey, ReportSnapshot } from '../../../../core/models/report-snapshot.model';
import { Summary } from '../../../../core/models/summary.model';
import { buildSnapshot } from '../../../../core/services/report';
import { Task } from '../../../../core/models/task.model';
import { SummaryService } from '../../../../core/services/summary.service';
import { TaskService } from '../../../../core/services/task.service';
import { EditorComponent } from '../../../editor/editor';
import { ReportChartsComponent } from '../report-charts/report-charts';
import { SummaryDialogComponent, SummaryDialogData } from './summary-dialog';

const task = (id: string, overrides: Partial<Task> = {}): Task => ({
  id,
  title: id,
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  tags: ['Backend'],
  checklist: [],
  comments: [],
  attachments: [],
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
  ...overrides,
});

const stats = {
  total: 2,
  todo: 1,
  inProgress: 0,
  validation: 0,
  done: 1,
  overdue: 0,
  archived: 0,
  completionRate: 50,
  subtasksDone: 0,
  subtasksTotal: 0,
  averageDays: null,
};

const summary: Summary = {
  id: 's1',
  title: 'Point Backend',
  label: 'Backend',
  content: '<p>Tout va bien</p>',
  stats,
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
};

describe('SummaryDialogComponent', () => {
  const tasks = signal<Task[]>([]);
  const service = {
    add: vi.fn(async (_summary: Summary) => undefined),
    update: vi.fn(async (_summary: Summary) => undefined),
    delete: vi.fn(),
  };
  const dialogRef = { close: vi.fn() };

  function create(data: SummaryDialogData) {
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: data },
        { provide: DialogRef, useValue: dialogRef },
        { provide: SummaryService, useValue: service },
        { provide: TaskService, useValue: { tasksSignal: tasks.asReadonly() } },
      ],
    });
    return TestBed.runInInjectionContext(() => new SummaryDialogComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    tasks.set([
      task('a', { status: 'DONE' }),
      task('b'),
      task('c', { tags: ['Frontend'] }),
      task('d', { tags: ['Frontend'], status: 'DONE' }),
    ]);
  });

  afterEach(() => vi.unstubAllGlobals());

  describe('consultation', () => {
    it('s’ouvre en lecture pour un résumé enregistré', () => {
      const dialog = create({ summary });

      expect(dialog.editing()).toBe(false);
      expect(dialog.title()).toBe('Point Backend');
      expect(dialog.modified()).toBe(false);
    });

    it('s’ouvre directement en modification sur demande', () => {
      expect(create({ summary, editing: true }).editing()).toBe(true);
    });

    it('indique qu’un résumé a été modifié après sa rédaction', () => {
      const dialog = create({ summary: { ...summary, updatedAt: '2026-10-05T09:00:00.000Z' } });

      expect(dialog.modified()).toBe(true);
    });

    it('passe en modification', () => {
      const dialog = create({ summary });

      dialog.edit();

      expect(dialog.editing()).toBe(true);
    });
  });

  describe('modification', () => {
    it('enregistre les changements sans créer de doublon, puis revient à la lecture', async () => {
      const dialog = create({ summary, editing: true });
      dialog.title.set('  Nouveau titre ');
      dialog.content.set('<p>Mis à jour</p>');

      await dialog.save();

      expect(service.add).not.toHaveBeenCalled();
      expect(service.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 's1',
          title: 'Nouveau titre',
          content: '<p>Mis à jour</p>',
          label: 'Backend',
        }),
      );
      expect(dialog.editing()).toBe(false);
      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(dialog.modified()).toBe(true);
    });

    it('garde les chiffres d’origine tant qu’on ne les actualise pas', async () => {
      const dialog = create({ summary, editing: true });

      await dialog.save();

      expect(service.update.mock.calls[0][0]).toMatchObject({ stats });
    });

    it('actualise les chiffres avec les tâches actuelles de l’étiquette', () => {
      const dialog = create({ summary, editing: true });
      tasks.update((list) => [...list, task('e', { status: 'DONE' })]);

      dialog.refreshStats();

      expect(dialog.stats()).toMatchObject({ total: 3, done: 2, completionRate: 67 });
    });

    it('ajoute un paragraphe construit sur les chiffres actuels à la fin du texte', () => {
      const dialog = create({ summary, editing: true });

      dialog.insertDraft();

      expect(dialog.content().startsWith('<p>Tout va bien</p>')).toBe(true);
      expect(dialog.content()).toContain('Résumé « Backend »');
      expect(dialog.stats().total).toBe(2);
    });

    it('annuler restaure le dernier état enregistré sans écrire', () => {
      const dialog = create({ summary, editing: true });
      dialog.title.set('Brouillon');
      dialog.content.set('<p>Brouillon</p>');
      dialog.label.set('Frontend');

      dialog.cancel();

      expect(dialog.editing()).toBe(false);
      expect(dialog.title()).toBe('Point Backend');
      expect(dialog.content()).toBe('<p>Tout va bien</p>');
      expect(dialog.label()).toBe('Backend');
      expect(service.update).not.toHaveBeenCalled();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('refuse d’enregistrer sans titre ou sans étiquette', async () => {
      const dialog = create({ summary, editing: true });

      dialog.title.set('  ');
      expect(dialog.canSave()).toBe(false);
      await dialog.save();

      dialog.title.set('Titre');
      dialog.label.set('');
      expect(dialog.canSave()).toBe(false);
      await dialog.save();

      expect(service.update).not.toHaveBeenCalled();
    });
  });

  describe('nouveau résumé', () => {
    const fresh = { ...summary, id: 'new', content: '', label: '', stats: { ...stats, total: 0 } };

    it('s’ouvre en modification et n’écrit rien avant l’enregistrement', () => {
      const dialog = create({ summary: fresh, isNew: true });

      expect(dialog.editing()).toBe(true);
      expect(service.add).not.toHaveBeenCalled();
    });

    it('suit le choix de l’étiquette pour ses chiffres', () => {
      const dialog = create({ summary: fresh, isNew: true });

      dialog.setLabel('Frontend');

      expect(dialog.stats()).toMatchObject({ total: 2, done: 1 });
    });

    it('l’enregistrement crée le résumé puis ferme', async () => {
      const dialog = create({ summary: { ...fresh, title: 'Bilan' }, isNew: true });
      dialog.setLabel('Backend');

      await dialog.save();

      expect(service.add).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'new', title: 'Bilan', label: 'Backend' }),
      );
      expect(service.update).not.toHaveBeenCalled();
      expect(dialogRef.close).toHaveBeenCalled();
    });

    it('annuler ferme sans rien écrire', () => {
      const dialog = create({ summary: fresh, isNew: true });

      dialog.cancel();

      expect(service.add).not.toHaveBeenCalled();
      expect(dialogRef.close).toHaveBeenCalled();
    });
  });

  describe('étiquettes proposées', () => {
    it('liste celles des tâches, et garde celle du résumé si plus aucune tâche ne la porte', () => {
      const dialog = create({ summary: { ...summary, label: 'Archivée' }, editing: true });

      expect(dialog.labels()).toEqual(['Backend', 'Frontend', 'Archivée']);
    });

    it('ne duplique pas l’étiquette du résumé, quelle que soit la casse', () => {
      const dialog = create({ summary: { ...summary, label: 'backend' }, editing: true });

      expect(dialog.labels()).toEqual(['Backend', 'Frontend']);
    });
  });

  describe('suppression', () => {
    it('supprime après confirmation puis ferme', () => {
      const dialog = create({ summary });

      dialog.remove();

      expect(service.delete).toHaveBeenCalledWith('s1');
      expect(dialogRef.close).toHaveBeenCalled();
    });

    it('ne supprime pas si la confirmation est refusée', () => {
      vi.stubGlobal(
        'confirm',
        vi.fn(() => false),
      );
      const dialog = create({ summary });

      dialog.remove();

      expect(service.delete).not.toHaveBeenCalled();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  describe('SummaryDialogComponent - graphiques', () => {
    const tasks = signal<Task[]>([]);
    const service = {
      add: vi.fn(async (_summary: Summary) => undefined),
      update: vi.fn(async (_summary: Summary) => undefined),
      delete: vi.fn(),
    };
    const dialogRef = { close: vi.fn() };
    const snapshot = buildSnapshot([], new Date(2026, 9, 1));

    function create(data: SummaryDialogData) {
      TestBed.configureTestingModule({
        providers: [
          { provide: DIALOG_DATA, useValue: data },
          { provide: DialogRef, useValue: dialogRef },
          { provide: SummaryService, useValue: service },
          { provide: TaskService, useValue: { tasksSignal: tasks.asReadonly() } },
        ],
      });
      return TestBed.runInInjectionContext(() => new SummaryDialogComponent());
    }

    beforeEach(() => {
      vi.clearAllMocks();
      tasks.set([task('a', { status: 'DONE' }), task('b'), task('c', { tags: ['Frontend'] })]);
    });

    const withCharts: Summary = { ...summary, snapshot, charts: ['burnup', 'activity'] };

    it('reprend les graphiques enregistrés avec le résumé', () => {
      const dialog = create({ summary: withCharts });

      expect(dialog.charts()).toEqual(['burnup', 'activity']);
      expect(dialog.snapshot()).toBe(snapshot);
      expect(dialog.hasCharts()).toBe(true);
      expect(dialog.snapshotDate()).toContain('oct');
    });

    it('n’a pas de graphiques pour un résumé écrit avant leur arrivée', () => {
      const dialog = create({ summary });

      expect(dialog.hasCharts()).toBe(false);
      expect(dialog.snapshotDate()).toBe('');
    });

    it('n’affiche pas de graphiques quand aucun n’est retenu', () => {
      const dialog = create({ summary: { ...withCharts, charts: [] } });

      expect(dialog.hasCharts()).toBe(false);
    });

    it('coche et décoche un graphique en gardant l’ordre du rapport', () => {
      const dialog = create({ summary: withCharts, editing: true });

      dialog.toggleChart('status');
      expect(dialog.charts()).toEqual(['status', 'burnup', 'activity']);

      dialog.toggleChart('burnup');
      expect(dialog.charts()).toEqual(['status', 'activity']);
    });

    it('coche ou décoche tout', () => {
      const dialog = create({ summary: withCharts, editing: true });

      dialog.setAllCharts(true);
      expect(dialog.charts()).toHaveLength(8);

      dialog.setAllCharts(false);
      expect(dialog.charts()).toEqual([]);
    });

    describe('actualisation', () => {
      it('met à jour les chiffres des graphiques en gardant la sélection', () => {
        const dialog = create({ summary: withCharts, editing: true });

        dialog.refreshStats();

        expect(dialog.snapshot()).not.toBe(snapshot);
        expect(dialog.snapshot()!.status).toEqual({
          todo: 1,
          inProgress: 0,
          validation: 0,
          done: 1,
        });
        expect(dialog.charts()).toEqual(['burnup', 'activity']);
      });

      it('ajoute tous les graphiques à un résumé qui n’en avait pas', () => {
        const dialog = create({ summary, editing: true });

        dialog.refreshStats();

        expect(dialog.snapshot()).toBeDefined();
        expect(dialog.charts()).toHaveLength(8);
        expect(dialog.hasCharts()).toBe(true);
      });

      it('suit le choix de l’étiquette d’un nouveau résumé', () => {
        const fresh = { ...summary, id: 'new', label: '', content: '' };
        const dialog = create({ summary: fresh, isNew: true });

        dialog.setLabel('Frontend');

        expect(dialog.snapshot()!.status.todo).toBe(1);
        expect(dialog.charts()).toHaveLength(8);
      });
    });

    describe('enregistrement', () => {
      it('enregistre les graphiques retenus et leurs chiffres', async () => {
        const dialog = create({ summary: withCharts, editing: true });
        dialog.toggleChart('activity');

        await dialog.save();

        expect(service.update.mock.calls[0][0]).toMatchObject({ snapshot, charts: ['burnup'] });
      });

      it('annuler restaure les graphiques d’origine', () => {
        const dialog = create({ summary: withCharts, editing: true });
        dialog.setAllCharts(false);
        dialog.refreshStats();

        dialog.cancel();

        expect(dialog.snapshot()).toBe(snapshot);
        expect(dialog.charts()).toEqual(['burnup', 'activity']);
      });
    });

    describe('affichage', () => {
      @Component({ selector: 'app-report-charts', template: '<p class="charts-stub"></p>' })
      class ChartsStub {
        readonly snapshot = input.required<ReportSnapshot>();
        readonly only = input<ChartKey[] | null>(null);
      }

      function render(data: SummaryDialogData) {
        TestBed.configureTestingModule({
          providers: [
            { provide: DIALOG_DATA, useValue: data },
            { provide: DialogRef, useValue: dialogRef },
            { provide: SummaryService, useValue: service },
            { provide: TaskService, useValue: { tasksSignal: tasks.asReadonly() } },
          ],
        });
        TestBed.overrideComponent(SummaryDialogComponent, {
          remove: { imports: [ReportChartsComponent, EditorComponent] },
          add: { imports: [ChartsStub, EditorStub] },
        });
        const fixture = TestBed.createComponent(SummaryDialogComponent);
        return { fixture, el: fixture.nativeElement as HTMLElement };
      }

      @Component({ selector: 'app-editor', template: '' })
      class EditorStub {
        readonly content = input('');
        readonly contentChange = output<string>();
      }

      it('affiche les graphiques retenus sous le texte en lecture', async () => {
        const { fixture, el } = render({ summary: withCharts });
        await fixture.whenStable();

        expect(el.querySelector('.charts h3')?.textContent).toContain('Graphiques');
        expect(el.querySelector('.charts .charts-stub')).not.toBeNull();
        expect(el.querySelector('.chart-picker')).toBeNull();
      });

      it('n’affiche aucune section de graphiques pour un ancien résumé', async () => {
        const { fixture, el } = render({ summary });
        await fixture.whenStable();

        expect(el.querySelector('.charts')).toBeNull();
      });

      it('propose de choisir les graphiques en modification, avec le compte', async () => {
        const { fixture, el } = render({ summary: withCharts, editing: true });
        await fixture.whenStable();

        expect(el.querySelectorAll('.chart-picker .choice')).toHaveLength(8);
        expect(el.querySelectorAll('.chart-picker input:checked')).toHaveLength(2);
        expect(el.querySelector('.chart-picker .count')?.textContent).toBe('2/8');
        expect(el.querySelector('.charts')).toBeNull();
      });

      it('coche un graphique au clic', async () => {
        const { fixture, el } = render({ summary: withCharts, editing: true });
        await fixture.whenStable();

        el.querySelectorAll<HTMLInputElement>('.chart-picker input')[0].click();
        await fixture.whenStable();

        expect(el.querySelector('.chart-picker .count')?.textContent).toBe('3/8');
      });

      it('invite à actualiser les chiffres quand le résumé n’a pas encore de graphiques', async () => {
        const { fixture, el } = render({ summary, editing: true });
        await fixture.whenStable();

        expect(el.querySelector('.chart-picker .picker-note')?.textContent).toContain(
          'Actualiser les chiffres',
        );
        expect(el.querySelectorAll('.chart-picker .choice')).toHaveLength(0);
      });
    });
  });
});
