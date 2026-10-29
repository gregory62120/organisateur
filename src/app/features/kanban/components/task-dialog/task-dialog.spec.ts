import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';

import { Task } from '../../../../core/models/task.model';
import { TaskService } from '../../../../core/services/task.service';
import { TaskDialogComponent, TaskDialogData } from './task-dialog';

const task: Task = {
  id: 'abc',
  title: 'Titre initial',
  description: '<p>desc</p>',
  status: 'TODO',
  priority: 'LOW',
  tags: ['UI'],
  checklist: [],
  comments: [],
  attachments: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('TaskDialogComponent', () => {
  const taskService = { add: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const dialogRef = { close: vi.fn() };

  function create(data: TaskDialogData) {
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: data },
        { provide: DialogRef, useValue: dialogRef },
        { provide: TaskService, useValue: taskService },
      ],
    });
    // Le composant n'est pas rendu : l'éditeur riche n'est pas utile à ces tests.
    return TestBed.runInInjectionContext(() => new TaskDialogComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('enregistre une tâche existante avec update', () => {
    const dialog = create({ task });
    dialog.title.set('  Nouveau titre  ');
    dialog.status.set('DONE');
    dialog.assignedTo.set('Sophie');
    dialog.dueDate.set('2026-10-12');

    dialog.save();

    expect(taskService.add).not.toHaveBeenCalled();
    expect(taskService.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'abc',
        title: 'Nouveau titre',
        status: 'DONE',
        assignedTo: 'Sophie',
        dueDate: '2026-10-12',
      }),
    );
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('crée une nouvelle tâche avec add (rien n’est écrit avant)', () => {
    const dialog = create({ task, isNew: true });
    expect(taskService.add).not.toHaveBeenCalled();

    dialog.save();

    expect(taskService.add).toHaveBeenCalledTimes(1);
    expect(taskService.update).not.toHaveBeenCalled();
  });

  it('fermer sans enregistrer n’écrit rien', () => {
    const dialog = create({ task, isNew: true });

    dialog.close();

    expect(taskService.add).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('utilise « Sans titre » quand le titre est vide et retire les champs vides', () => {
    const dialog = create({ task });
    dialog.title.set('   ');
    dialog.assignedTo.set(' ');
    dialog.dueDate.set('');

    dialog.save();

    const saved = taskService.update.mock.calls[0][0] as Task;
    expect(saved.title).toBe('Sans titre');
    expect(saved.assignedTo).toBeUndefined();
    expect(saved.dueDate).toBeUndefined();
  });

  it('ajoute les étiquettes sans doublon ni valeur vide, et les retire', () => {
    const dialog = create({ task });

    dialog.newTag.set('API');
    dialog.addTag();
    dialog.newTag.set('API');
    dialog.addTag();
    dialog.newTag.set('   ');
    dialog.addTag();
    expect(dialog.tags()).toEqual(['UI', 'API']);

    dialog.removeTag('UI');
    expect(dialog.tags()).toEqual(['API']);
  });

  it('prend en compte l’étiquette en cours de saisie à l’enregistrement', () => {
    const dialog = create({ task });
    dialog.newTag.set('Perf');

    dialog.save();

    expect((taskService.update.mock.calls[0][0] as Task).tags).toEqual(['UI', 'Perf']);
  });

  it('supprime la tâche après confirmation', () => {
    const dialog = create({ task });

    dialog.remove();

    expect(taskService.delete).toHaveBeenCalledWith('abc');
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('ne supprime pas si la confirmation est refusée', () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    const dialog = create({ task });

    dialog.remove();

    expect(taskService.delete).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
