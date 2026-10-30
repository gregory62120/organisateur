import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MusicTrack } from '../../../core/models/music.model';
import { MusicPlayerService, PlayerStatus } from '../../../core/services/music-player.service';
import { MusicMiniPlayerComponent } from './music-mini-player';

describe('MusicMiniPlayerComponent', () => {
  const status = signal<PlayerStatus>('idle');
  const current = signal<MusicTrack | undefined>(undefined);
  const player = {
    status,
    current,
    position: signal(65),
    duration: signal(180),
    isActive: computed(() => status() !== 'idle'),
    hasNext: signal(true),
    hasPrevious: signal(true),
    attachHost: vi.fn(),
    toggle: vi.fn(),
    next: vi.fn(),
    previous: vi.fn(),
    stop: vi.fn(),
  };

  async function create() {
    TestBed.configureTestingModule({
      providers: [{ provide: MusicPlayerService, useValue: player }],
    });
    const fixture = TestBed.createComponent(MusicMiniPlayerComponent);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    status.set('idle');
    current.set(undefined);
  });

  it('donne au lecteur l’élément qui accueillera la vidéo, même avant toute lecture', async () => {
    const { el } = await create();

    expect(player.attachHost).toHaveBeenCalledTimes(1);
    expect(player.attachHost).toHaveBeenCalledWith(el.querySelector('.video'));
  });

  it('reste masqué tant que rien ne joue, puis apparaît', async () => {
    const { fixture, el } = await create();
    const mini = el.querySelector('.mini')!;
    expect(mini.classList.contains('visible')).toBe(false);

    status.set('playing');
    current.set({ id: 'a', videoId: 'a'.repeat(11), title: 'Lo-fi beats', addedAt: '' });
    await fixture.whenStable();

    expect(mini.classList.contains('visible')).toBe(true);
    expect(el.querySelector('.title')?.textContent).toContain('Lo-fi beats');
    expect(el.querySelector('.time')?.textContent).toContain('1:05 / 3:00');
  });

  it('commande la lecture', async () => {
    status.set('playing');
    const { el } = await create();
    const buttons = el.querySelectorAll<HTMLButtonElement>('.controls button');

    buttons[0].click();
    buttons[1].click();
    buttons[2].click();
    buttons[3].click();

    expect(player.previous).toHaveBeenCalled();
    expect(player.toggle).toHaveBeenCalled();
    expect(player.next).toHaveBeenCalled();
    expect(player.stop).toHaveBeenCalled();
    expect(buttons[1].title).toBe('Pause');
  });

  describe('déplacement', () => {
    const KEY = 'tf-music-mini-position';

    /** Événement de pointeur minimal : jsdom ne fournit pas PointerEvent. */
    const pointer = (type: string, x: number, y: number) =>
      Object.assign(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }), {
        pointerId: 1,
      });

    async function createSized(width = 236, height = 260) {
      const result = await create();
      const mini = result.el.querySelector<HTMLElement>('.mini')!;
      mini.getBoundingClientRect = () => ({ width, height }) as DOMRect;
      return { ...result, mini, grip: result.el.querySelector<HTMLElement>('.grip')! };
    }

    beforeEach(() => localStorage.removeItem(KEY));

    it('démarre dans le coin en bas à droite', async () => {
      const { mini } = await createSized();

      expect(mini.style.right).toBe('20px');
      expect(mini.style.bottom).toBe('20px');
    });

    it('suit la poignée, puis mémorise la position', async () => {
      const { fixture, mini, grip } = await createSized();

      grip.dispatchEvent(pointer('pointerdown', 500, 500));
      grip.dispatchEvent(pointer('pointermove', 400, 450));
      await fixture.whenStable();

      // Déplacé de 100 px vers la gauche et 50 px vers le haut.
      expect(mini.style.right).toBe('120px');
      expect(mini.style.bottom).toBe('70px');
      expect(mini.classList.contains('dragging')).toBe(true);

      grip.dispatchEvent(pointer('pointerup', 400, 450));
      await fixture.whenStable();

      expect(mini.classList.contains('dragging')).toBe(false);
      expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ right: 120, bottom: 70 });
    });

    it('peut aussi se déplacer en tirant sur le titre', async () => {
      const { fixture, el, mini } = await createSized();

      const body = el.querySelector<HTMLElement>('.body')!;
      body.dispatchEvent(pointer('pointerdown', 100, 100));
      body.dispatchEvent(pointer('pointermove', 90, 100));
      await fixture.whenStable();

      expect(mini.style.right).toBe('30px');
    });

    it('ne bouge pas sans avoir saisi la poignée', async () => {
      const { fixture, mini, grip } = await createSized();

      grip.dispatchEvent(pointer('pointermove', 10, 10));
      await fixture.whenStable();

      expect(mini.style.right).toBe('20px');
      expect(localStorage.getItem(KEY)).toBeNull();
    });

    it('reste dans la fenêtre', async () => {
      const { fixture, mini, grip } = await createSized(236, 260);

      grip.dispatchEvent(pointer('pointerdown', 500, 500));
      grip.dispatchEvent(pointer('pointermove', 5000, 5000));
      await fixture.whenStable();
      expect(mini.style.right).toBe('0px');
      expect(mini.style.bottom).toBe('0px');

      grip.dispatchEvent(pointer('pointermove', -5000, -5000));
      await fixture.whenStable();
      expect(mini.style.right).toBe(`${window.innerWidth - 236}px`);
      expect(mini.style.bottom).toBe(`${window.innerHeight - 260}px`);
    });

    it('se déplace au clavier avec les flèches', async () => {
      const { fixture, mini, grip } = await createSized();

      grip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      grip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      grip.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      await fixture.whenStable();

      expect(mini.style.right).toBe('36px');
      expect(mini.style.bottom).toBe('36px');
      expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ right: 36, bottom: 36 });
    });

    it('revient en bas à droite au double-clic sur la poignée', async () => {
      const { fixture, mini, grip } = await createSized();
      grip.dispatchEvent(pointer('pointerdown', 500, 500));
      grip.dispatchEvent(pointer('pointermove', 300, 300));
      grip.dispatchEvent(pointer('pointerup', 300, 300));

      grip.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      await fixture.whenStable();

      expect(mini.style.right).toBe('20px');
      expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ right: 20, bottom: 20 });
    });

    it('retrouve la position mémorisée', async () => {
      localStorage.setItem(KEY, JSON.stringify({ right: 300, bottom: 150 }));

      const { mini } = await createSized();

      expect(mini.style.right).toBe('300px');
      expect(mini.style.bottom).toBe('150px');
    });

    it('ignore une position mémorisée illisible', async () => {
      localStorage.setItem(KEY, '{pas du json');
      let { mini } = await createSized();
      expect(mini.style.right).toBe('20px');

      TestBed.resetTestingModule();
      localStorage.setItem(KEY, JSON.stringify({ right: 'x' }));
      ({ mini } = await createSized());
      expect(mini.style.bottom).toBe('20px');
    });

    it('ramène le lecteur dans la fenêtre quand elle est réduite', async () => {
      localStorage.setItem(KEY, JSON.stringify({ right: 5000, bottom: 5000 }));
      const { fixture, mini } = await createSized(236, 260);

      window.dispatchEvent(new Event('resize'));
      await fixture.whenStable();

      expect(mini.style.right).toBe(`${window.innerWidth - 236}px`);
      expect(mini.style.bottom).toBe(`${window.innerHeight - 260}px`);
    });
  });
});
