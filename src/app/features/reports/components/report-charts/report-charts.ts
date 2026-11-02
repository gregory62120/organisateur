import { Component, computed, input } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import {
  CHART_LABELS,
  ChartKey,
  ReportSnapshot,
  StatusCounts,
} from '../../../../core/models/report-snapshot.model';
import {
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUSES,
} from '../../../../core/models/task-labels';
import { movingAverage } from '../../../../core/services/report';

const GRID = '#eef2fa';
const GREEN = STATUS_COLORS.DONE;
const GREEN_LIGHT = '#a8e6c9';
const ORANGE = '#ff9f1a';
const CREATED = '#a9c1ff';
const BLUE = STATUS_COLORS.IN_PROGRESS;
const VIOLET = '#8b5cf6';
const RED = '#ef4452';

const AXIS_BASE = {
  beginAtZero: true,
  ticks: { precision: 0 },
  grid: { color: GRID },
} as const;

/** Légende commune : de petits carrés arrondis, de la couleur de la série. */
const LEGEND = {
  position: 'bottom' as const,
  labels: {
    usePointStyle: true,
    pointStyle: 'rectRounded' as const,
    boxWidth: 10,
    boxHeight: 10,
    padding: 16,
  },
};

const DAY_MS = 86_400_000;

/** Jour du calendrier d'activité : sa date, les tâches terminées et s'il est à venir. */
export interface HeatDay {
  date: Date;
  count: number;
  future: boolean;
}

/**
 * Les graphiques d'un rapport, construits à partir d'un instantané de chiffres. L'analyse en affiche
 * tous avec les chiffres du moment ; un résumé n'affiche que ceux qu'il a retenus, avec les chiffres
 * figés au moment de sa rédaction.
 */
@Component({
  selector: 'app-report-charts',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './report-charts.html',
  styleUrl: './report-charts.scss',
})
export class ReportChartsComponent {
  readonly snapshot = input.required<ReportSnapshot>();

  /** Graphiques à afficher ; absent : tous. */
  readonly only = input<ChartKey[] | null>(null);

  readonly titles = CHART_LABELS;

  shows(key: ChartKey): boolean {
    const only = this.only();
    return !only || only.includes(key);
  }

  private readonly unit = computed(() =>
    this.snapshot().flow.unit === 'week' ? 'semaine' : 'mois',
  );

  /** Période de la montée en charge : « semaine » ou « mois ». */
  readonly unitLabel = this.unit;

  // --- Répartition par statut ---------------------------------------------------------

  private readonly total = computed(() => {
    const s = this.snapshot().status;
    return s.todo + s.inProgress + s.validation + s.done;
  });

  readonly totalTasks = this.total;

  private readonly statusValues = computed(() => {
    const s = this.snapshot().status;
    return [s.todo, s.inProgress, s.validation, s.done];
  });

  readonly statusChart = computed<ChartConfiguration<'doughnut'>['data']>(() => ({
    labels: STATUSES.map((s) => STATUS_LABELS[s]),
    datasets: [
      {
        data: this.statusValues(),
        backgroundColor: STATUSES.map((s) => STATUS_COLORS[s]),
        borderWidth: 4,
        borderColor: '#ffffff',
      },
    ],
  }));

  readonly statusLegend = computed(() =>
    STATUSES.map((status, i) => ({
      label: STATUS_LABELS[status],
      color: STATUS_COLORS[status],
      value: this.statusValues()[i],
      percent: this.total() ? Math.round((this.statusValues()[i] / this.total()) * 100) : 0,
    })),
  );

  readonly doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '70%',
    plugins: { legend: { display: false } },
  };

  // --- Burn-up et prévision -----------------------------------------------------------

  /** Phrase sous le titre : la date de fin estimée, ou pourquoi elle ne peut pas l'être. */
  readonly forecastText = computed(() => {
    const burn = this.snapshot().burnup;
    const unit = burn.unit === 'week' ? 'semaine' : 'mois';
    if (burn.periodsLeft === 0) {
      return 'Toutes les tâches sont terminées.';
    }
    if (burn.periodsLeft === null || !burn.endLabel) {
      return 'Pas assez de tâches terminées récemment pour estimer la fin.';
    }
    const plural = burn.unit === 'week' && burn.periodsLeft > 1 ? 's' : '';
    return (
      `Fin estimée : ${burn.endLabel} (environ ${burn.periodsLeft} ${unit}${plural}, ` +
      `au rythme de ${burn.rate} tâche${burn.rate > 1 ? 's' : ''} par ${unit})`
    );
  });

  /**
   * Le périmètre (tâches créées, cumulées) et l'avancement (tâches terminées, cumulées) se rejoignent
   * quand tout est fait ; les pointillés prolongent le rythme récent, sans nouvelle tâche.
   */
  readonly burnupChart = computed<ChartConfiguration<'line'>['data']>(() => {
    const burn = this.snapshot().burnup;
    const actual = burn.scope.length;
    const future = burn.labels.length - actual;
    const scopeNow = burn.scope.at(-1) ?? 0;
    const doneNow = burn.done.at(-1) ?? 0;
    const dashedAfterToday = {
      borderDash: (ctx: { p0DataIndex: number }) =>
        ctx.p0DataIndex >= actual - 1 ? [6, 5] : undefined,
    };

    const datasets: ChartConfiguration<'line'>['data']['datasets'] = [
      {
        label: 'Périmètre (créées)',
        data: [...burn.scope, ...new Array<number>(future).fill(scopeNow)],
        borderColor: BLUE,
        backgroundColor: BLUE,
        borderWidth: 2.5,
        pointRadius: (ctx) => (ctx.dataIndex < actual ? 3 : 0),
        segment: dashedAfterToday,
      },
      {
        label: 'Terminées (cumul)',
        data: [...burn.done, ...new Array<null>(future).fill(null)],
        borderColor: GREEN,
        backgroundColor: GREEN,
        fill: { target: 'origin', above: 'rgba(25, 179, 107, 0.14)' },
        borderWidth: 2.5,
        pointRadius: 3,
      },
    ];
    if (burn.forecast.length) {
      datasets.push({
        label: 'Prévision',
        data: [...new Array<null>(actual - 1).fill(null), doneNow, ...burn.forecast],
        borderColor: GREEN,
        backgroundColor: GREEN,
        borderDash: [6, 5],
        borderWidth: 2,
        pointRadius: 0,
      });
    }
    return { labels: burn.labels, datasets };
  });

  readonly burnupOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: LEGEND },
    scales: { x: { grid: { display: false } }, y: AXIS_BASE },
  };

  // --- Charge à venir -----------------------------------------------------------------

  /** Tâches ouvertes par semaine d'échéance : le retard en rouge, le futur en bleu. */
  readonly loadChart = computed<ChartConfiguration<'bar'>['data']>(() => {
    const colors = { overdue: RED, week: BLUE, later: CREATED, none: STATUS_COLORS.TODO };
    const buckets = this.snapshot().load;
    return {
      labels: buckets.map((b) => b.label),
      datasets: [
        {
          label: 'Tâches ouvertes',
          data: buckets.map((b) => b.count),
          backgroundColor: buckets.map((b) => colors[b.kind]),
          borderRadius: 4,
          maxBarThickness: 40,
        },
      ],
    };
  });

  readonly singleBarOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      // Peu de libellés, courts : ils restent à l'horizontale plutôt que penchés.
      x: { grid: { display: false }, ticks: { maxRotation: 0, minRotation: 0 } },
      y: AXIS_BASE,
    },
  };

  /** Nombre de tâches ouvertes en retard, repris dans le sous-titre de la carte. */
  readonly overdueCount = computed(() => this.snapshot().load[0]?.count ?? 0);

  // --- Vitesse et délais --------------------------------------------------------------

  /** Terminées par période, avec leur moyenne glissante sur trois périodes. */
  readonly velocityChart = computed<ChartConfiguration<'bar'>['data']>(() => {
    const { labels, completed } = this.snapshot().flow;
    const last = completed.length - 1;
    // La période en cours n'est pas finie : sa barre est plus claire et elle n'entre pas dans la moyenne.
    const complete = completed.length > 1 ? completed.slice(0, -1) : completed;
    const average = {
      type: 'line',
      label: 'Moyenne sur 3',
      data: completed.length > 1 ? [...movingAverage(complete), null] : movingAverage(complete),
      borderColor: VIOLET,
      backgroundColor: VIOLET,
      borderWidth: 3,
      cubicInterpolationMode: 'monotone',
      tension: 0.3,
      pointRadius: 0,
      order: 0,
    };
    return {
      labels,
      datasets: [
        {
          label: 'Terminées',
          data: completed,
          backgroundColor: completed.map((_, i) => (i === last && last > 0 ? GREEN_LIGHT : GREEN)),
          borderRadius: 4,
          maxBarThickness: 34,
          order: 1,
        },
        average as unknown as ChartConfiguration<'bar'>['data']['datasets'][number],
      ],
    };
  });

  readonly velocityOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: LEGEND },
    scales: { x: { grid: { display: false } }, y: AXIS_BASE },
  };

  readonly cycleHint = computed(() => {
    const median = this.snapshot().cycle.median;
    return median === null ? 'Aucune tâche terminée' : `Médiane : ${median} j`;
  });

  readonly cycleChart = computed<ChartConfiguration<'bar'>['data']>(() => ({
    labels: this.snapshot().cycle.buckets.map((b) => b.label),
    datasets: [
      {
        label: 'Tâches terminées',
        data: this.snapshot().cycle.buckets.map((b) => b.count),
        backgroundColor: BLUE,
        borderRadius: 4,
        maxBarThickness: 40,
      },
    ],
  }));

  // --- Calendrier d'activité ----------------------------------------------------------

  readonly activity = computed(() => {
    const a = this.snapshot().activity;
    const [y, m, d] = a.start.split('-').map(Number);
    const [ty, tm, td] = a.today.split('-').map(Number);
    const today = new Date(ty, tm - 1, td).getTime();
    return {
      ...a,
      weeks: a.counts.map((week, w) =>
        week.map((count, i): HeatDay => {
          const date = new Date(y, m - 1, d + w * 7 + i);
          return { date, count, future: date.getTime() > today };
        }),
      ),
    };
  });

  /** Intensité d'un jour, de 0 (rien) à 4, par rapport au jour le plus actif. */
  level(day: HeatDay): number {
    const max = this.snapshot().activity.max;
    return day.count && max ? Math.min(4, Math.max(1, Math.ceil((day.count / max) * 4))) : 0;
  }

  dayTitle(day: HeatDay): string {
    const date = day.date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return `${date} : ${day.count} tâche${day.count > 1 ? 's' : ''} terminée${day.count > 1 ? 's' : ''}`;
  }

  // --- Charge par responsable et par priorité -----------------------------------------

  /** Barres empilées par statut, dans l'ordre d'avancement : terminé, en revue, en cours, à faire. */
  private stacked(labels: string[], rows: StatusCounts[]): ChartConfiguration<'bar'>['data'] {
    const series: [keyof StatusCounts, (typeof STATUSES)[number]][] = [
      ['done', 'DONE'],
      ['validation', 'VALIDATION'],
      ['inProgress', 'IN_PROGRESS'],
      ['todo', 'TODO'],
    ];
    return {
      labels,
      datasets: series.map(([key, status]) => ({
        label: STATUS_LABELS[status],
        data: rows.map((row) => row[key]),
        backgroundColor: STATUS_COLORS[status],
        borderColor: '#ffffff',
        borderWidth: 1,
        maxBarThickness: 26,
      })),
    };
  }

  readonly assigneeChart = computed(() => {
    const rows = this.snapshot().assignees;
    return this.stacked(
      rows.map((r) => r.name),
      rows,
    );
  });

  readonly priorityChart = computed(() => {
    const rows = this.snapshot().priorities;
    return this.stacked(
      rows.map((r) => PRIORITY_LABELS[r.priority]),
      rows,
    );
  });

  readonly stackedOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    // Marge à gauche : le début des noms longs ne doit pas être rogné.
    layout: { padding: { left: 8 } },
    plugins: { legend: LEGEND },
    scales: {
      x: { ...AXIS_BASE, stacked: true },
      y: {
        stacked: true,
        grid: { display: false },
        // Les noms sont mesurés avant que la police de l'application soit chargée : on garde de la marge.
        afterFit: (axis) => {
          axis.width += 16;
        },
      },
    },
  };

  /** Hauteur (px) du graphique par responsable : une ligne de 34 px par personne. */
  readonly assigneeHeight = computed(() => Math.max(this.snapshot().assignees.length, 1) * 34 + 70);
}
