import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';

import { ProjectEvent } from '../../../../core/models/event.model';
import { EventService } from '../../../../core/services/event.service';
import { EventDialogComponent, EventDialogData } from './event-dialog';

const event: ProjectEvent = {
  id: 'e1',
  title: 'Revue de sprint',
  date: '2026-10-20',
  startTime: '14:00',
  endTime: '15:00',
  description: 'Salle B',
  color: 'violet',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('EventDialogComponent', () => {
  const eventService = { add: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const dialogRef = { close: vi.fn() };

  function create(data: EventDialogData) {
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: data },
        { provide: DialogRef, useValue: dialogRef },
        { provide: EventService, useValue: eventService },
      ],
    });
    return TestBed.runInInjectionContext(() => new EventDialogComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('charge les valeurs de l’évènement', () => {
    const dialog = create({ event });

    expect(dialog.title()).toBe('Revue de sprint');
    expect(dialog.allDay()).toBe(false);
    expect(dialog.startTime()).toBe('14:00');
    expect(dialog.color()).toBe('violet');
  });

  it('un évènement sans heure est sur toute la journée, avec des heures proposées si on les active', () => {
    const dialog = create({ event: { ...event, startTime: undefined, endTime: undefined } });

    expect(dialog.allDay()).toBe(true);
    dialog.setAllDay(false);
    expect(dialog.startTime()).toBe('09:00');
    expect(dialog.endTime()).toBe('10:00');
  });

  it('refuse d’enregistrer sans titre ou sans date', () => {
    const dialog = create({ event: { ...event, title: '' }, isNew: true });
    expect(dialog.canSave()).toBe(false);

    dialog.save();
    expect(eventService.add).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();

    dialog.title.set('  ');
    expect(dialog.canSave()).toBe(false);

    dialog.title.set('Point');
    dialog.date.set('');
    expect(dialog.canSave()).toBe(false);
  });

  it('crée un nouvel évènement avec add (rien n’est écrit avant)', () => {
    const dialog = create({ event: { ...event, title: '' }, isNew: true });
    expect(eventService.add).not.toHaveBeenCalled();

    dialog.title.set('  Point équipe ');
    dialog.save();

    expect(eventService.add).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'e1', title: 'Point équipe', date: '2026-10-20' }),
    );
    expect(eventService.update).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('modifie un évènement existant avec update', () => {
    const dialog = create({ event });
    dialog.color.set('green');
    dialog.date.set('2026-10-22');
    dialog.description.set('  Nouvelle salle ');

    dialog.save();

    expect(eventService.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'e1',
        color: 'green',
        date: '2026-10-22',
        description: 'Nouvelle salle',
      }),
    );
  });

  it('retire les heures d’un évènement sur toute la journée', () => {
    const dialog = create({ event });
    dialog.setAllDay(true);

    dialog.save();

    const saved = eventService.update.mock.calls[0][0] as ProjectEvent;
    expect(saved.startTime).toBeUndefined();
    expect(saved.endTime).toBeUndefined();
  });

  it('ramène une fin antérieure au début', () => {
    const dialog = create({ event });
    dialog.startTime.set('16:00');
    dialog.endTime.set('15:00');

    dialog.save();

    expect(eventService.update.mock.calls[0][0]).toMatchObject({
      startTime: '16:00',
      endTime: '16:00',
    });
  });

  it('supprime après confirmation uniquement', () => {
    const dialog = create({ event });

    dialog.remove();
    expect(eventService.delete).toHaveBeenCalledWith('e1');
    expect(dialogRef.close).toHaveBeenCalled();

    vi.clearAllMocks();
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    );
    dialog.remove();
    expect(eventService.delete).not.toHaveBeenCalled();
  });

  it('annuler n’écrit rien', () => {
    const dialog = create({ event, isNew: true });

    dialog.close();

    expect(eventService.add).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  describe('horaires', () => {
    const empty = { ...event, startTime: undefined, endTime: undefined };

    it('propose des heures par défaut pour un nouvel évènement', () => {
      const dialog = create({ event: empty, isNew: true });

      expect(dialog.allDay()).toBe(false);
      expect(dialog.startTime()).toBe('09:00');
      expect(dialog.endTime()).toBe('10:00');
    });

    it('crée un nouvel évènement avec ses heures', () => {
      const dialog = create({ event: { ...empty, title: 'Point' }, isNew: true });
      dialog.startTime.set('11:15');
      dialog.endTime.set('12:00');

      dialog.save();

      expect(eventService.add.mock.calls[0][0]).toMatchObject({
        startTime: '11:15',
        endTime: '12:00',
      });
    });

    it('peut créer un nouvel évènement sans horaire sur demande', () => {
      const dialog = create({ event: { ...empty, title: 'Séminaire' }, isNew: true, allDay: true });
      expect(dialog.allDay()).toBe(true);

      dialog.save();

      const saved = eventService.add.mock.calls[0][0] as ProjectEvent;
      expect(saved.startTime).toBeUndefined();
      expect(saved.endTime).toBeUndefined();
    });

    it('reprend l’heure de départ transmise (clic dans la grille)', () => {
      const dialog = create({
        event: { ...empty, startTime: '14:30', endTime: '15:30' },
        isNew: true,
      });

      expect(dialog.allDay()).toBe(false);
      expect(dialog.startTime()).toBe('14:30');
      expect(dialog.endTime()).toBe('15:30');
    });

    it('avertit quand la fin précède le début, sauf pour un évènement sur toute la journée', () => {
      const dialog = create({ event });
      expect(dialog.endBeforeStart()).toBe(false);

      dialog.startTime.set('16:00');
      dialog.endTime.set('15:00');
      expect(dialog.endBeforeStart()).toBe(true);

      dialog.setAllDay(true);
      expect(dialog.endBeforeStart()).toBe(false);
    });
  });
});
