import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CHART_KEYS } from '../models/report-snapshot.model';
import { Summary, SummaryStats } from '../models/summary.model';
import { buildSnapshot } from './report';
import { StorageService } from './storage.service';
import { SummaryService } from './summary.service';

const stats: SummaryStats = {
  total: 4,
  todo: 1,
  inProgress: 1,
  validation: 0,
  done: 2,
  overdue: 0,
  archived: 0,
  completionRate: 50,
  subtasksDone: 0,
  subtasksTotal: 0,
  averageDays: null,
};

describe('SummaryService', () => {
  let service: SummaryService;
  let files: Map<string, string>;
  const saved = (): Summary[] => JSON.parse(files.get('summaries.json') ?? '[]');

  beforeEach(() => {
    files = new Map();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: StorageService,
          useValue: {
            isOpen: signal(true),
            projectOpened: signal(0),
            write: async (path: string, content: string) => void files.set(path, content),
            read: async (path: string) => {
              if (!files.has(path)) throw new DOMException('absent', 'NotFoundError');
              return files.get(path);
            },
          },
        },
      ],
    });
    service = TestBed.inject(SummaryService);
  });

  it('crée un résumé vide sur une étiquette, avec ses chiffres', () => {
    const summary = service.createEmpty('Backend', stats, '<p>x</p>');

    expect(summary).toMatchObject({
      title: 'Résumé Backend',
      label: 'Backend',
      content: '<p>x</p>',
      stats,
    });
    expect(summary.id).toBeTruthy();
    expect(service.createEmpty('', stats).title).toBe('Nouveau résumé');
  });

  it('enregistre un résumé dans summaries.json', async () => {
    await service.add(service.createEmpty('Backend', stats));

    expect(saved()).toHaveLength(1);
    expect(saved()[0].label).toBe('Backend');
  });

  it('modifie un résumé sans toucher aux autres, et met à jour la date de modification', async () => {
    const a = { ...service.createEmpty('A', stats), updatedAt: '2020-01-01T00:00:00.000Z' };
    await service.add(a);
    await service.add(service.createEmpty('B', stats));

    await service.update({ ...a, title: 'Nouveau titre' });

    expect(saved()[0].title).toBe('Nouveau titre');
    expect(saved()[0].updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
    expect(saved()[0].createdAt).toBe(a.createdAt);
    expect(saved()[1].label).toBe('B');
  });

  it('supprime un résumé', async () => {
    const a = service.createEmpty('A', stats);
    await service.add(a);
    await service.add(service.createEmpty('B', stats));

    await service.delete(a.id);

    expect(saved().map((s) => s.label)).toEqual(['B']);
  });

  it('charge les résumés du fichier, ou repart de zéro s’il est absent', async () => {
    files.set('summaries.json', JSON.stringify([service.createEmpty('A', stats)]));
    await service.load();
    expect(service.summaries()).toHaveLength(1);

    files.delete('summaries.json');
    await service.load();
    expect(service.summaries()).toEqual([]);
  });

  it('n’écrase pas un summaries.json illisible', async () => {
    files.set('summaries.json', '{pas du json');
    await service.load();

    await service.add(service.createEmpty('A', stats));

    expect(service.error()).toContain('summaries.json est illisible');
    expect(files.get('summaries.json')).toBe('{pas du json');
  });

  it('remplace les résumés en mémoire sans écrire', () => {
    service.updateSummaries([service.createEmpty('A', stats)]);

    expect(service.summaries()).toHaveLength(1);
    expect(files.has('summaries.json')).toBe(false);
  });

  it('inclut tous les graphiques par défaut quand un instantané est fourni', () => {
    const snapshot = buildSnapshot([], new Date(2026, 9, 30));

    const summary = service.createEmpty('Backend', stats, '', snapshot);

    expect(summary.snapshot).toBe(snapshot);
    expect(summary.charts).toEqual(CHART_KEYS);
    expect(summary.charts).not.toBe(CHART_KEYS);
  });

  it('n’a ni instantané ni graphiques sans instantané', () => {
    const summary = service.createEmpty('Backend', stats);

    expect(summary.snapshot).toBeUndefined();
    expect(summary.charts).toBeUndefined();
  });

  it('conserve les graphiques et leurs chiffres à l’enregistrement', async () => {
    const snapshot = buildSnapshot([], new Date(2026, 9, 30));
    await service.add({ ...service.createEmpty('A', stats, '', snapshot), charts: ['burnup'] });

    expect(saved()[0].charts).toEqual(['burnup']);
    expect(saved()[0].snapshot).toEqual(snapshot);
  });
});
