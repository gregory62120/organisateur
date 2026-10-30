import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MusicSlot, MusicTrack } from '../../../core/models/music.model';
import { MusicPlanService } from '../../../core/services/music-plan.service';
import { TRACK_DRAG_TYPE } from '../../../core/services/music-plan';
import { MusicPlayerService, PlayerStatus } from '../../../core/services/music-player.service';
import { ScheduledTrack } from '../../../core/services/music-schedule';
import { MusicService } from '../../../core/services/music.service';
import { MusicPanelComponent } from './music-panel';

const track = (letter: string, duration?: number): MusicTrack => ({
  id: letter,
  videoId: letter.repeat(11),
  title: `Titre ${letter}`,
  author: 'Auteur',
  duration,
  addedAt: '2026-01-01T00:00:00.000Z',
});

describe('MusicPanelComponent', () => {
  const tracks = signal<MusicTrack[]>([]);
  const music = { tracks, addFromUrl: vi.fn(), remove: vi.fn(), move: vi.fn() };
  const slots = signal<MusicSlot[]>([]);
  const plan = { slots, add: vi.fn() };
  const day = new Date(2026, 9, 30);
  const status = signal<PlayerStatus>('idle');
  const currentId = signal<string | null>(null);
  const position = signal(0);
  const duration = signal(0);
  const schedule = signal<ScheduledTrack[]>([]);
  const message = signal<string | null>(null);
  const player = {
    status,
    currentId,
    position,
    duration,
    message,
    schedule,
    current: computed(() => tracks().find((t) => t.id === currentId())),
    isActive: computed(() => status() !== 'idle'),
    hasNext: signal(true),
    hasPrevious: signal(true),
    play: vi.fn(),
    toggle: vi.fn(),
    next: vi.fn(),
    previous: vi.fn(),
    stop: vi.fn(),
  };

  function create() {
    TestBed.configureTestingModule({
      providers: [
        { provide: MusicService, useValue: music },
        { provide: MusicPlayerService, useValue: player },
        { provide: MusicPlanService, useValue: plan },
      ],
    });
    const fixture = TestBed.createComponent(MusicPanelComponent);
    fixture.componentRef.setInput('day', day);
    return {
      fixture,
      component: fixture.componentInstance,
      el: fixture.nativeElement as HTMLElement,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    tracks.set([track('a', 180), track('b', 3600), track('c')]);
    status.set('idle');
    currentId.set(null);
    position.set(0);
    duration.set(0);
    message.set(null);
    schedule.set([]);
    slots.set([]);
    music.addFromUrl.mockResolvedValue({ ok: true });
  });

  it('résume la playlist : nombre de titres et durée cumulée', () => {
    const { component } = create();

    expect(component.total()).toBe('1 h 07');
    tracks.set([track('a', 120)]);
    expect(component.total()).toBe('2 min');
  });

  it('affiche chaque titre avec sa durée, ou un tiret si elle est inconnue', async () => {
    const { fixture, el } = create();
    await fixture.whenStable();

    const rows = [...el.querySelectorAll('.track')];
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain('Titre a');
    expect(rows[0].textContent).toContain('3:00');
    expect(rows[1].textContent).toContain('1:00:00');
    expect(rows[2].textContent).toContain('—');
    expect(el.querySelector<HTMLImageElement>('.track img')!.src).toContain('/vi/aaaaaaaaaaa/');
  });

  it('invite à ajouter un lien quand la playlist est vide', async () => {
    tracks.set([]);
    const { fixture, el } = create();
    await fixture.whenStable();

    expect(el.querySelector('.empty')?.textContent).toContain('Colle un lien YouTube');
    expect(el.querySelector<HTMLButtonElement>('.play')!.disabled).toBe(true);
  });

  describe('lecture', () => {
    it('le bouton principal lance la lecture', async () => {
      const { fixture, el } = create();
      await fixture.whenStable();

      const button = el.querySelector<HTMLButtonElement>('.play')!;
      expect(button.textContent).toContain('Lancer la lecture');
      button.click();

      expect(player.toggle).toHaveBeenCalled();
    });

    it('adapte son libellé à l’état du lecteur', () => {
      const { component } = create();

      status.set('playing');
      expect(component.playLabel()).toBe('Pause');
      status.set('paused');
      expect(component.playLabel()).toBe('Reprendre');
      status.set('loading');
      expect(component.playLabel()).toBe('Chargement…');
      status.set('idle');
      expect(component.playLabel()).toBe('Lancer la lecture');
    });

    it('lance un titre en cliquant sur sa ligne', async () => {
      const { fixture, el } = create();
      await fixture.whenStable();

      el.querySelectorAll<HTMLElement>('.track')[1].click();

      expect(player.play).toHaveBeenCalledWith('b');
    });

    it('affiche le titre en cours, sa progression et les commandes', async () => {
      status.set('playing');
      currentId.set('a');
      position.set(45);
      duration.set(180);
      const { fixture, el, component } = create();
      await fixture.whenStable();

      expect(component.progress()).toBe(25);
      expect(el.querySelector('.now')?.textContent).toContain('Titre a');
      expect(el.querySelector('.now-time')?.textContent).toContain('0:45 / 3:00');
      expect(el.querySelector('.track.current')?.textContent).toContain('Titre a');
      expect(el.querySelectorAll('.transport .icon')).toHaveLength(3);
    });

    it('masque la progression et les commandes à l’arrêt', async () => {
      const { fixture, el, component } = create();
      await fixture.whenStable();

      expect(component.progress()).toBe(0);
      expect(el.querySelector('.now')).toBeNull();
      expect(el.querySelectorAll('.transport .icon')).toHaveLength(0);
    });

    it('affiche l’heure de passage prévue de chaque titre, sauf pour ceux déjà écoutés', async () => {
      const at = (h: number, m: number) => new Date(2026, 9, 29, h, m);
      schedule.set([
        {
          track: track('a', 180),
          start: at(9, 0),
          end: at(9, 3),
          status: 'played',
          durationKnown: true,
        },
        {
          track: track('a', 180),
          start: at(9, 40),
          end: at(9, 43),
          status: 'upcoming',
          durationKnown: true,
        },
        {
          track: track('b', 3600),
          start: at(9, 43),
          end: at(10, 43),
          status: 'upcoming',
          durationKnown: true,
        },
      ]);
      const { fixture, el } = create();
      await fixture.whenStable();

      const rows = [...el.querySelectorAll('.track .sub')].map((r) => r.textContent);
      expect(rows[0]).toContain('09:40 – 09:43');
      expect(rows[1]).toContain('09:43 – 10:43');
      expect(rows[2]).not.toContain('–');
    });

    it('relaie les erreurs du lecteur', async () => {
      message.set('Cette vidéo ne peut pas être lue ici');
      const { fixture, el } = create();
      await fixture.whenStable();

      expect(el.querySelector('.error')?.textContent).toContain('ne peut pas être lue');
    });
  });

  describe('ajout d’un lien', () => {
    it('ajoute le lien saisi puis vide le champ', async () => {
      const { component } = create();
      component.url.set('  https://youtu.be/dQw4w9WgXcQ ');

      await component.add();

      expect(music.addFromUrl).toHaveBeenCalledWith('https://youtu.be/dQw4w9WgXcQ');
      expect(component.url()).toBe('');
      expect(component.addError()).toBeNull();
      expect(component.adding()).toBe(false);
    });

    it('affiche l’erreur et garde le lien quand l’ajout échoue', async () => {
      music.addFromUrl.mockResolvedValue({ ok: false, error: 'Vidéo introuvable.' });
      const { fixture, el, component } = create();
      component.url.set('https://youtu.be/dQw4w9WgXcQ');

      await component.add();
      await fixture.whenStable();

      expect(component.addError()).toBe('Vidéo introuvable.');
      expect(component.url()).toBe('https://youtu.be/dQw4w9WgXcQ');
      expect(el.querySelector('.error')?.textContent).toContain('Vidéo introuvable.');
    });

    it('ignore un champ vide ou un ajout déjà en cours', async () => {
      const { component } = create();

      await component.add();
      component.url.set('abc');
      component.adding.set(true);
      await component.add();

      expect(music.addFromUrl).not.toHaveBeenCalled();
    });

    it('s’envoie avec le formulaire', async () => {
      const { fixture, el, component } = create();
      component.url.set('https://youtu.be/dQw4w9WgXcQ');
      await fixture.whenStable();

      el.querySelector<HTMLFormElement>('form.add')!.dispatchEvent(new Event('submit'));

      expect(music.addFromUrl).toHaveBeenCalled();
    });
  });

  describe('gestion de la liste', () => {
    it('retire un titre', () => {
      const { component } = create();
      const event = { stopPropagation: vi.fn() } as unknown as Event;

      component.remove('b', event);

      expect(music.remove).toHaveBeenCalledWith('b');
      expect(player.stop).not.toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('arrête la lecture quand on retire le titre en cours', () => {
      currentId.set('a');
      const { component } = create();

      component.remove('a', { stopPropagation: vi.fn() } as unknown as Event);

      expect(player.stop).toHaveBeenCalled();
      expect(music.remove).toHaveBeenCalledWith('a');
    });

    it('déplace un titre sans le lancer', async () => {
      const { fixture, el } = create();
      await fixture.whenStable();

      el.querySelector<HTMLElement>('.track .actions button[title="Monter"]')!.click();

      expect(music.move).toHaveBeenCalledWith('a', -1);
      expect(player.play).not.toHaveBeenCalled();
    });
  });

  describe('planification sur le calendrier', () => {
    const slot = (
      id: string,
      trackId: string,
      startTime: string,
      date = '2026-10-30',
    ): MusicSlot => ({
      id,
      trackId,
      date,
      startTime,
    });

    it('rend chaque titre glissable avec son identifiant', async () => {
      const { fixture, el } = create();
      await fixture.whenStable();
      const row = el.querySelectorAll<HTMLElement>('.track')[1];
      const setData = vi.fn();
      const event = Object.assign(new Event('dragstart', { bubbles: true }), {
        dataTransfer: { setData, effectAllowed: '' },
      });

      expect(row.getAttribute('draggable')).toBe('true');
      row.dispatchEvent(event);

      expect(setData).toHaveBeenCalledWith(TRACK_DRAG_TYPE, 'b');
    });

    it('indique les heures déjà planifiées sur le jour affiché, pas celles des autres jours', async () => {
      slots.set([
        slot('s1', 'a', '14:30'),
        slot('s2', 'a', '09:00'),
        slot('s3', 'b', '10:00', '2026-10-31'),
      ]);
      const { fixture, el, component } = create();
      await fixture.whenStable();

      expect(component.planned().get('a')).toBe('09:00, 14:30');
      expect(component.planned().has('b')).toBe(false);
      const subs = [...el.querySelectorAll('.track .sub')].map((e) => e.textContent);
      expect(subs[0]).toContain('Planifié 09:00, 14:30');
      expect(subs[1]).not.toContain('Planifié');
    });

    it('planifie un titre à la suite de ce qui est déjà placé, sans glisser-déposer', () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 9, 30, 8, 0));
      // Une heure à partir de 10:00 (titre b = 3600 s) : le prochain titre commence à 11:00.
      slots.set([slot('s1', 'b', '10:00')]);
      const { component } = create();
      const event = { stopPropagation: vi.fn() } as unknown as Event;

      component.schedule('a', event);

      expect(plan.add).toHaveBeenCalledWith('a', '2026-10-30', 660);
      expect(event.stopPropagation).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('propose maintenant pour aujourd’hui, et 9 h pour un autre jour', () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 9, 30, 10, 2));
      const { fixture, component } = create();
      const event = { stopPropagation: vi.fn() } as unknown as Event;

      component.schedule('a', event);
      expect(plan.add).toHaveBeenLastCalledWith('a', '2026-10-30', 605);

      fixture.componentRef.setInput('day', new Date(2026, 10, 2));
      component.schedule('a', event);
      expect(plan.add).toHaveBeenLastCalledWith('a', '2026-11-02', 540);
      vi.useRealTimers();
    });

    it('le bouton « Planifier » d’un titre ne le lance pas', async () => {
      const { fixture, el } = create();
      await fixture.whenStable();
      const button = el.querySelector<HTMLButtonElement>(
        '.track .actions button[title^="Planifier"]',
      )!;

      button.click();

      expect(plan.add).toHaveBeenCalled();
      expect(player.play).not.toHaveBeenCalled();
    });

    it('explique comment planifier quand la playlist n’est pas vide', async () => {
      const { fixture, el } = create();
      await fixture.whenStable();
      expect(el.querySelector('.hint')?.textContent).toContain('Glisse un titre');

      tracks.set([]);
      await fixture.whenStable();
      expect(el.querySelector('.hint')).toBeNull();
    });
  });
});
