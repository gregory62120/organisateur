import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Task } from '../../core/models/task.model';
import { ProjectEvent } from '../../core/models/event.model';
import { EventService } from '../../core/services/event.service';
import { StorageService } from '../../core/services/storage.service';
import { TaskService } from '../../core/services/task.service';
import { TaskDialogService } from '../kanban/services/task-dialog.service';
import { TaskCalendarEvent } from '../../core/services/calendar.service';
import { CalendarComponent } from './calendar';
import { EventDialogService } from './services/event-dialog.service';

function makeTask(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    checklist: [],
    comments: [],
    attachments: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('CalendarComponent', () => {
  const tasks = signal<Task[]>([]);
  const projectEvents = signal<ProjectEvent[]>([]);
  const storage = { isOpen: signal(true), root: signal({ name: 'Projet' }) };
  const dialogs = { openTask: vi.fn(), openSubtask: vi.fn() };
  const eventDialogs = { create: vi.fn(), edit: vi.fn() };

  let calendar: CalendarComponent;

  function setup() {
    TestBed.configureTestingModule({
      providers: [
        { provide: TaskService, useValue: { tasksSignal: tasks.asReadonly() } },
        { provide: StorageService, useValue: storage },
        { provide: TaskDialogService, useValue: dialogs },
        { provide: EventService, useValue: { eventsSignal: projectEvents.asReadonly() } },
        { provide: EventDialogService, useValue: eventDialogs },
      ],
    });
    return TestBed.createComponent(CalendarComponent);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    // jeudi 15 octobre 2026
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 15, 10, 0));

    projectEvents.set([
      {
        id: 'meet',
        title: 'Revue de sprint',
        date: '2026-10-21',
        startTime: '14:00',
        endTime: '15:00',
        description: '',
        color: 'violet',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    tasks.set([
      makeTask('late', { dueDate: '2026-10-10', priority: 'HIGH', assignedTo: 'Sophie' }),
      makeTask('today', { dueDate: '2026-10-15' }),
      makeTask('soon', { dueDate: '2026-10-17', status: 'IN_PROGRESS' }),
      makeTask('done', { dueDate: '2026-10-16', status: 'DONE' }),
      makeTask('next-month', { dueDate: '2026-11-03' }),
      makeTask('archived', { dueDate: '2026-10-15', archived: true }),
      makeTask('parent', {
        dueDate: '2026-10-22',
        checklist: [{ id: 's1', label: 'Sous-échéance', completed: false, dueDate: '2026-10-15' }],
      }),
    ]);

    calendar = setup().componentInstance;
  });

  afterEach(() => vi.useRealTimers());

  const dayEvents = (iso: string) =>
    calendar
      .weeks()
      .flat()
      .find((d) => d.iso === iso)!
      .events.map((e) => e.key);

  it('démarre sur le mois courant avec aujourd’hui sélectionné', () => {
    expect(calendar.view()).toBe('month');
    expect(calendar.title()).toBe('octobre 2026');
    expect(calendar.selected()).toBe('2026-10-15');
  });

  it('place les échéances sur leur jour, sans les archivées', () => {
    expect(dayEvents('2026-10-10')).toEqual(['late']);
    expect(dayEvents('2026-10-15')).toEqual(['parent:s1', 'today']);
    expect(dayEvents('2026-10-17')).toEqual(['soon']);
  });

  it('liste les échéances du jour sélectionné', () => {
    expect(calendar.selectedEvents().map((e) => e.key)).toEqual(['parent:s1', 'today']);

    calendar.select('2026-10-10');
    expect(calendar.selectedEvents().map((e) => e.key)).toEqual(['late']);

    calendar.select('2026-10-30');
    expect(calendar.selectedEvents()).toEqual([]);
  });

  it('calcule les compteurs en retard, de la semaine et du mois', () => {
    expect(calendar.overdueCount()).toBe(1);
    // Semaine du 12 au 18 : today, parent:s1, soon (la terminée et la tâche en retard sont exclues).
    expect(calendar.weekCount()).toBe(3);
    // Octobre à faire : late, today, soon, parent, parent:s1 et l’évènement.
    expect(calendar.monthCount()).toBe(6);
  });

  it('propose les prochaines échéances à faire, les plus proches d’abord', () => {
    expect(calendar.upcoming().map((e) => e.key)).toEqual([
      'parent:s1',
      'today',
      'soon',
      'event:meet',
      'parent',
      'next-month',
    ]);
  });

  describe('navigation', () => {
    it('change de mois puis revient à aujourd’hui', () => {
      calendar.move(1);
      expect(calendar.title()).toBe('novembre 2026');
      expect(dayEvents('2026-11-03')).toEqual(['next-month']);

      calendar.move(-1);
      calendar.move(-1);
      expect(calendar.title()).toBe('septembre 2026');

      calendar.select('2026-09-01');
      calendar.goToday();
      expect(calendar.title()).toBe('octobre 2026');
      expect(calendar.selected()).toBe('2026-10-15');
    });

    it('passe en vue semaine : une seule ligne, sans limite d’échéances par jour', () => {
      calendar.setView('week');

      expect(calendar.weeks()).toHaveLength(1);
      expect(calendar.weeks()[0].map((d) => d.iso)[0]).toBe('2026-10-12');
      expect(calendar.limit()).toBe(Infinity);

      calendar.move(1);
      expect(calendar.weeks()[0][0].iso).toBe('2026-10-19');
    });

    it('limite les échéances affichées par jour en vue mois', () => {
      expect(calendar.limit()).toBe(3);
    });
  });

  describe('filtres', () => {
    it('filtre par responsable et par statut', () => {
      calendar.assigneeFilter.set('Sophie');
      expect(calendar.selectedEvents()).toEqual([]);
      expect(dayEvents('2026-10-10')).toEqual(['late']);

      calendar.resetFilters();
      calendar.statusFilter.set('IN_PROGRESS');
      expect(dayEvents('2026-10-17')).toEqual(['soon']);
      expect(dayEvents('2026-10-10')).toEqual([]);
      expect(calendar.hasFilter()).toBe(true);
    });

    it('masque les terminées', () => {
      expect(dayEvents('2026-10-16')).toEqual(['done']);

      calendar.hideDone.set(true);
      expect(dayEvents('2026-10-16')).toEqual([]);

      calendar.resetFilters();
      expect(calendar.hasFilter()).toBe(false);
      expect(dayEvents('2026-10-16')).toEqual(['done']);
    });
  });

  describe('ouverture', () => {
    it('ouvre le formulaire de la tâche sans propager le clic', () => {
      const event = calendar.selectedEvents().find((e) => e.kind === 'task') as TaskCalendarEvent;
      const dom = { stopPropagation: vi.fn() } as unknown as Event;

      calendar.open(event, dom);

      expect(dialogs.openTask).toHaveBeenCalledWith(event.task);
      expect(dom.stopPropagation).toHaveBeenCalled();
    });

    it('ouvre le formulaire de la sous-tâche pour une sous-échéance', () => {
      const sub = calendar.selectedEvents().find((e) => e.kind === 'subtask') as TaskCalendarEvent;

      calendar.open(sub);

      expect(dialogs.openSubtask).toHaveBeenCalledWith(sub.task, 's1');
      expect(dialogs.openTask).not.toHaveBeenCalled();
    });
  });

  it('formule les dates relatives', () => {
    expect(calendar.relativeDay('2026-10-15')).toBe("Aujourd'hui");
    expect(calendar.relativeDay('2026-10-16')).toBe('Demain');
    expect(calendar.relativeDay('2026-10-20')).toContain('20');
  });

  describe('rendu', () => {
    it('affiche une puce par échéance et « +N autres » au-delà de la limite', async () => {
      tasks.update((list) => [
        ...list,
        makeTask('x1', { dueDate: '2026-10-15' }),
        makeTask('x2', { dueDate: '2026-10-15' }),
      ]);
      TestBed.resetTestingModule();
      const fixture = setup();
      await fixture.whenStable();
      const el = fixture.nativeElement as HTMLElement;

      const cell = el.querySelector<HTMLElement>('.day.today')!;
      expect(cell.querySelectorAll('.chip')).toHaveLength(3);
      expect(cell.querySelector('.more')?.textContent).toContain('+1 autre');
      expect(cell.querySelector('.number')?.textContent?.trim()).toBe('15');
      expect(el.querySelectorAll('.day.selected')).toHaveLength(1);
      expect(el.querySelector('.chip.overdue')).not.toBeNull();
    });

    it('invite à ouvrir un projet quand aucun n’est ouvert', async () => {
      storage.isOpen.set(false);
      TestBed.resetTestingModule();
      const fixture = setup();
      await fixture.whenStable();

      expect((fixture.nativeElement as HTMLElement).querySelector('.empty-state')).not.toBeNull();
      expect((fixture.nativeElement as HTMLElement).querySelector('.calendar')).toBeNull();
      storage.isOpen.set(true);
    });
  });

  describe('évènements', () => {
    it('affiche l’évènement sur son jour, sans que les filtres des tâches le masquent', () => {
      expect(dayEvents('2026-10-21')).toEqual(['event:meet']);

      calendar.statusFilter.set('DONE');
      calendar.assigneeFilter.set('Sophie');
      calendar.hideDone.set(true);

      expect(dayEvents('2026-10-21')).toEqual(['event:meet']);
    });

    it('ouvre l’évènement en édition et non comme une tâche', () => {
      calendar.select('2026-10-21');
      const event = calendar.selectedEvents()[0];

      calendar.open(event);

      expect(eventDialogs.edit).toHaveBeenCalledWith(projectEvents()[0]);
      expect(dialogs.openTask).not.toHaveBeenCalled();
    });

    it('crée un évènement le jour demandé, par défaut le jour sélectionné', () => {
      calendar.addEvent('2026-10-23');
      expect(eventDialogs.create).toHaveBeenLastCalledWith('2026-10-23', undefined);
      expect(calendar.selected()).toBe('2026-10-23');

      calendar.addEvent();
      expect(eventDialogs.create).toHaveBeenLastCalledWith('2026-10-23', undefined);
    });

    it('choisit l’icône de la puce selon l’état puis la nature', () => {
      const [event] = calendar
        .weeks()
        .flat()
        .find((d) => d.iso === '2026-10-21')!.events;
      const task = calendar
        .weeks()
        .flat()
        .find((d) => d.iso === '2026-10-10')!.events[0];
      const done = calendar
        .weeks()
        .flat()
        .find((d) => d.iso === '2026-10-16')!.events[0];

      expect(calendar.chipIcon(event)).toBe('schedule');
      expect(calendar.chipIcon(task)).toBe('error');
      expect(calendar.chipIcon(done)).toBe('check_circle');
    });

    it('affiche l’heure et la couleur de la puce, et crée via le bouton « + » du jour', async () => {
      TestBed.resetTestingModule();
      const fixture = setup();
      await fixture.whenStable();
      const el = fixture.nativeElement as HTMLElement;

      const chip = [...el.querySelectorAll<HTMLElement>('.chip.event')].find((c) =>
        c.textContent?.includes('Revue de sprint'),
      )!;
      expect(chip.getAttribute('data-color')).toBe('violet');
      expect(chip.querySelector('.time')?.textContent).toBe('14:00');

      el.querySelector<HTMLElement>('.day.today .add-day')!.click();
      expect(eventDialogs.create).toHaveBeenCalledWith('2026-10-15', undefined);

      el.querySelector<HTMLElement>('.btn-add')!.click();
      expect(eventDialogs.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('vue semaine (grille horaire)', () => {
    beforeEach(() => {
      projectEvents.update((list) => [
        ...list,
        {
          ...list[0],
          id: 'allday',
          title: 'Séminaire',
          date: '2026-10-15',
          startTime: undefined,
          endTime: undefined,
          color: 'green',
        },
        { ...list[0], id: 'timed', title: 'Point', date: '2026-10-15' },
      ]);
      calendar.setView('week');
    });

    const column = (iso: string) => calendar.weekColumns().find((c) => c.day.iso === iso)!;

    it('n’a pas de colonnes en vue mois', () => {
      calendar.setView('month');

      expect(calendar.weekColumns()).toEqual([]);
    });

    it('range chaque jour : sans heure en haut, avec heure dans la grille', () => {
      const thursday = column('2026-10-15');

      expect(thursday.allDay.map((e) => e.key)).toEqual(['event:allday', 'parent:s1', 'today']);
      expect(thursday.timed.map((s) => s.event.key)).toEqual(['event:timed']);

      calendar.move(1); // semaine du 19 au 25 : l'évènement du 21
      expect(column('2026-10-21').timed.map((s) => s.event.key)).toEqual(['event:meet']);
      expect(column('2026-10-21').allDay).toEqual([]);
      expect(column('2026-10-22').timed).toEqual([]);
    });

    it('place les tâches toujours dans la bande « toute la journée »', () => {
      const allTasks = calendar
        .weekColumns()
        .flatMap((c) => c.allDay.filter((e) => e.kind !== 'event'));

      expect(allTasks.length).toBeGreaterThan(0);
      expect(
        calendar
          .weekColumns()
          .flatMap((c) => c.timed)
          .every((s) => s.event.kind === 'event'),
      ).toBe(true);
    });

    it('crée un évènement au créneau de 30 min double-cliqué', () => {
      const click = (y: number) =>
        ({
          clientY: y,
          currentTarget: { getBoundingClientRect: () => ({ top: 0 }) },
        }) as unknown as MouseEvent;

      calendar.addEventAt('2026-10-16', click(48 * 14 + 30)); // 14 h 37 → 14 h 30
      expect(eventDialogs.create).toHaveBeenLastCalledWith('2026-10-16', '14:30');

      calendar.addEventAt('2026-10-16', click(-20));
      expect(eventDialogs.create).toHaveBeenLastCalledWith('2026-10-16', '00:00');

      calendar.addEventAt('2026-10-16', click(48 * 24 + 100));
      expect(eventDialogs.create).toHaveBeenLastCalledWith('2026-10-16', '23:30');
    });

    it('affiche la grille : en-têtes, bande journée, créneaux, trait « maintenant »', async () => {
      TestBed.resetTestingModule();
      const fixture = setup();
      fixture.componentInstance.setView('week');
      await fixture.whenStable();
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelectorAll('.col-head')).toHaveLength(7);
      expect(el.querySelectorAll('.hour-label')).toHaveLength(24);
      expect(el.querySelector('.col-head.today .number')?.textContent?.trim()).toBe('15');
      expect(el.querySelectorAll('.tg-col')).toHaveLength(7);
      expect(el.querySelectorAll('.tg-col .now')).toHaveLength(1);

      const slot = el.querySelector<HTMLElement>('.slot')!;
      expect(slot.getAttribute('data-color')).toBe('violet');
      expect(slot.querySelector('.slot-time')?.textContent).toBe('14:00 – 15:00');
      // 14 h sur 24 h
      expect(parseFloat(slot.style.top)).toBeCloseTo((14 / 24) * 100, 1);

      const allDay = [...el.querySelectorAll('.allday-cell .chip')].map((c) => c.textContent);
      expect(allDay.some((t) => t?.includes('today'))).toBe(true);
      expect(el.querySelector('.weeks')).toBeNull();
    });

    it('ouvre l’évènement au clic sur son créneau', async () => {
      TestBed.resetTestingModule();
      const fixture = setup();
      fixture.componentInstance.setView('week');
      await fixture.whenStable();

      (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.slot')!.click();

      expect(eventDialogs.edit).toHaveBeenCalled();
    });
  });

  it('crée un évènement sans horaire depuis la bande « Journée »', () => {
    calendar.addAllDayEvent('2026-10-23');

    expect(eventDialogs.create).toHaveBeenLastCalledWith('2026-10-23', undefined, true);
    expect(calendar.selected()).toBe('2026-10-23');
  });
});
