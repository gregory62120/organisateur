import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MusicSlot, MusicTrack } from '../../../../core/models/music.model';
import { MusicPlanService } from '../../../../core/services/music-plan.service';
import { TRACK_DRAG_TYPE } from '../../../../core/services/music-plan';
import { MusicPlayerService } from '../../../../core/services/music-player.service';
import { ScheduledTrack } from '../../../../core/services/music-schedule';
import { MusicService } from '../../../../core/services/music.service';
import { MusicLaneComponent } from './music-lane';

const track = (id: string, minutes?: number): MusicTrack => ({
  id,
  videoId: id.repeat(11),
  title: `Titre ${id}`,
  duration: minutes === undefined ? undefined : minutes * 60,
  addedAt: '',
});

const slot = (id: string, trackId: string, startTime: string, date = '2026-10-30'): MusicSlot => ({
  id,
  trackId,
  date,
  startTime,
});

describe('MusicLaneComponent', () => {
  const slots = signal<MusicSlot[]>([]);
  const tracks = signal<MusicTrack[]>([]);
  const schedule = signal<ScheduledTrack[]>([]);
  const plan = { slots, add: vi.fn(), move: vi.fn(), remove: vi.fn() };
  const player = { schedule, play: vi.fn() };
  const HOUR = 72;
  const day = new Date(2026, 9, 30);

  function create() {
    TestBed.configureTestingModule({
      providers: [
        { provide: MusicPlanService, useValue: plan },
        { provide: MusicService, useValue: { tracks } },
        { provide: MusicPlayerService, useValue: player },
      ],
    });
    const fixture = TestBed.createComponent(MusicLaneComponent);
    fixture.componentRef.setInput('day', day);
    fixture.componentRef.setInput('hourPx', HOUR);
    return {
      fixture,
      lane: fixture.componentInstance,
      el: fixture.nativeElement as HTMLElement,
    };
  }

  const block = (lane: MusicLaneComponent, id: string) =>
    lane.planBlocks().find((b) => b.slot.id === id)!;

  /** Ajoute à un événement des propriétés que jsdom laisse en lecture seule ou ne fournit pas. */
  const withProps = <T extends Event>(event: T, props: Record<string, unknown>): T => {
    for (const [key, value] of Object.entries(props)) {
      Object.defineProperty(event, key, { value, configurable: true });
    }
    return event;
  };

  /** Événement de pointeur minimal : jsdom ne fournit pas PointerEvent. */
  const pointer = (type: string, clientY: number, button = 0) =>
    withProps(new MouseEvent(type, { clientY, bubbles: true }), { pointerId: 1, button });

  const dragEvent = (
    type: string,
    clientY: number,
    trackId?: string,
    types = [TRACK_DRAG_TYPE],
  ) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    return withProps(event, {
      clientY,
      dataTransfer: { types, getData: () => trackId ?? '', dropEffect: '' },
      currentTarget: { getBoundingClientRect: () => ({ top: 100 }) },
    }) as unknown as DragEvent;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tracks.set([track('a', 30), track('b', 60), track('c')]);
    slots.set([]);
    schedule.set([]);
  });

  describe('musiques planifiées', () => {
    it('place les musiques du jour avec leur durée, en ignorant les autres jours et les titres supprimés', () => {
      slots.set([
        slot('s1', 'a', '10:00'),
        slot('s2', 'b', '14:30'),
        slot('autre-jour', 'a', '10:00', '2026-10-31'),
        slot('orpheline', 'disparu', '11:00'),
      ]);
      const { lane } = create();

      const blocks = lane.planBlocks();

      expect(blocks.map((b) => b.slot.id)).toEqual(['s1', 's2']);
      expect(blocks[0].top).toBeCloseTo((10 / 24) * 100);
      expect(blocks[0].height).toBeCloseTo((0.5 / 24) * 100);
      expect(blocks[0].time).toBe('10:00 – 10:30');
      expect(blocks[1].time).toBe('14:30 – 15:30');
    });

    it('suppose 4 minutes quand la durée du titre est inconnue', () => {
      slots.set([slot('s1', 'c', '09:00')]);
      const { lane } = create();

      expect(block(lane, 's1').time).toBe('09:00 – 09:04');
    });

    it('met côte à côte les musiques qui se chevauchent', () => {
      slots.set([slot('s1', 'b', '10:00'), slot('s2', 'a', '10:30')]);
      const { lane } = create();

      expect([block(lane, 's1').lane, block(lane, 's2').lane]).toEqual([0, 1]);
      expect(block(lane, 's1').lanes).toBe(2);
    });

    it('n’écrit le titre et ne montre les boutons que si le bloc est assez haut', () => {
      // 72 px par heure : 30 min = 36 px (titre), 60 min = 72 px (titre et boutons), 4 min = 5 px.
      slots.set([slot('s30', 'a', '08:00'), slot('s60', 'b', '09:00'), slot('s4', 'c', '11:00')]);
      const { lane } = create();

      expect([block(lane, 's30').labelled, block(lane, 's30').actions]).toEqual([true, false]);
      expect([block(lane, 's60').labelled, block(lane, 's60').actions]).toEqual([true, true]);
      expect([block(lane, 's4').labelled, block(lane, 's4').actions]).toEqual([false, false]);
    });

    it('tient compte de la hauteur d’une heure', () => {
      slots.set([slot('s30', 'a', '08:00')]);
      const { fixture, lane } = create();

      fixture.componentRef.setInput('hourPx', 40); // 30 min = 20 px

      expect(block(lane, 's30').labelled).toBe(false);
    });

    it('s’arrête à minuit', () => {
      slots.set([slot('s1', 'b', '23:30')]);
      const { lane } = create();

      expect(block(lane, 's1').top + block(lane, 's1').height).toBeCloseTo(100);
    });
  });

  describe('lecture en cours', () => {
    const entry = (
      id: string,
      start: Date,
      end: Date,
      status: ScheduledTrack['status'],
    ): ScheduledTrack => ({ track: track(id, 10), start, end, status, durationKnown: true });
    const at = (h: number, m = 0) => new Date(2026, 9, 30, h, m);

    it('affiche l’aperçu quand rien n’est planifié', () => {
      schedule.set([entry('a', at(10), at(11), 'preview')]);
      const { lane } = create();

      expect(lane.liveBlocks().map((b) => b.status)).toEqual(['preview']);
    });

    it('masque l’aperçu quand le jour a une planification, mais garde la lecture réelle', () => {
      slots.set([slot('s1', 'a', '10:00')]);
      schedule.set([
        entry('a', at(10), at(11), 'preview'),
        entry('b', at(11), at(12), 'current'),
        entry('c', at(12), at(13), 'upcoming'),
      ]);
      const { lane } = create();

      expect(lane.liveBlocks().map((b) => b.status)).toEqual(['current', 'upcoming']);
    });

    it('découpe aux limites du jour et ignore les autres jours', () => {
      schedule.set([
        entry('a', at(23, 30), new Date(2026, 9, 31, 0, 30), 'current'),
        entry('b', new Date(2026, 9, 31, 9), new Date(2026, 9, 31, 10), 'upcoming'),
      ]);
      const { lane } = create();

      const blocks = lane.liveBlocks();
      expect(blocks.map((b) => b.title)).toEqual(['Titre a']);
      expect(blocks[0].top + blocks[0].height).toBeCloseTo(100);
    });
  });

  describe('déplacement d’une musique', () => {
    it('suit la souris en direct puis enregistre la nouvelle heure, calée sur 5 minutes', () => {
      slots.set([slot('s1', 'a', '10:00')]);
      const { lane } = create();

      lane.startDrag(pointer('pointerdown', 500) as PointerEvent, block(lane, 's1'));
      // 36 px = 30 minutes à 72 px par heure.
      lane.moveDrag(pointer('pointermove', 536) as PointerEvent);
      expect(block(lane, 's1').time).toBe('10:30 – 11:00');
      expect(lane.draggingId()).toBe('s1');
      expect(plan.move).not.toHaveBeenCalled();

      lane.endDrag(block(lane, 's1'));

      expect(plan.move).toHaveBeenCalledWith('s1', '2026-10-30', 630);
      expect(lane.draggingId()).toBeNull();
    });

    it('déplace vers le haut, et se cale sur 5 minutes', () => {
      slots.set([slot('s1', 'a', '10:00')]);
      const { lane } = create();

      lane.startDrag(pointer('pointerdown', 500) as PointerEvent, block(lane, 's1'));
      lane.moveDrag(pointer('pointermove', 500 - 11) as PointerEvent); // ≈ 9 minutes
      lane.endDrag(block(lane, 's1'));

      expect(plan.move).toHaveBeenCalledWith('s1', '2026-10-30', 590);
    });

    it('n’enregistre rien quand la musique n’a pas bougé', () => {
      slots.set([slot('s1', 'a', '10:00')]);
      const { lane } = create();

      lane.startDrag(pointer('pointerdown', 500) as PointerEvent, block(lane, 's1'));
      lane.moveDrag(pointer('pointermove', 501) as PointerEvent);
      lane.endDrag(block(lane, 's1'));

      expect(plan.move).not.toHaveBeenCalled();
    });

    it('reste dans la journée', () => {
      slots.set([slot('s1', 'a', '10:00')]);
      const { lane } = create();

      lane.startDrag(pointer('pointerdown', 500) as PointerEvent, block(lane, 's1'));
      lane.moveDrag(pointer('pointermove', 500 + 100_000) as PointerEvent);
      lane.endDrag(block(lane, 's1'));

      expect(plan.move).toHaveBeenCalledWith('s1', '2026-10-30', 23 * 60 + 55);
    });

    it('annule le déplacement sans rien enregistrer', () => {
      slots.set([slot('s1', 'a', '10:00')]);
      const { lane } = create();

      lane.startDrag(pointer('pointerdown', 500) as PointerEvent, block(lane, 's1'));
      lane.moveDrag(pointer('pointermove', 600) as PointerEvent);
      lane.cancelDrag();

      expect(block(lane, 's1').time).toBe('10:00 – 10:30');
      expect(plan.move).not.toHaveBeenCalled();
    });

    it('ignore un mouvement sans glissement en cours et un clic non primaire', () => {
      slots.set([slot('s1', 'a', '10:00')]);
      const { lane } = create();

      lane.moveDrag(pointer('pointermove', 600) as PointerEvent);
      lane.startDrag(pointer('pointerdown', 500, 2) as PointerEvent, block(lane, 's1'));
      lane.endDrag(block(lane, 's1'));

      expect(plan.move).not.toHaveBeenCalled();
      expect(lane.draggingId()).toBeNull();
    });
  });

  describe('dépôt depuis le panneau', () => {
    it('accepte une musique glissée et la place à la position du dépôt', () => {
      const { lane } = create();

      const over = dragEvent('dragover', 100);
      lane.onDragOver(over);
      expect(over.defaultPrevented).toBe(true);
      expect(lane.dropping()).toBe(true);

      // La voie commence à 100 px ; 172 px = 72 px plus bas = 1 heure.
      lane.onDrop(dragEvent('drop', 172, 'b'));

      expect(plan.add).toHaveBeenCalledWith('b', '2026-10-30', 60);
      expect(lane.dropping()).toBe(false);
    });

    it('refuse un glissement qui n’est pas une musique', () => {
      const { lane } = create();

      const over = dragEvent('dragover', 100, undefined, ['Files']);
      lane.onDragOver(over);

      expect(over.defaultPrevented).toBe(false);
      expect(lane.dropping()).toBe(false);
    });

    it('ignore un dépôt sans musique et se désactive en quittant la voie', () => {
      const { lane } = create();
      lane.onDragOver(dragEvent('dragover', 100));

      lane.onDragLeave();
      lane.onDrop(dragEvent('drop', 200));

      expect(lane.dropping()).toBe(false);
      expect(plan.add).not.toHaveBeenCalled();
    });
  });

  describe('clavier et boutons', () => {
    const key = (name: string) => {
      const event = new KeyboardEvent('keydown', { key: name, cancelable: true });
      return event;
    };

    it('Suppr et Retour arrière retirent la musique', () => {
      slots.set([slot('s1', 'a', '10:00')]);
      const { lane } = create();

      lane.onKey(key('Delete'), block(lane, 's1'));
      lane.onKey(key('Backspace'), block(lane, 's1'));

      expect(plan.remove).toHaveBeenCalledTimes(2);
      expect(plan.remove).toHaveBeenCalledWith('s1');
    });

    it('les flèches décalent la musique de 5 minutes', () => {
      slots.set([slot('s1', 'a', '10:00')]);
      const { lane } = create();

      lane.onKey(key('ArrowDown'), block(lane, 's1'));
      expect(plan.move).toHaveBeenLastCalledWith('s1', '2026-10-30', 605);

      lane.onKey(key('ArrowUp'), block(lane, 's1'));
      expect(plan.move).toHaveBeenLastCalledWith('s1', '2026-10-30', 595);

      lane.onKey(key('a'), block(lane, 's1'));
      expect(plan.move).toHaveBeenCalledTimes(2);
    });

    it('permet d’écouter une musique planifiée tout de suite', () => {
      slots.set([slot('s1', 'a', '10:00')]);
      const { lane } = create();

      lane.play(block(lane, 's1'));

      expect(player.play).toHaveBeenCalledWith('a');
    });
  });

  describe('affichage', () => {
    it('affiche un bloc par musique avec ses boutons, et la bande de lecture', async () => {
      slots.set([slot('s1', 'b', '09:00')]);
      schedule.set([
        {
          track: track('a', 10),
          start: new Date(2026, 9, 30, 10),
          end: new Date(2026, 9, 30, 11),
          status: 'current',
          durationKnown: true,
        },
      ]);
      const { fixture, el } = create();
      await fixture.whenStable();

      expect(el.querySelectorAll('.block')).toHaveLength(1);
      expect(el.querySelector('.block .title')?.textContent).toBe('Titre b');
      expect(el.querySelectorAll('.block .actions button')).toHaveLength(2);
      expect(el.querySelectorAll('.live .seg')).toHaveLength(1);
    });

    it('les boutons écoutent ou retirent la musique', async () => {
      slots.set([slot('s1', 'b', '09:00')]);
      const { fixture, el } = create();
      await fixture.whenStable();
      const [play, remove] = el.querySelectorAll<HTMLButtonElement>('.block .actions button');

      play.click();
      remove.click();

      expect(player.play).toHaveBeenCalledWith('b');
      expect(plan.remove).toHaveBeenCalledWith('s1');
    });

    it('ne propage pas les clics à la colonne, qui créerait un évènement', async () => {
      const { fixture, el } = create();
      await fixture.whenStable();
      const outside = vi.fn();
      document.body.addEventListener('click', outside);
      document.body.appendChild(el);

      el.click();
      el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

      expect(outside).not.toHaveBeenCalled();
      document.body.removeEventListener('click', outside);
      el.remove();
    });
  });
});
