import { Dialog } from '@angular/cdk/dialog';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Summary } from '../../../core/models/summary.model';
import { Task } from '../../../core/models/task.model';
import { SummaryService } from '../../../core/services/summary.service';
import { TaskService } from '../../../core/services/task.service';
import { SummaryDialogComponent } from '../components/summary-dialog/summary-dialog';
import { SummaryDialogService } from './summary-dialog.service';

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

describe('SummaryDialogService', () => {
  const dialog = { open: vi.fn() };
  const tasks = signal<Task[]>([]);
  let service: SummaryDialogService;

  beforeEach(() => {
    vi.clearAllMocks();
    tasks.set([task('a', { status: 'DONE' }), task('b'), task('c', { tags: ['Frontend'] })]);
    TestBed.configureTestingModule({
      providers: [
        { provide: Dialog, useValue: dialog },
        { provide: TaskService, useValue: { tasksSignal: tasks.asReadonly() } },
        {
          provide: SummaryService,
          useValue: {
            createEmpty: (label: string, stats: unknown, content = '', snapshot?: unknown) =>
              ({ id: 'new', title: `Résumé ${label}`, label, stats, content, snapshot }) as Summary,
          },
        },
      ],
    });
    service = TestBed.inject(SummaryDialogService);
  });

  it('crée un résumé d’étiquette avec ses chiffres et un brouillon', () => {
    service.create('Backend');

    expect(dialog.open).toHaveBeenCalledWith(
      SummaryDialogComponent,
      expect.objectContaining({ panelClass: 'tf-dialog-panel' }),
    );
    const data = dialog.open.mock.calls[0][1].data;
    expect(data.isNew).toBe(true);
    expect(data.summary.label).toBe('Backend');
    expect(data.summary.stats).toMatchObject({ total: 2, done: 1, completionRate: 50 });
    expect(data.summary.content).toContain('Résumé « Backend »');
  });

  it('fige les graphiques de l’étiquette dans le nouveau résumé', () => {
    service.create('Backend');

    const snapshot = dialog.open.mock.calls[0][1].data.summary.snapshot;
    expect(snapshot.status).toEqual({ todo: 1, inProgress: 0, validation: 0, done: 1 });
    expect(snapshot.assignees).toHaveLength(1);
  });

  it('crée un résumé sans étiquette, vide, sans chiffres', () => {
    service.create();

    const data = dialog.open.mock.calls[0][1].data;
    expect(data.summary.content).toBe('');
    expect(data.summary.stats.total).toBe(0);
  });

  it('ouvre un résumé existant en lecture, ou directement en modification', () => {
    const summary = { id: 's1' } as Summary;

    service.show(summary);
    expect(dialog.open.mock.calls[0][1].data).toEqual({ summary, isNew: false, editing: false });

    service.show(summary, true);
    expect(dialog.open.mock.calls[1][1].data).toEqual({ summary, isNew: false, editing: true });
  });
});
