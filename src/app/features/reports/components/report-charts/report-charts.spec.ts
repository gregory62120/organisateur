import { Directive, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BaseChartDirective } from 'ng2-charts';

import { ReportSnapshot } from '../../../../core/models/report-snapshot.model';
import { Task } from '../../../../core/models/task.model';
import { STATUS_COLORS } from '../../../../core/models/task-labels';
import { buildSnapshot } from '../../../../core/services/report';
import { ReportChartsComponent } from './report-charts';

/** Les graphiques ont besoin d'un vrai canvas : on les remplace par une coquille vide. */
@Directive({ selector: 'canvas[baseChart]' })
class ChartStub {
  readonly type = input<string>();
  readonly data = input<unknown>();
  readonly options = input<unknown>();
}

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

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
  createdAt: ago(10),
  updatedAt: ago(10),
  ...overrides,
});

describe('ReportChartsComponent', () => {
  const tasks = [
    task('fait-recent', {
      status: 'DONE',
      completedAt: ago(3),
      createdAt: ago(20),
      assignedTo: 'Sophie',
      priority: 'HIGH',
    }),
    task('fait-ancien', {
      status: 'DONE',
      completedAt: ago(12),
      createdAt: ago(20),
      assignedTo: 'Sophie',
    }),
    task('ouvert-tard', { status: 'IN_PROGRESS', assignedTo: 'Léo' }),
    task('ouvert-tot', { priority: 'LOW' }),
    task('en-revue', { status: 'VALIDATION' }),
  ];

  function create(snapshot: ReportSnapshot = buildSnapshot(tasks), only: unknown = null) {
    TestBed.overrideComponent(ReportChartsComponent, {
      remove: { imports: [BaseChartDirective] },
      add: { imports: [ChartStub] },
    });
    const fixture = TestBed.createComponent(ReportChartsComponent);
    fixture.componentRef.setInput('snapshot', snapshot);
    fixture.componentRef.setInput('only', only);
    return { fixture, cmp: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  describe('affichage', () => {
    it('affiche les huit graphiques par défaut', async () => {
      const { fixture, el } = create();
      await fixture.whenStable();

      expect(el.querySelectorAll('.card')).toHaveLength(8);
      expect(el.querySelectorAll('canvas')).toHaveLength(7);
      expect(el.querySelectorAll('.heat-col')).toHaveLength(20);
    });

    it('n’affiche que les graphiques retenus', async () => {
      const { fixture, el } = create(buildSnapshot(tasks), ['burnup', 'activity']);
      await fixture.whenStable();

      const titles = [...el.querySelectorAll('.card h2')].map((h) => h.textContent);
      expect(titles).toEqual(['Burn-up et prévision', "Calendrier d'activité"]);
    });

    it('n’affiche rien quand aucun graphique n’est retenu', async () => {
      const { fixture, el } = create(buildSnapshot(tasks), []);
      await fixture.whenStable();

      expect(el.querySelectorAll('.card')).toHaveLength(0);
    });

    it('affiche les mêmes graphiques à partir d’un instantané enregistré puis relu', async () => {
      const saved = JSON.parse(JSON.stringify(buildSnapshot(tasks))) as ReportSnapshot;
      const { fixture, el, cmp } = create(saved);
      await fixture.whenStable();

      expect(cmp.totalTasks()).toBe(5);
      expect(el.querySelectorAll('.card')).toHaveLength(8);
      expect(el.querySelectorAll('.heat-grid .cell')).toHaveLength(140);
    });
  });

  describe('répartition par statut', () => {
    it('donne la répartition et les pourcentages', () => {
      const { cmp } = create();

      expect(cmp.statusLegend().map((l) => [l.label, l.value, l.percent])).toEqual([
        ['À faire', 1, 20],
        ['En cours', 1, 20],
        ['En revue', 1, 20],
        ['Terminé', 2, 40],
      ]);
      expect(cmp.statusChart().datasets[0].data).toEqual([1, 1, 1, 2]);
      expect(cmp.totalTasks()).toBe(5);
    });

    it('n’affiche aucun pourcentage sans tâche', () => {
      const { cmp } = create(buildSnapshot([]));

      expect(cmp.statusLegend().every((l) => l.percent === 0)).toBe(true);
      expect(cmp.totalTasks()).toBe(0);
    });
  });

  describe('burn-up et prévision', () => {
    it('trace le périmètre et l’avancement cumulés sur les mêmes périodes', () => {
      const { cmp } = create();

      const { datasets, labels } = cmp.burnupChart();
      expect(datasets.map((d) => d.label).slice(0, 2)).toEqual([
        'Périmètre (créées)',
        'Terminées (cumul)',
      ]);
      const scope = datasets[0].data as number[];
      const done = datasets[1].data as (number | null)[];
      expect(scope.length).toBe(labels?.length);
      expect(done.filter((n) => n !== null).at(-1)).toBe(2);
    });

    it('prolonge en pointillés quand un rythme existe, en prolongeant l’axe', () => {
      const done = (id: string, days: number) =>
        task(id, { status: 'DONE', createdAt: ago(40), completedAt: ago(days) });
      const { cmp } = create(
        buildSnapshot([
          done('a', 8),
          done('b', 15),
          done('c', 22),
          done('d', 29),
          task('e'),
          task('f'),
        ]),
      );

      const { datasets, labels } = cmp.burnupChart();
      const forecast = datasets.find((d) => d.label === 'Prévision');
      expect((forecast as { borderDash?: number[] }).borderDash).toEqual([6, 5]);
      expect((forecast!.data as unknown[]).length).toBe(labels?.length);
      expect(cmp.forecastText()).toContain('Fin estimée');
    });

    it('n’a pas de courbe de prévision sans rythme, et le dit', () => {
      const { cmp } = create(buildSnapshot([task('a'), task('b')]));

      expect(cmp.burnupChart().datasets.some((d) => d.label === 'Prévision')).toBe(false);
      expect(cmp.forecastText()).toContain('Pas assez de tâches terminées');
    });

    it('signale que tout est terminé', () => {
      const { cmp } = create(
        buildSnapshot([task('a', { status: 'DONE', completedAt: new Date().toISOString() })]),
      );

      expect(cmp.forecastText()).toBe('Toutes les tâches sont terminées.');
    });
  });

  describe('charge à venir', () => {
    it('colore le retard en rouge, les semaines en bleu et l’absence d’échéance en gris', () => {
      const past = new Date(Date.now() - 5 * DAY).toISOString().slice(0, 10);
      const future = new Date(Date.now() + 9 * DAY).toISOString().slice(0, 10);
      const { cmp } = create(
        buildSnapshot([task('a', { dueDate: past }), task('b', { dueDate: future }), task('c')]),
      );

      const chart = cmp.loadChart();
      const colors = chart.datasets[0].backgroundColor as string[];
      expect(chart.labels?.[0]).toBe('En retard');
      expect(colors[0]).toBe('#ef4452');
      expect(colors[1]).toBe(STATUS_COLORS.IN_PROGRESS);
      expect(colors.at(-1)).toBe(STATUS_COLORS.TODO);
      expect(chart.labels?.at(-1)).toBe('Sans date');
    });

    it('compte les tâches ouvertes en retard, archivées exclues', () => {
      const past = new Date(Date.now() - 5 * DAY).toISOString().slice(0, 10);
      const { cmp } = create(
        buildSnapshot([
          task('a', { dueDate: past }),
          task('b', { dueDate: past, archived: true }),
          task('c', { dueDate: past, status: 'DONE' }),
        ]),
      );

      expect(cmp.overdueCount()).toBe(1);
    });
  });

  describe('vitesse et délais', () => {
    it('trace les tâches terminées par période avec leur moyenne glissante', () => {
      const { cmp } = create();

      const { datasets, labels } = cmp.velocityChart();
      expect(datasets.map((d) => d.label)).toEqual(['Terminées', 'Moyenne sur 3']);
      expect((datasets[1] as { type?: string }).type).toBe('line');
      expect((datasets[0].data as number[]).reduce((a, b) => a + b, 0)).toBe(2);
      expect((datasets[1].data as unknown[]).length).toBe(labels?.length);
    });

    it('éclaircit la barre de la période en cours et la laisse hors de la moyenne', () => {
      const { cmp } = create();

      const { datasets } = cmp.velocityChart();
      const colors = datasets[0].backgroundColor as string[];
      expect(colors.at(-1)).toBe('#a8e6c9');
      expect(colors[0]).toBe(STATUS_COLORS.DONE);
      expect((datasets[1].data as (number | null)[]).at(-1)).toBeNull();
    });

    it('dessine la courbe de moyenne au-dessus des barres', () => {
      const { cmp } = create();

      const orders = cmp.velocityChart().datasets.map((d) => d.order);

      expect(orders[1]).toBeLessThan(orders[0] as number);
    });

    it('répartit les délais de réalisation par tranche et donne la médiane', () => {
      const { cmp } = create(
        buildSnapshot([
          task('a', { status: 'DONE', createdAt: ago(20), completedAt: ago(18) }),
          task('b', { status: 'DONE', createdAt: ago(20), completedAt: ago(10) }),
        ]),
      );

      expect(cmp.cycleChart().datasets[0].data).toEqual([0, 1, 0, 1, 0]);
      expect(cmp.cycleHint()).toBe('Médiane : 6 j');
    });

    it('le dit quand aucune tâche n’est terminée', () => {
      const { cmp } = create(buildSnapshot([task('a')]));

      expect(cmp.cycleHint()).toBe('Aucune tâche terminée');
    });
  });

  describe('calendrier d’activité', () => {
    it('place chaque tâche terminée sur son jour, avec une intensité relative au jour le plus actif', () => {
      const today = new Date();
      today.setHours(10, 0, 0, 0);
      const busy = (id: string) => task(id, { status: 'DONE', completedAt: today.toISOString() });
      const { cmp } = create(
        buildSnapshot([
          busy('a'),
          busy('b'),
          busy('c'),
          busy('d'),
          task('e', { status: 'DONE', completedAt: new Date(today.getTime() - DAY).toISOString() }),
        ]),
      );

      const days = cmp
        .activity()
        .weeks.flat()
        .filter((d) => d.count > 0)
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      const [yesterday, now] = days;
      expect(now.count).toBe(4);
      expect(cmp.level(now)).toBe(4);
      expect(cmp.level(yesterday)).toBe(1);
      expect(cmp.level({ ...now, count: 0 })).toBe(0);
    });

    it('marque les jours à venir et affiche 20 semaines de 7 jours', async () => {
      const { fixture, el, cmp } = create();
      await fixture.whenStable();

      expect(cmp.activity().weeks).toHaveLength(20);
      expect(cmp.activity().weeks.every((w) => w.length === 7)).toBe(true);
      expect(
        cmp
          .activity()
          .weeks.flat()
          .filter((d) => !d.future).length,
      ).toBeGreaterThan(130);
      expect(el.querySelectorAll('.heat-legend .cell')).toHaveLength(5);
    });

    it('décrit un jour en toutes lettres, avec les accords', () => {
      const { cmp } = create();
      const date = new Date(2026, 9, 29);

      expect(cmp.dayTitle({ date, count: 1, future: false })).toContain('1 tâche terminée');
      expect(cmp.dayTitle({ date, count: 3, future: false })).toContain('3 tâches terminées');
      expect(cmp.dayTitle({ date, count: 0, future: false })).toContain('0 tâche terminée');
    });
  });

  describe('charge par responsable et par priorité', () => {
    it('empile les responsables par statut, dans l’ordre d’avancement', () => {
      const { cmp } = create();

      const chart = cmp.assigneeChart();
      expect(chart.labels).toEqual(['Sophie', 'Léo', 'Non assigné']);
      expect(chart.datasets.map((d) => d.label)).toEqual([
        'Terminé',
        'En revue',
        'En cours',
        'À faire',
      ]);
      expect(chart.datasets.map((d) => d.data)).toEqual([
        [2, 0, 0], // terminé
        [0, 0, 1], // en revue
        [0, 1, 0], // en cours
        [0, 0, 1], // à faire
      ]);
    });

    it('colore les barres comme les statuts', () => {
      const { cmp } = create();

      expect(cmp.priorityChart().datasets.map((d) => d.backgroundColor)).toEqual([
        STATUS_COLORS.DONE,
        STATUS_COLORS.VALIDATION,
        STATUS_COLORS.IN_PROGRESS,
        STATUS_COLORS.TODO,
      ]);
    });

    it('répartit la charge par priorité, de la plus haute à la plus basse', () => {
      const { cmp } = create();

      const chart = cmp.priorityChart();
      expect(chart.labels).toEqual(['Haute', 'Moyenne', 'Basse']);
      expect(chart.datasets[0].data).toEqual([1, 1, 0]);
      expect(chart.datasets[1].data).toEqual([0, 1, 0]);
      expect(chart.datasets[2].data).toEqual([0, 1, 0]);
      expect(chart.datasets[3].data).toEqual([0, 0, 1]);
    });

    it('dimensionne le graphique par responsable selon le nombre de personnes', () => {
      const { fixture, cmp } = create();
      expect(cmp.assigneeHeight()).toBe(3 * 34 + 70);

      fixture.componentRef.setInput('snapshot', buildSnapshot([]));

      expect(cmp.assigneeHeight()).toBe(34 + 70);
    });
  });
});
