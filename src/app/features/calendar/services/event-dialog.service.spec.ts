import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';

import { ProjectEvent } from '../../../core/models/event.model';
import { EventService } from '../../../core/services/event.service';
import { EventDialogComponent } from '../components/event-dialog/event-dialog';
import { EventDialogService } from './event-dialog.service';

describe('EventDialogService', () => {
  const dialog = { open: vi.fn() };
  const created = { id: 'new', date: '2026-10-20' } as ProjectEvent;
  const eventService = { createEmpty: vi.fn(() => created) };
  let service: EventDialogService;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: Dialog, useValue: dialog },
        { provide: EventService, useValue: eventService },
      ],
    });
    service = TestBed.inject(EventDialogService);
  });

  it('ouvre un nouvel évènement à la date donnée', () => {
    service.create('2026-10-20');

    expect(eventService.createEmpty).toHaveBeenCalledWith('2026-10-20', undefined);
    expect(dialog.open).toHaveBeenCalledWith(
      EventDialogComponent,
      expect.objectContaining({
        data: { event: created, isNew: true, allDay: false },
        panelClass: 'tf-dialog-panel',
      }),
    );
  });

  it('ouvre un évènement existant pour modification', () => {
    const event = { id: 'e1' } as ProjectEvent;

    service.edit(event);

    expect(dialog.open.mock.calls[0][1].data).toEqual({ event, isNew: false, allDay: false });
  });

  it('transmet l’heure de départ d’un évènement créé dans la grille', () => {
    service.create('2026-10-20', '14:30');

    expect(eventService.createEmpty).toHaveBeenCalledWith('2026-10-20', '14:30');
  });

  it('peut créer un évènement sans horaire', () => {
    service.create('2026-10-20', undefined, true);

    expect(dialog.open.mock.calls[0][1].data).toMatchObject({ isNew: true, allDay: true });
  });
});
