import { Component, computed, DestroyRef, inject, signal } from '@angular/core';

import {
  filterByRange,
  formatHms,
  formatMinutes,
  logMinutes,
  GROUP_LABELS,
  GroupBy,
  groupTime,
  parseDuration,
  Period,
  periodRange,
  totalMinutes,
} from '../../core/models/time-log';
import { Task } from '../../core/models/task.model';
import { STATUS_LABELS } from '../../core/models/task-labels';
import { addDaysToKey, mondayOf, toKey } from '../../core/models/timesheet';
import { CalendarService } from '../../core/services/calendar.service';
import { StorageService } from '../../core/services/storage.service';
import { TaskService } from '../../core/services/task.service';
import { TimeLogService } from '../../core/services/time-log.service';
import { TaskDialogService } from '../kanban/services/task-dialog.service';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois-ci' },
  { value: 'all', label: 'Tout' },
  { value: 'custom', label: 'Personnalisé' },
];

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const ASSIGNEE_KEY = 'tf-planner-assignee';

interface TaskCard {
  task: Task;
  /** Créneaux prévus ce jour-là (« 09:00 – 11:00 »), ou « Prévu » sans heure. */
  planned?: string;
  due: boolean;
  /** Temps déjà enregistré ce jour-là, en minutes. */
  logged: number;
  /** Estimation et temps total passé (toutes dates), en minutes. */
  estimate?: number;
  spentAll: number;
}

@Component({
  selector: 'app-time',
  templateUrl: './time.html',
  styleUrl: './time.scss',
})
export class TimeComponent {
  readonly storage = inject(StorageService);
  private readonly taskService = inject(TaskService);
  private readonly calendar = inject(CalendarService);
  private readonly dialogs = inject(TaskDialogService);
  readonly timeLog = inject(TimeLogService);

  readonly periods = PERIODS;
  readonly weekdays = WEEKDAYS;
  readonly groupOptions = Object.entries(GROUP_LABELS) as [GroupBy, string][];
  /** Durées avec secondes ; les estimations (en minutes entières) gardent « 2h00 ». */
  readonly format = formatHms;
  readonly formatEstimate = formatMinutes;
  readonly minutesOf = logMinutes;
  readonly statusLabels = STATUS_LABELS;

  readonly tab = signal<'track' | 'report'>('track');

  // Suivi : semaine affichée, jour sélectionné, filtre de responsable
  readonly monday = signal(toKey(mondayOf(new Date())));
  readonly selected = signal(toKey(new Date()));
  readonly assignee = signal(this.restoreAssignee());

  // Rapport
  readonly by = signal<GroupBy>('task');
  readonly period = signal<Period>('week');
  readonly from = signal('');
  readonly to = signal('');

  // Saisie manuelle
  readonly formTask = signal('');
  readonly formDuration = signal('');
  readonly formNote = signal('');
  readonly formError = signal('');

  private readonly now = signal(Date.now());

  private readonly today = () => toKey(new Date());

  readonly assignees = computed(() => [
    ...new Set(
      this.taskService
        .tasksSignal()
        .map((task) => task.assignedTo?.trim())
        .filter((name): name is string => !!name),
    ),
  ]);

  /** Tâches proposées à la saisie : non archivées, les terminées en dernier. */
  readonly tasks = computed(() =>
    this.taskService
      .tasksSignal()
      .filter((task) => !task.archived)
      .sort(
        (a, b) =>
          Number(a.status === 'DONE') - Number(b.status === 'DONE') ||
          a.title.localeCompare(b.title, 'fr'),
      ),
  );

  private readonly calendarEvents = computed(() =>
    this.calendar.events(this.taskService.tasksSignal()),
  );

  /** La tâche passe-t-elle le filtre « Pour » ? (Une tâche supprimée reste visible.) */
  private readonly visible = computed(() => {
    const me = this.assignee().trim().toLowerCase();
    const byId = new Map(this.taskService.tasksSignal().map((task) => [task.id, task]));
    return (taskId: string) => {
      const task = byId.get(taskId);
      return (
        !me || !task || !task.assignedTo?.trim() || task.assignedTo.trim().toLowerCase() === me
      );
    };
  });

  /** Minutes du chrono en cours qui tombent sur un jour donné (un chrono peut passer minuit). */
  runningOn(date: string): number {
    const timer = this.timeLog.timer();
    if (!timer) {
      return 0;
    }
    const start = new Date(`${date}T00:00:00`).getTime();
    const from = Math.max(timer.startedAt, start);
    const to = Math.min(this.now(), start + 24 * 60 * 60 * 1000);
    return Math.max(0, (to - from) / 60000);
  }

  /** Total d'un jour avec le chrono en cours : seule cette partie bouge chaque seconde. */
  dayTotal(day: { date: string; total: number }): number {
    return day.total + this.runningOn(day.date);
  }

  readonly columns = computed(() => {
    const tasks = this.taskService.tasksSignal();
    const byId = new Map(tasks.map((task) => [task.id, task]));
    const logs = this.timeLog.logs();
    const events = this.calendarEvents();
    const timer = this.timeLog.timer();
    const visible = this.visible();
    const today = this.today();

    return Array.from({ length: 7 }, (_, index) => {
      const date = addDaysToKey(this.monday(), index);
      const ids = new Set<string>();
      const planned = new Map<string, string[]>();
      const due = new Set<string>();

      for (const log of logs) {
        if (log.date === date) {
          ids.add(log.taskId);
        }
      }
      for (const event of events) {
        if (event.date !== date) {
          continue;
        }
        if (event.kind === 'work') {
          ids.add(event.task.id);
          planned.set(event.task.id, [
            ...(planned.get(event.task.id) ?? []),
            event.time ?? 'Prévu',
          ]);
        } else if (event.kind === 'task' && !event.done) {
          ids.add(event.task.id);
          due.add(event.task.id);
        }
      }
      if (date === today) {
        tasks
          .filter((task) => task.status === 'IN_PROGRESS' && !task.archived)
          .forEach((task) => ids.add(task.id));
        if (timer) {
          ids.add(timer.taskId);
        }
      }

      const cards: TaskCard[] = [...ids]
        .map((id) => byId.get(id))
        .filter((task): task is Task => !!task)
        .filter((task) => visible(task.id))
        .map((task) => ({
          task,
          planned: planned.get(task.id)?.join(' · '),
          due: due.has(task.id),
          logged: logs
            .filter((log) => log.taskId === task.id && log.date === date)
            .reduce((sum, log) => sum + logMinutes(log), 0),
          estimate: task.estimateHours ? Math.round(task.estimateHours * 60) : undefined,
          spentAll: totalMinutes(logs.filter((log) => log.taskId === task.id)),
        }))
        .sort(
          (a, b) =>
            Number(b.task.id === timer?.taskId) - Number(a.task.id === timer?.taskId) ||
            (a.planned ?? '~').localeCompare(b.planned ?? '~') ||
            a.task.title.localeCompare(b.task.title, 'fr'),
        );

      // Le total ne compte que les tâches affichées (filtre « Pour »).
      const total = logs
        .filter((log) => log.date === date && visible(log.taskId))
        .reduce((sum, log) => sum + logMinutes(log), 0);
      return {
        date,
        label: WEEKDAYS[index],
        number: new Date(`${date}T00:00:00`).getDate(),
        isToday: date === today,
        cards,
        total,
      };
    });
  });

  readonly weekTotal = computed(() =>
    this.columns().reduce((sum, column) => sum + this.dayTotal(column), 0),
  );

  readonly weekTitle = computed(() => {
    const format = (date: string) =>
      new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    return `${format(this.monday())} – ${format(addDaysToKey(this.monday(), 6))}`;
  });

  readonly isCurrentWeek = computed(() => this.monday() === toKey(mondayOf(new Date())));

  /** Saisies du jour sélectionné, les plus récentes d'abord. */
  readonly dayEntries = computed(() => {
    const titles = new Map(this.taskService.tasksSignal().map((task) => [task.id, task.title]));
    return this.timeLog
      .logs()
      .filter((log) => log.date === this.selected() && this.visible()(log.taskId))
      .sort(
        (a, b) =>
          (b.start ?? '').localeCompare(a.start ?? '') || b.createdAt.localeCompare(a.createdAt),
      )
      .map((log) => ({ log, title: titles.get(log.taskId) ?? 'Tâche supprimée' }));
  });

  readonly selectedTotal = computed(() => totalMinutes(this.dayEntries().map((e) => e.log)));

  readonly selectedLabel = computed(() =>
    new Date(`${this.selected()}T00:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
  );

  // ---- Rapport
  private readonly range = computed(() =>
    periodRange(this.period(), new Date(), { from: this.from(), to: this.to() }),
  );

  readonly logs = computed(() => filterByRange(this.timeLog.logs(), this.range()));

  readonly total = computed(() => totalMinutes(this.logs()));

  readonly groups = computed(() =>
    groupTime(this.logs(), this.taskService.tasksSignal(), this.by(), this.timeLog.logs()),
  );

  readonly maxMinutes = computed(() => Math.max(1, ...this.groups().map((g) => g.minutes)));

  readonly runningTitle = computed(() => {
    const timer = this.timeLog.timer();
    return timer
      ? (this.taskService.tasksSignal().find((task) => task.id === timer.taskId)?.title ??
          'Tâche supprimée')
      : '';
  });

  readonly elapsed = computed(() => {
    const timer = this.timeLog.timer();
    if (!timer) {
      return '';
    }
    const seconds = Math.max(0, Math.floor((this.now() - timer.startedAt) / 1000));
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
  });

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  shift(weeks: number) {
    this.monday.set(addDaysToKey(this.monday(), weeks * 7));
    // Le jour sélectionné suit la semaine : le détail reste celui d'un jour visible.
    this.selected.set(addDaysToKey(this.selected(), weeks * 7));
  }

  goToday() {
    this.monday.set(toKey(mondayOf(new Date())));
    this.selected.set(this.today());
  }

  setAssignee(name: string) {
    this.assignee.set(name);
    try {
      localStorage.setItem(ASSIGNEE_KEY, name);
    } catch {
      // Stockage indisponible : le choix ne sera pas conservé.
    }
  }

  isRunning(task: Task): boolean {
    return this.timeLog.timer()?.taskId === task.id;
  }

  open(task: Task) {
    this.dialogs.openTask(task);
  }

  /** Temps affiché sur une carte : l'enregistré, plus le chrono en cours si c'est aujourd'hui. */
  shown(card: TaskCard, date: string): number {
    return card.logged + (this.isRunning(card.task) ? this.runningOn(date) : 0);
  }

  add() {
    const minutes = parseDuration(this.formDuration());
    if (!this.formTask()) {
      this.formError.set('Choisissez une tâche.');
      return;
    }
    if (!minutes) {
      this.formError.set('Durée illisible : essayez « 1h30 », « 45min » ou « 1,5 ».');
      return;
    }
    this.formError.set('');
    this.timeLog.add(this.formTask(), this.selected(), minutes, this.formNote());
    this.formDuration.set('');
    this.formNote.set('');
  }

  share(minutes: number): number {
    return this.total() ? Math.round((minutes / this.total()) * 100) : 0;
  }

  groupTitle(): string {
    const titles: Record<GroupBy, string> = {
      task: 'Par tâche',
      tag: 'Par étiquette',
      assignee: 'Par responsable',
      status: 'Par statut',
      priority: 'Par priorité',
      day: 'Par jour',
    };
    return titles[this.by()];
  }

  /** Libellé d'un groupe : les jours sont écrits en toutes lettres. */
  groupLabel(label: string): string {
    return this.by() === 'day'
      ? new Date(`${label}T00:00:00`).toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      : label;
  }

  dateLabel(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  /** Saisies de la période pour la liste du rapport, les plus récentes d'abord. */
  readonly entries = computed(() => {
    const titles = new Map(this.taskService.tasksSignal().map((task) => [task.id, task.title]));
    return [...this.logs()]
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .map((log) => ({ log, title: titles.get(log.taskId) ?? 'Tâche supprimée' }));
  });

  async openProject() {
    try {
      await this.storage.openProject();
    } catch {
      // Sélection de dossier annulée par l'utilisateur.
    }
  }

  private restoreAssignee(): string {
    try {
      return localStorage.getItem(ASSIGNEE_KEY) ?? '';
    } catch {
      return '';
    }
  }
}
