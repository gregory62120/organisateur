import { Component, input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Task } from '../../core/models/task.model';
import { StorageService } from '../../core/services/storage.service';
import { TaskService } from '../../core/services/task.service';
import { ReportAnalysisComponent } from './components/report-analysis/report-analysis';
import { ReportSummariesComponent } from './components/report-summaries/report-summaries';
import { ReportsComponent } from './reports';
import { SummaryDialogService } from './services/summary-dialog.service';

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

@Component({ selector: 'app-report-analysis', template: '<p class="analysis-stub"></p>' })
class AnalysisStub {
  readonly tasks = input.required<Task[]>();
  readonly label = input.required<string>();
}

@Component({ selector: 'app-report-summaries', template: '<p class="summaries-stub"></p>' })
class SummariesStub {
  readonly defaultLabel = input('');
}

describe('ReportsComponent', () => {
  const tasks = signal<Task[]>([]);
  const storage = { isOpen: signal(true), root: signal({ name: 'Projet' }), openProject: vi.fn() };
  const dialogs = { create: vi.fn() };

  function create() {
    TestBed.configureTestingModule({
      providers: [
        { provide: TaskService, useValue: { tasksSignal: tasks.asReadonly() } },
        { provide: StorageService, useValue: storage },
        { provide: SummaryDialogService, useValue: dialogs },
      ],
    });
    TestBed.overrideComponent(ReportsComponent, {
      remove: { imports: [ReportAnalysisComponent, ReportSummariesComponent] },
      add: { imports: [AnalysisStub, SummariesStub] },
    });
    const fixture = TestBed.createComponent(ReportsComponent);
    return { fixture, cmp: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    storage.isOpen.set(true);
    tasks.set([
      task('a', { tags: ['Backend'] }),
      task('b', { tags: ['backend', 'API'], archived: true }),
      task('c', { tags: ['Frontend'] }),
    ]);
  });

  it('liste les étiquettes avec leur nombre de tâches', () => {
    const { cmp } = create();

    expect(cmp.labels()).toEqual([
      { label: 'API', count: 1 },
      { label: 'Backend', count: 2 },
      { label: 'Frontend', count: 1 },
    ]);
  });

  it('analyse toutes les tâches de l’étiquette choisie, archivées comprises', () => {
    const { cmp } = create();

    cmp.label.set('Backend');

    expect(cmp.labelTasks().map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('démarre sur l’analyse, invite à choisir une étiquette et propose celles qui existent', async () => {
    const { fixture, el, cmp } = create();
    await fixture.whenStable();

    expect(cmp.tab()).toBe('analysis');
    expect(el.querySelector('.analysis-stub')).toBeNull();
    expect(el.querySelector('.empty h2')?.textContent).toContain('Choisissez une étiquette');
    expect(el.querySelectorAll('.empty .chip')).toHaveLength(3);
    expect(el.querySelector<HTMLButtonElement>('.toolbar .btn-primary')!.disabled).toBe(true);
  });

  it('choisit une étiquette en un clic sur sa pastille puis affiche l’analyse', async () => {
    const { fixture, el, cmp } = create();
    await fixture.whenStable();

    el.querySelectorAll<HTMLElement>('.empty .chip')[1].click();
    await fixture.whenStable();

    expect(cmp.label()).toBe('Backend');
    expect(el.querySelector('.analysis-stub')).not.toBeNull();
    expect(el.querySelector('.empty')).toBeNull();
    expect(el.querySelector<HTMLButtonElement>('.toolbar .btn-primary')!.disabled).toBe(false);
  });

  it('explique comment obtenir des étiquettes quand aucune tâche n’en a', async () => {
    tasks.set([task('a', { tags: [] })]);
    const { fixture, el } = create();
    await fixture.whenStable();

    expect(el.querySelector('.empty h2')?.textContent).toContain('Aucune étiquette');
    expect(el.querySelectorAll('.empty .chip')).toHaveLength(0);
  });

  it('rédige un résumé de l’étiquette analysée, et rien sans étiquette', () => {
    const { cmp } = create();

    cmp.writeSummary();
    expect(dialogs.create).not.toHaveBeenCalled();

    cmp.label.set('Backend');
    cmp.writeSummary();
    expect(dialogs.create).toHaveBeenCalledWith('Backend');
  });

  it('bascule vers les résumés en gardant l’étiquette choisie par défaut', async () => {
    const { fixture, el, cmp } = create();
    await fixture.whenStable();
    cmp.label.set('Frontend');

    el.querySelectorAll<HTMLElement>('.tabs button')[1].click();
    await fixture.whenStable();

    expect(cmp.tab()).toBe('summaries');
    expect(el.querySelector('.summaries-stub')).not.toBeNull();
    expect(el.querySelector('.toolbar')).toBeNull();
    expect(el.querySelectorAll('.tabs button')[1].getAttribute('aria-selected')).toBe('true');
  });

  it('invite à ouvrir un projet quand aucun n’est ouvert', async () => {
    storage.isOpen.set(false);
    const { fixture, el } = create();
    await fixture.whenStable();

    expect(el.querySelector('.empty-state')).not.toBeNull();
    expect(el.querySelector('.tabs')).toBeNull();
  });
});
