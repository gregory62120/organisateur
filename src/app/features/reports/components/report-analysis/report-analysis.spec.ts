import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ReportSnapshot } from '../../../../core/models/report-snapshot.model';
import { Task } from '../../../../core/models/task.model';
import { ReportChartsComponent } from '../report-charts/report-charts';
import { ReportAnalysisComponent } from './report-analysis';

/** Les graphiques ont leurs propres tests : ici on vérifie seulement qu'on leur transmet l'instantané. */
@Component({ selector: 'app-report-charts', template: '<p class="charts-stub"></p>' })
class ChartsStub {
  readonly snapshot = input.required<ReportSnapshot>();
}

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

describe('ReportAnalysisComponent', () => {
  const tasks = [
    task('fait-recent', {
      status: 'DONE',
      completedAt: '2026-10-20T09:00:00.000Z',
      assignedTo: 'Sophie',
    }),
    task('fait-ancien', {
      status: 'DONE',
      completedAt: '2026-10-05T09:00:00.000Z',
      assignedTo: 'Sophie',
    }),
    task('ouvert-tard', { status: 'IN_PROGRESS', dueDate: '2026-12-01', assignedTo: 'Léo' }),
    task('ouvert-tot', { dueDate: '2026-11-01' }),
    task('sans-echeance', { status: 'VALIDATION', archived: true }),
  ];

  function create(list: Task[] = tasks, label = 'Backend') {
    TestBed.overrideComponent(ReportAnalysisComponent, {
      remove: { imports: [ReportChartsComponent] },
      add: { imports: [ChartsStub] },
    });
    const fixture = TestBed.createComponent(ReportAnalysisComponent);
    fixture.componentRef.setInput('tasks', list);
    fixture.componentRef.setInput('label', label);
    return { fixture, cmp: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  it('résume les tâches par statut dans les chiffres clés', () => {
    const { cmp } = create();

    const kpi = (label: string) => cmp.kpis().find((k) => k.label === label);
    expect(kpi('Tâches')?.value).toBe(5);
    expect(kpi('Terminées')).toMatchObject({ value: 2, hint: '40 %' });
    expect(kpi('En cours')?.value).toBe(1);
    expect(kpi('En revue')?.value).toBe(1);
    expect(kpi('À faire')?.value).toBe(1);
  });

  it('affiche des tirets quand une durée ou des sous-tâches n’existent pas', () => {
    const { cmp } = create([task('a')]);

    expect(cmp.kpis().find((k) => k.label === 'Durée moyenne')?.value).toBe('—');
    expect(cmp.kpis().find((k) => k.label === 'Sous-tâches')?.value).toBe('—');
  });

  it('calcule l’instantané des graphiques avec les tâches de l’étiquette', () => {
    const { cmp } = create();

    expect(cmp.snapshot().status).toEqual({ todo: 1, inProgress: 1, validation: 1, done: 2 });
    expect(cmp.snapshot().assignees.map((a) => a.name)).toEqual(['Sophie', 'Léo', 'Non assigné']);
  });

  it('liste les tâches ouvertes par échéance puis les terminées, la plus récente en tête', () => {
    const { cmp } = create();

    expect(cmp.rows().map((r) => r.task.id)).toEqual([
      'ouvert-tot',
      'ouvert-tard',
      'sans-echeance',
      'fait-recent',
      'fait-ancien',
    ]);
  });

  it('affiche les chiffres clés, les graphiques et le tableau avec les tâches archivées signalées', async () => {
    const { fixture, el } = create();
    await fixture.whenStable();

    const rows = [...el.querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(5);
    expect(rows[2].textContent).toContain('archivée');
    expect(rows[3].textContent).toContain('Terminé');
    expect(el.querySelector('.table-card h2')?.textContent).toContain('Backend');
    expect(el.querySelectorAll('.kpi')).toHaveLength(8);
    expect(el.querySelectorAll('.charts-stub')).toHaveLength(1);
  });

  it('formate la date de fin', () => {
    const { cmp } = create();

    expect(cmp.doneLabel(null)).toBe('');
    expect(cmp.doneLabel(new Date('2026-10-20T12:00:00.000Z'))).toContain('20');
  });
});
