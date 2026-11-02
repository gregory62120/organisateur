import { Task } from '../models/task.model';
import {
  activityGrid,
  buildSnapshot,
  burnup,
  byAssignee,
  byPriority,
  completionDate,
  cycleTimes,
  draftHtml,
  labelsOf,
  movingAverage,
  reportStats,
  tasksWithLabel,
  timeline,
  upcomingLoad,
} from './report';

function makeTask(id: string, overrides: Partial<Task> = {}): Task {
  return {
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
  };
}

describe('report', () => {
  const now = new Date(2026, 9, 30, 12, 0);

  describe('labelsOf', () => {
    it('liste les étiquettes avec leur nombre de tâches, triées', () => {
      const labels = labelsOf([
        makeTask('a', { tags: ['Frontend', 'Backend'] }),
        makeTask('b', { tags: ['backend'] }),
        makeTask('c', { tags: [] }),
        makeTask('d', { tags: undefined }),
      ]);

      expect(labels).toEqual([
        { label: 'Backend', count: 2 },
        { label: 'Frontend', count: 1 },
      ]);
    });

    it('ignore les étiquettes vides', () => {
      expect(labelsOf([makeTask('a', { tags: ['  ', ''] })])).toEqual([]);
    });
  });

  describe('tasksWithLabel', () => {
    const tasks = [
      makeTask('a', { tags: ['Backend'] }),
      makeTask('b', { tags: ['Frontend'] }),
      makeTask('c', { tags: ['backend ', 'API'], archived: true }),
      makeTask('d', { tags: undefined }),
    ];

    it('garde les tâches portant l’étiquette, sans tenir compte de la casse ni des espaces, archivées comprises', () => {
      expect(tasksWithLabel(tasks, ' BACKEND ').map((t) => t.id)).toEqual(['a', 'c']);
    });

    it('ne renvoie rien sans étiquette ou pour une étiquette inconnue', () => {
      expect(tasksWithLabel(tasks, '')).toEqual([]);
      expect(tasksWithLabel(tasks, 'Inconnue')).toEqual([]);
    });
  });

  describe('completionDate', () => {
    it('utilise la date de fin, sinon la dernière modification, et ignore les tâches non terminées', () => {
      expect(
        completionDate(
          makeTask('a', { status: 'DONE', completedAt: '2026-10-05T10:00:00.000Z' }),
        )?.toISOString(),
      ).toBe('2026-10-05T10:00:00.000Z');
      expect(
        completionDate(
          makeTask('b', { status: 'DONE', updatedAt: '2026-10-07T10:00:00.000Z' }),
        )?.toISOString(),
      ).toBe('2026-10-07T10:00:00.000Z');
      expect(completionDate(makeTask('c'))).toBeNull();
      expect(completionDate(makeTask('d', { status: 'DONE', updatedAt: 'abc' }))).toBeNull();
    });
  });

  describe('reportStats', () => {
    it('compte les tâches par statut, les retards, les archivées et le taux de réalisation', () => {
      const stats = reportStats(
        [
          makeTask('a', { status: 'DONE' }),
          makeTask('b', { status: 'IN_PROGRESS', dueDate: '2026-10-10' }),
          makeTask('c', { status: 'VALIDATION' }),
          makeTask('d', { status: 'TODO', archived: true }),
        ],
        now,
      );

      expect(stats).toMatchObject({
        total: 4,
        done: 1,
        inProgress: 1,
        validation: 1,
        todo: 1,
        overdue: 1,
        archived: 1,
        completionRate: 25,
      });
    });

    it('compte les sous-tâches', () => {
      const stats = reportStats(
        [
          makeTask('a', {
            checklist: [
              { id: '1', label: 'x', completed: true },
              { id: '2', label: 'y', completed: false },
            ],
          }),
          makeTask('b', { checklist: [{ id: '3', label: 'z', completed: true }] }),
        ],
        now,
      );

      expect([stats.subtasksDone, stats.subtasksTotal]).toEqual([2, 3]);
    });

    it('calcule la durée moyenne de réalisation des tâches terminées', () => {
      const stats = reportStats(
        [
          makeTask('a', { status: 'DONE', completedAt: '2026-10-03T09:00:00.000Z' }), // 2 jours
          makeTask('b', { status: 'DONE', completedAt: '2026-10-06T09:00:00.000Z' }), // 5 jours
          makeTask('c', { status: 'TODO' }),
        ],
        now,
      );

      expect(stats.averageDays).toBe(3.5);
    });

    it('n’a pas de durée moyenne sans tâche terminée, ni de taux sans tâche', () => {
      expect(reportStats([makeTask('a')], now).averageDays).toBeNull();
      expect(reportStats([], now)).toMatchObject({
        total: 0,
        completionRate: 0,
        averageDays: null,
      });
    });

    it('ignore une date de fin antérieure à la création', () => {
      const stats = reportStats(
        [makeTask('a', { status: 'DONE', completedAt: '2026-09-01T09:00:00.000Z' })],
        now,
      );

      expect(stats.averageDays).toBeNull();
    });
  });

  describe('timeline', () => {
    it('est vide sans tâche', () => {
      expect(timeline([], now).labels).toEqual([]);
    });

    it('découpe par semaine, du lundi de la première création à aujourd’hui, sur au moins 6 semaines', () => {
      const result = timeline(
        [
          makeTask('a', { createdAt: '2026-10-05T09:00:00.000Z' }), // lundi 5 oct.
          makeTask('b', { createdAt: '2026-10-07T09:00:00.000Z' }),
          makeTask('c', {
            createdAt: '2026-10-14T09:00:00.000Z',
            status: 'DONE',
            completedAt: '2026-10-28T09:00:00.000Z',
          }),
        ],
        now,
      );

      expect(result.unit).toBe('week');
      // Semaines du 21 sept. au 26 oct. : 6 semaines, les deux premières sont vides.
      expect(result.labels).toHaveLength(6);
      expect(result.created).toEqual([0, 0, 2, 1, 0, 0]);
      expect(result.completed).toEqual([0, 0, 0, 0, 0, 1]);
      expect(result.cumulativeCreated).toEqual([0, 0, 2, 3, 3, 3]);
      expect(result.cumulativeCompleted).toEqual([0, 0, 0, 0, 0, 1]);
      expect(result.open).toEqual([0, 0, 2, 3, 3, 2]);
    });

    it('affiche au moins 6 semaines même quand tout vient d’être créé, pour que la courbe ait un début', () => {
      const result = timeline(
        [
          makeTask('a', { createdAt: '2026-10-29T09:00:00.000Z' }),
          makeTask('b', { createdAt: '2026-10-30T09:00:00.000Z' }),
        ],
        now,
      );

      expect(result.labels).toHaveLength(6);
      expect(result.open).toEqual([0, 0, 0, 0, 0, 2]);
    });

    it('étiquette chaque semaine par son lundi, y compris après un changement d’heure', () => {
      const result = timeline(
        [makeTask('a', { createdAt: '2026-08-31T09:00:00.000Z' })],
        new Date(2026, 9, 30, 12, 0),
      );

      // Le lundi 26 octobre vient après le passage à l'heure d'hiver (25 octobre) : une addition de
      // millisecondes l'afficherait « 25 oct. ».
      const monday = new Date(2026, 7, 31);
      const expected = result.labels.map((_, i) =>
        new Date(
          monday.getFullYear(),
          monday.getMonth(),
          monday.getDate() + 7 * i,
        ).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      );
      expect(result.labels).toEqual(expected);
      expect(result.labels.at(-1)).toBe(
        new Date(2026, 9, 26).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      );
    });

    it('garde la semaine en cours quand la période traverse le passage à l’heure d’été', () => {
      // Du 2 février au 20 avril 2026 : le 29 mars, une semaine ne dure que 167 heures.
      const result = timeline(
        [
          makeTask('a', { createdAt: '2026-02-02T09:00:00.000Z' }),
          makeTask('b', { createdAt: '2026-04-20T09:00:00.000Z' }),
        ],
        new Date(2026, 3, 20, 12, 0),
      );

      expect(result.unit).toBe('week');
      expect(result.labels).toHaveLength(12);
      expect(result.created.at(-1)).toBe(1);
    });

    it('bascule par mois quand la période dépasse 26 semaines', () => {
      const result = timeline(
        [
          makeTask('a', { createdAt: '2026-01-10T09:00:00.000Z' }),
          makeTask('b', { createdAt: '2026-10-02T09:00:00.000Z' }),
        ],
        now,
      );

      expect(result.unit).toBe('month');
      expect(result.labels).toHaveLength(10);
      expect(result.created[0]).toBe(1);
      expect(result.created[9]).toBe(1);
      expect(result.open[9]).toBe(2);
    });

    it('compte une fin antérieure à la création dans la semaine de la création, sans charge négative', () => {
      const result = timeline(
        [
          makeTask('a', {
            createdAt: '2026-10-20T09:00:00.000Z',
            status: 'DONE',
            completedAt: '2026-10-01T09:00:00.000Z',
          }),
        ],
        now,
      );

      // La semaine du 19 octobre est l'avant-dernière des 6 semaines.
      expect(result.created).toEqual([0, 0, 0, 0, 1, 0]);
      expect(result.completed).toEqual([0, 0, 0, 0, 1, 0]);
      expect(result.open.every((n) => n >= 0)).toBe(true);
    });

    it('ne compte pas les tâches non terminées dans les fins', () => {
      const result = timeline([makeTask('a', { status: 'IN_PROGRESS' })], now);

      expect(result.completed.every((n) => n === 0)).toBe(true);
    });
  });

  describe('byAssignee', () => {
    it('compte les tâches par statut, trie par charge et met « Non assigné » en dernier', () => {
      const result = byAssignee([
        makeTask('a', { assignedTo: 'Sophie', status: 'DONE' }),
        makeTask('b', { assignedTo: 'Sophie' }),
        makeTask('c', { assignedTo: 'Léo', status: 'IN_PROGRESS' }),
        makeTask('d'),
        makeTask('e', { status: 'VALIDATION' }),
        makeTask('f', { assignedTo: ' Sophie ', status: 'IN_PROGRESS' }),
      ]);

      expect(result).toEqual([
        { name: 'Sophie', todo: 1, inProgress: 1, validation: 0, done: 1 },
        { name: 'Léo', todo: 0, inProgress: 1, validation: 0, done: 0 },
        { name: 'Non assigné', todo: 1, inProgress: 0, validation: 1, done: 0 },
      ]);
    });

    it('est vide sans tâche', () => {
      expect(byAssignee([])).toEqual([]);
    });
  });

  describe('byPriority', () => {
    it('donne les trois priorités par statut, de la plus haute à la plus basse', () => {
      const result = byPriority([
        makeTask('a', { priority: 'HIGH', status: 'DONE' }),
        makeTask('b', { priority: 'HIGH', status: 'IN_PROGRESS' }),
        makeTask('c', { priority: 'LOW' }),
      ]);

      expect(result).toEqual([
        { priority: 'HIGH', todo: 0, inProgress: 1, validation: 0, done: 1 },
        { priority: 'MEDIUM', todo: 0, inProgress: 0, validation: 0, done: 0 },
        { priority: 'LOW', todo: 1, inProgress: 0, validation: 0, done: 0 },
      ]);
    });
  });

  describe('draftHtml', () => {
    const date = new Date(2026, 9, 30);

    it('résume l’avancement, la répartition et les points d’attention', () => {
      const html = draftHtml(
        'Backend',
        reportStats(
          [
            makeTask('a', { status: 'DONE', completedAt: '2026-10-03T09:00:00.000Z' }),
            makeTask('b', { status: 'IN_PROGRESS', dueDate: '2026-10-10' }),
            makeTask('c', {
              checklist: [
                { id: '1', label: 'x', completed: true },
                { id: '2', label: 'y', completed: false },
              ],
            }),
          ],
          date,
        ),
        date,
      );

      expect(html).toContain('<h2>Résumé « Backend » au 30 octobre 2026</h2>');
      expect(html).toContain('1 tâche terminée sur 3 (33 %), 2 restantes.');
      expect(html).toContain('<li>En cours : 1</li>');
      expect(html).toContain('1 tâche en retard');
      expect(html).toContain('sous-tâches : 1/2 terminées');
      expect(html).toContain('durée moyenne de réalisation : 2 j');
    });

    it('accorde les pluriels', () => {
      const html = draftHtml(
        'X',
        reportStats([makeTask('a', { status: 'DONE' }), makeTask('b', { status: 'DONE' })], date),
        date,
      );

      expect(html).toContain('2 tâches terminées sur 2 (100 %), 0 restante.');
    });

    it('signale une étiquette sans tâche', () => {
      const html = draftHtml('Vide', reportStats([], date), date);

      expect(html).toContain('Aucune tâche pour cette étiquette.');
      expect(html).not.toContain('<ul>');
    });

    it('protège le HTML dans l’étiquette', () => {
      const html = draftHtml('<script>alert(1)</script>', reportStats([], date), date);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('burnup', () => {
    const at = (iso: string) => `${iso}T09:00:00.000Z`;

    it('est vide sans tâche', () => {
      expect(burnup([], now)).toMatchObject({ labels: [], scope: [], done: [], periodsLeft: null });
    });

    it('cumule le périmètre et l’avancement semaine par semaine', () => {
      const result = burnup(
        [
          makeTask('a', {
            createdAt: at('2026-10-05'),
            status: 'DONE',
            completedAt: at('2026-10-08'),
          }),
          makeTask('b', { createdAt: at('2026-10-12') }),
          makeTask('c', {
            createdAt: at('2026-10-14'),
            status: 'DONE',
            completedAt: at('2026-10-21'),
          }),
        ],
        now,
      );

      // Semaines du 21 sept. au 26 oct.
      expect(result.scope).toEqual([0, 0, 1, 3, 3, 3]);
      expect(result.done).toEqual([0, 0, 1, 1, 2, 2]);
      expect(result.remaining).toBe(1);
    });

    it('prolonge le rythme moyen des 4 dernières semaines complètes jusqu’à rattraper le périmètre', () => {
      // 8 tâches créées le 21 sept. dont 4 terminées, une par semaine complète : il en reste 4,
      // soit 4 semaines au rythme d'une par semaine.
      const done = (day: string) => ({
        status: 'DONE' as const,
        createdAt: at('2026-09-21'),
        completedAt: at(day),
      });
      const result = burnup(
        [
          makeTask('a', done('2026-09-29')),
          makeTask('b', done('2026-10-06')),
          makeTask('c', done('2026-10-13')),
          makeTask('d', done('2026-10-20')),
          ...['e', 'f', 'g', 'h'].map((id) => makeTask(id, { createdAt: at('2026-09-21') })),
        ],
        now,
      );

      expect(result.rate).toBe(1);
      expect(result.periodsLeft).toBe(4);
      expect(result.forecast).toEqual([5, 6, 7, 8]);
      // 6 semaines écoulées (21 sept. au 26 oct.), puis 4 semaines de prévision.
      expect(result.labels).toHaveLength(6 + 4);
      expect(result.endLabel).toContain('semaine du');
    });

    it('n’inclut pas la semaine en cours dans le rythme, même vide', () => {
      // Une tâche terminée par semaine pendant 3 semaines complètes, rien (encore) cette semaine.
      const done = (day: string) => ({
        status: 'DONE' as const,
        createdAt: at('2026-10-01'),
        completedAt: at(day),
      });
      const result = burnup(
        [
          makeTask('a', done('2026-10-08')),
          makeTask('b', done('2026-10-15')),
          makeTask('c', done('2026-10-22')),
          makeTask('d', { createdAt: at('2026-10-01') }),
        ],
        now,
      );

      expect(result.rate).toBe(0.8);
      expect(result.periodsLeft).toBe(2);
    });

    it('n’estime pas la fin quand rien n’a été terminé récemment', () => {
      const result = burnup([makeTask('a', { createdAt: at('2026-10-05') })], now);

      expect(result.rate).toBe(0);
      expect(result.periodsLeft).toBeNull();
      expect(result.forecast).toEqual([]);
      expect(result.endLabel).toBeNull();
    });

    it('signale que tout est terminé, sans prévision', () => {
      const result = burnup(
        [
          makeTask('a', {
            createdAt: at('2026-10-05'),
            status: 'DONE',
            completedAt: at('2026-10-20'),
          }),
        ],
        now,
      );

      expect(result.periodsLeft).toBe(0);
      expect(result.remaining).toBe(0);
      expect(result.forecast).toEqual([]);
    });

    it('limite la prévision dessinée à 12 périodes, mais estime la fin même plus loin', () => {
      const result = burnup(
        [
          makeTask('a', {
            createdAt: at('2026-10-01'),
            status: 'DONE',
            completedAt: at('2026-10-20'),
          }),
          ...Array.from({ length: 40 }, (_, i) =>
            makeTask(`t${i}`, { createdAt: at('2026-10-01') }),
          ),
        ],
        now,
      );

      expect(result.forecast).toHaveLength(12);
      expect(result.periodsLeft).toBeGreaterThan(12);
      expect(result.endLabel).not.toBeNull();
    });

    it('ne dépasse jamais le périmètre dans la prévision', () => {
      // 9 tâches, 8 terminées au rythme de 2 par semaine : sans plafond, la prévision irait à 10.
      const done = (id: string, day: string) =>
        makeTask(id, { createdAt: at('2026-09-21'), status: 'DONE', completedAt: at(day) });
      const result = burnup(
        [
          done('a', '2026-09-29'),
          done('b', '2026-09-30'),
          done('c', '2026-10-06'),
          done('d', '2026-10-07'),
          done('e', '2026-10-13'),
          done('f', '2026-10-14'),
          done('g', '2026-10-20'),
          done('h', '2026-10-21'),
          makeTask('i', { createdAt: at('2026-09-21') }),
        ],
        now,
      );

      expect(result.rate).toBe(2);
      expect(result.periodsLeft).toBe(1);
      expect(result.forecast).toEqual([9]);
    });
  });

  describe('upcomingLoad', () => {
    const open = (id: string, dueDate?: string, overrides: Partial<Task> = {}) =>
      makeTask(id, { dueDate, ...overrides });

    it('range les tâches ouvertes : en retard, par semaine d’échéance, puis sans échéance', () => {
      const result = upcomingLoad(
        [
          open('late', '2026-10-20'),
          open('today', '2026-10-30'),
          open('sunday', '2026-11-01'), // encore la semaine du 26 oct.
          open('next', '2026-11-03'),
          open('far', '2026-11-20'),
          open('none'),
        ],
        now,
      );

      const byLabel = (label: string) => result.find((b) => b.label === label)?.count;
      expect(result[0]).toEqual({ label: 'En retard', count: 1, kind: 'overdue' });
      expect(byLabel('Cette sem.')).toBe(2);
      expect(result.find((b) => b.kind === 'week' && b.label !== 'Cette sem.')?.count).toBe(1);
      expect(result.at(-1)).toEqual({ label: 'Sans date', count: 1, kind: 'none' });
      expect(result.reduce((sum, b) => sum + b.count, 0)).toBe(6);
    });

    it('ignore les tâches terminées et archivées', () => {
      const result = upcomingLoad(
        [
          open('done', '2026-11-03', { status: 'DONE' }),
          open('archived', '2026-11-03', { archived: true }),
          open('ok', '2026-11-03'),
        ],
        now,
      );

      expect(result.reduce((sum, b) => sum + b.count, 0)).toBe(1);
    });

    it('regroupe les échéances lointaines dans « Plus tard » et masque ce groupe quand il est vide', () => {
      const withFar = upcomingLoad([open('far', '2027-03-01')], now);
      expect(withFar.find((b) => b.kind === 'later')?.count).toBe(1);

      const without = upcomingLoad([open('near', '2026-11-03')], now);
      expect(without.some((b) => b.kind === 'later')).toBe(false);
    });

    it('garde au moins 4 semaines pour que le graphique ne soit pas écrasé', () => {
      const result = upcomingLoad([open('a', '2026-10-30')], now);

      expect(result.filter((b) => b.kind === 'week')).toHaveLength(4);
    });

    it('traite une échéance invalide comme absente', () => {
      const result = upcomingLoad([open('a', 'bientôt')], now);

      expect(result.at(-1)?.count).toBe(1);
    });
  });

  describe('movingAverage', () => {
    it('moyenne glissante, avec moins de valeurs au début', () => {
      expect(movingAverage([3, 3, 6, 0])).toEqual([3, 3, 4, 3]);
    });

    it('gère une liste vide et une fenêtre de 1', () => {
      expect(movingAverage([])).toEqual([]);
      expect(movingAverage([1, 5], 1)).toEqual([1, 5]);
    });
  });

  describe('cycleTimes', () => {
    const done = (id: string, days: number) =>
      makeTask(id, {
        status: 'DONE',
        createdAt: '2026-10-01T09:00:00.000Z',
        completedAt: new Date(
          Date.parse('2026-10-01T09:00:00.000Z') + days * 86_400_000,
        ).toISOString(),
      });

    it('répartit les délais par tranche et donne la médiane', () => {
      const result = cycleTimes([
        done('a', 0.5),
        done('b', 2),
        done('c', 3),
        done('d', 6),
        done('e', 10),
        done('f', 30),
        makeTask('g'),
      ]);

      expect(result.buckets.map((b) => b.count)).toEqual([1, 2, 1, 1, 1]);
      expect(result.median).toBe(4.5);
    });

    it('prend la valeur du milieu pour un nombre impair', () => {
      expect(cycleTimes([done('a', 1), done('b', 4), done('c', 20)]).median).toBe(4);
    });

    it('n’a pas de médiane sans tâche terminée', () => {
      const result = cycleTimes([makeTask('a')]);

      expect(result.median).toBeNull();
      expect(result.buckets.every((b) => b.count === 0)).toBe(true);
    });

    it('ignore une fin antérieure à la création', () => {
      expect(cycleTimes([done('a', -3)]).median).toBeNull();
    });
  });

  describe('activityGrid', () => {
    it('construit 20 semaines de 7 jours, du lundi au dimanche, qui finissent cette semaine', () => {
      const grid = activityGrid([], now);

      expect(grid.weeks).toHaveLength(20);
      expect(grid.weeks.every((w) => w.length === 7)).toBe(true);
      expect(grid.weeks.every((w) => w[0].date.getDay() === 1)).toBe(true);
      // Le jour courant (vendredi 30 octobre) est dans la dernière colonne, en 5e ligne.
      expect(grid.weeks.at(-1)![4].date.getDate()).toBe(30);
      expect(grid.weeks.at(-1)![4].future).toBe(false);
      expect(grid.weeks.at(-1)![5].future).toBe(true);
    });

    it('compte les tâches terminées par jour', () => {
      const grid = activityGrid(
        [
          makeTask('a', { status: 'DONE', completedAt: new Date(2026, 9, 29, 10).toISOString() }),
          makeTask('b', { status: 'DONE', completedAt: new Date(2026, 9, 29, 16).toISOString() }),
          makeTask('c', { status: 'DONE', completedAt: new Date(2026, 9, 28, 10).toISOString() }),
          makeTask('d'),
        ],
        now,
      );

      const day = (d: number) =>
        grid.weeks.flat().find((x) => x.date.getMonth() === 9 && x.date.getDate() === d)!;
      expect(day(29).count).toBe(2);
      expect(day(28).count).toBe(1);
      expect(day(27).count).toBe(0);
      expect(grid.max).toBe(2);
      expect(grid.total).toBe(3);
    });

    it('ignore les fins hors de la période affichée', () => {
      const grid = activityGrid(
        [makeTask('a', { status: 'DONE', completedAt: '2025-01-10T10:00:00.000Z' })],
        now,
      );

      expect(grid.total).toBe(0);
      expect(grid.max).toBe(0);
    });

    it('indique le mois à la première colonne de chaque mois', () => {
      const grid = activityGrid([], now);
      const labelled = grid.months.filter((m): m is string => m !== null);

      expect(grid.months[0]).not.toBeNull();
      expect(labelled.length).toBeGreaterThanOrEqual(4);
      expect(new Set(labelled).size).toBe(labelled.length);
    });
  });

  describe('buildSnapshot', () => {
    const tasks = [
      makeTask('a', {
        status: 'DONE',
        createdAt: '2026-10-05T09:00:00.000Z',
        completedAt: '2026-10-20T09:00:00.000Z',
        assignedTo: 'Sophie',
        priority: 'HIGH',
      }),
      makeTask('b', { status: 'IN_PROGRESS', dueDate: '2026-10-10', assignedTo: 'Léo' }),
      makeTask('c', { status: 'VALIDATION', dueDate: '2026-11-03' }),
      makeTask('d', { priority: 'LOW' }),
    ];

    it('rassemble les chiffres de tous les graphiques', () => {
      const snapshot = buildSnapshot(tasks, now);

      expect(snapshot.generatedAt).toBe(now.toISOString());
      expect(snapshot.status).toEqual({ todo: 1, inProgress: 1, validation: 1, done: 1 });
      expect(snapshot.priorities.map((p) => p.priority)).toEqual(['HIGH', 'MEDIUM', 'LOW']);
      expect(snapshot.assignees.map((a) => a.name)).toEqual(['Léo', 'Sophie', 'Non assigné']);
      expect(snapshot.flow.labels.length).toBeGreaterThanOrEqual(6);
      expect(snapshot.flow.completed.reduce((a, b) => a + b, 0)).toBe(1);
      expect(snapshot.burnup.scope.at(-1)).toBe(4);
      expect(snapshot.load[0]).toMatchObject({ label: 'En retard', count: 1 });
      expect(snapshot.cycle.median).toBe(15);
    });

    it('ne contient que des nombres et des textes : il survit à un enregistrement JSON', () => {
      const snapshot = buildSnapshot(tasks, now);

      expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    });

    it('décrit la grille d’activité par des dates en texte et des nombres', () => {
      const { activity } = buildSnapshot(tasks, now);

      expect(activity.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(activity.today).toBe('2026-10-30');
      expect(activity.counts).toHaveLength(20);
      expect(activity.counts.every((week) => week.length === 7)).toBe(true);
      expect(activity.total).toBe(1);
      expect(activity.counts.flat().reduce((a, b) => a + b, 0)).toBe(activity.total);
      // Le premier jour est un lundi, vingt semaines avant la semaine en cours.
      const [y, m, d] = activity.start.split('-').map(Number);
      expect(new Date(y, m - 1, d).getDay()).toBe(1);
    });

    it('fonctionne sans tâche', () => {
      const snapshot = buildSnapshot([], now);

      expect(snapshot.status).toEqual({ todo: 0, inProgress: 0, validation: 0, done: 0 });
      expect(snapshot.flow.labels).toEqual([]);
      expect(snapshot.burnup.labels).toEqual([]);
      expect(snapshot.assignees).toEqual([]);
      expect(snapshot.cycle.median).toBeNull();
    });
  });
});
