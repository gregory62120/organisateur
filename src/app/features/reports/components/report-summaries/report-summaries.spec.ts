import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Summary } from '../../../../core/models/summary.model';
import { buildSnapshot } from '../../../../core/services/report';
import { SummaryService } from '../../../../core/services/summary.service';
import { SummaryDialogService } from '../../services/summary-dialog.service';
import { plainText, ReportSummariesComponent } from './report-summaries';

const stats = {
  total: 4,
  todo: 1,
  inProgress: 1,
  validation: 0,
  done: 2,
  overdue: 1,
  archived: 0,
  completionRate: 50,
  subtasksDone: 0,
  subtasksTotal: 0,
  averageDays: null,
};

const summary = (id: string, overrides: Partial<Summary> = {}): Summary => ({
  id,
  title: `Résumé ${id}`,
  label: 'Backend',
  content: `<p>Texte ${id}</p>`,
  stats,
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
  ...overrides,
});

describe('plainText', () => {
  it('extrait le texte sans balises ni espaces superflus', () => {
    expect(plainText('<h2>Titre</h2><p>Un   <strong>mot</strong>\n gras</p>')).toBe(
      'Titre Un mot gras',
    );
  });

  it('ne laisse passer aucun script', () => {
    expect(plainText('<p>ok</p><script>alert(1)</script>')).not.toContain('<');
  });

  it('sépare les paragraphes, titres, listes et retours à la ligne', () => {
    expect(plainText('<h2>Résumé 2026</h2><p>1 tâche</p><ul><li>a</li><li>b</li></ul>c<br>d')).toBe(
      'Résumé 2026 1 tâche a b c d',
    );
  });

  it('gère un contenu vide', () => {
    expect(plainText('')).toBe('');
  });
});

describe('ReportSummariesComponent', () => {
  const summaries = signal<Summary[]>([]);
  const service = { summaries, delete: vi.fn() };
  const dialogs = { create: vi.fn(), show: vi.fn() };

  function create(defaultLabel = '') {
    TestBed.configureTestingModule({
      providers: [
        { provide: SummaryService, useValue: service },
        { provide: SummaryDialogService, useValue: dialogs },
      ],
    });
    const fixture = TestBed.createComponent(ReportSummariesComponent);
    fixture.componentRef.setInput('defaultLabel', defaultLabel);
    return { fixture, cmp: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    summaries.set([
      summary('ancien', { updatedAt: '2026-10-01T09:00:00.000Z' }),
      summary('recent', { updatedAt: '2026-10-20T09:00:00.000Z', label: 'Frontend' }),
      summary('milieu', {
        updatedAt: '2026-10-10T09:00:00.000Z',
        title: 'Bilan migration',
        content: '<p>La base de données est migrée</p>',
      }),
    ]);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('liste les résumés du plus récemment modifié au plus ancien', () => {
    const { cmp } = create();

    expect(cmp.items().map((i) => i.summary.id)).toEqual(['recent', 'milieu', 'ancien']);
    expect(cmp.total()).toBe(3);
    expect(cmp.labels()).toEqual(['Backend', 'Frontend']);
  });

  it('recherche dans le titre, l’étiquette et le texte, sans tenir compte de la casse', () => {
    const { cmp } = create();

    cmp.search.set('MIGRATION');
    expect(cmp.items().map((i) => i.summary.id)).toEqual(['milieu']);

    cmp.search.set('données');
    expect(cmp.items().map((i) => i.summary.id)).toEqual(['milieu']);

    cmp.search.set('frontend');
    expect(cmp.items().map((i) => i.summary.id)).toEqual(['recent']);
  });

  it('filtre par étiquette, combine avec la recherche et se réinitialise', () => {
    const { cmp } = create();

    cmp.labelFilter.set('Backend');
    expect(cmp.items().map((i) => i.summary.id)).toEqual(['milieu', 'ancien']);

    cmp.search.set('ancien');
    expect(cmp.items().map((i) => i.summary.id)).toEqual(['ancien']);
    expect(cmp.hasFilter()).toBe(true);

    cmp.resetFilters();
    expect(cmp.items()).toHaveLength(3);
    expect(cmp.hasFilter()).toBe(false);
  });

  it('résume chaque texte en un extrait court', () => {
    summaries.set([summary('long', { content: `<p>${'mot '.repeat(100)}</p>` })]);
    const { cmp } = create();

    const { excerpt } = cmp.items()[0];

    expect(excerpt.length).toBeLessThanOrEqual(191);
    expect(excerpt.endsWith('…')).toBe(true);
  });

  it('affiche les cartes avec leurs chiffres, et signale les retards', async () => {
    const { fixture, el } = create();
    await fixture.whenStable();

    const cards = el.querySelectorAll('.summary');
    expect(cards).toHaveLength(3);
    expect(cards[0].textContent).toContain('Résumé recent');
    expect(cards[0].textContent).toContain('Frontend');
    expect(cards[0].textContent).toContain('2/4 terminées (50 %)');
    expect(cards[0].textContent).toContain('1 en retard');
  });

  it('invite à rédiger un premier résumé, ou signale l’absence de résultat', async () => {
    summaries.set([]);
    const { fixture, el, cmp } = create();
    await fixture.whenStable();
    expect(el.querySelector('.empty')?.textContent).toContain('Aucun résumé pour le moment');

    summaries.set([summary('a')]);
    cmp.search.set('zzz');
    await fixture.whenStable();
    expect(el.querySelector('.empty')?.textContent).toContain('Aucun résumé ne correspond');
  });

  describe('actions', () => {
    it('crée un résumé avec l’étiquette analysée par défaut', async () => {
      const { fixture, el } = create('Backend');
      await fixture.whenStable();

      el.querySelector<HTMLButtonElement>('.bar .btn-primary')!.click();

      expect(dialogs.create).toHaveBeenCalledWith('Backend');
    });

    it('consulte un résumé au clic sur sa carte', async () => {
      const { fixture, el } = create();
      await fixture.whenStable();

      el.querySelector<HTMLElement>('.summary')!.click();

      expect(dialogs.show).toHaveBeenCalledWith(expect.objectContaining({ id: 'recent' }));
    });

    it('modifie un résumé sans passer par la lecture', async () => {
      const { fixture, el } = create();
      await fixture.whenStable();

      el.querySelector<HTMLElement>('.summary .actions button[title="Modifier"]')!.click();

      expect(dialogs.show).toHaveBeenCalledTimes(1);
      expect(dialogs.show).toHaveBeenCalledWith(expect.objectContaining({ id: 'recent' }), true);
    });

    it('supprime après confirmation, sans ouvrir le résumé', async () => {
      const { fixture, el } = create();
      await fixture.whenStable();

      el.querySelector<HTMLElement>('.summary .actions button[title="Supprimer"]')!.click();

      expect(service.delete).toHaveBeenCalledWith('recent');
      expect(dialogs.show).not.toHaveBeenCalled();
    });

    it('ne supprime pas si la confirmation est refusée', async () => {
      vi.stubGlobal(
        'confirm',
        vi.fn(() => false),
      );
      const { fixture, el } = create();
      await fixture.whenStable();

      el.querySelector<HTMLElement>('.summary .actions button[title="Supprimer"]')!.click();

      expect(service.delete).not.toHaveBeenCalled();
    });
  });

  describe('ReportSummariesComponent - graphiques', () => {
    it('indique le nombre de graphiques inclus dans un résumé, et rien sinon', async () => {
      const summaries = signal<Summary[]>([
        {
          ...summary('avec'),
          snapshot: buildSnapshot([], new Date(2026, 9, 30)),
          charts: ['burnup', 'activity', 'status'],
        },
        summary('ancien'),
        {
          ...summary('un-seul'),
          snapshot: buildSnapshot([], new Date(2026, 9, 30)),
          charts: ['burnup'],
        },
        { ...summary('aucun'), snapshot: buildSnapshot([], new Date(2026, 9, 30)), charts: [] },
      ]);
      TestBed.configureTestingModule({
        providers: [
          { provide: SummaryService, useValue: { summaries, delete: vi.fn() } },
          { provide: SummaryDialogService, useValue: { create: vi.fn(), show: vi.fn() } },
        ],
      });
      const fixture = TestBed.createComponent(ReportSummariesComponent);
      await fixture.whenStable();

      const chips = (title: string) =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll('.summary')]
          .find((c) => c.textContent?.includes(title))
          ?.querySelector('.charts-count')
          ?.textContent?.trim();
      expect(chips('Résumé avec')).toContain('3 graphiques');
      expect(chips('Résumé un-seul')).toContain('1 graphique');
      expect(chips('Résumé un-seul')).not.toContain('graphiques');
      expect(chips('Résumé ancien')).toBeUndefined();
      expect(chips('Résumé aucun')).toBeUndefined();
    });
  });
});
