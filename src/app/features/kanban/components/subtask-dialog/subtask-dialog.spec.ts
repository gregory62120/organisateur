import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';

import { Task } from '../../../../core/models/task.model';
import { TaskService } from '../../../../core/services/task.service';
import { SubtaskDialogComponent } from './subtask-dialog';

const task: Task = {
  id: 'parent',
  title: 'Parent',
  description: '',
  status: 'TODO',
  priority: 'LOW',
  checklist: [
    { id: '1', label: 'Première', completed: false, description: '<p>x</p>' },
    { id: '2', label: 'Seconde', completed: true },
  ],
  comments: [],
  attachments: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('SubtaskDialogComponent', () => {
  const taskService = { update: vi.fn() };
  const dialogRef = { close: vi.fn() };

  function create(subtaskId = '1') {
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: { task, subtaskId } },
        { provide: DialogRef, useValue: dialogRef },
        { provide: TaskService, useValue: taskService },
      ],
    });
    return TestBed.runInInjectionContext(() => new SubtaskDialogComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('charge les valeurs de la sous-tâche', () => {
    const dialog = create();

    expect(dialog.label()).toBe('Première');
    expect(dialog.content()).toBe('<p>x</p>');
    expect(dialog.parentTitle).toBe('Parent');
  });

  it('enregistre uniquement la sous-tâche modifiée dans la tâche parente', () => {
    const dialog = create();
    dialog.label.set('  Renommée ');
    dialog.completed.set(true);
    dialog.assignedTo.set('Sophie');
    dialog.dueDate.set('2026-10-12');

    dialog.save();

    const saved = taskService.update.mock.calls[0][0] as Task;
    expect(saved.id).toBe('parent');
    expect(saved.checklist[0]).toEqual({
      id: '1',
      label: 'Renommée',
      completed: true,
      assignedTo: 'Sophie',
      dueDate: '2026-10-12',
      description: '<p>x</p>',
    });
    expect(saved.checklist[1]).toEqual(task.checklist[1]);
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('utilise « Sans titre » et retire les champs vides', () => {
    const dialog = create();
    dialog.label.set(' ');
    dialog.content.set('');

    dialog.save();

    const item = (taskService.update.mock.calls[0][0] as Task).checklist[0];
    expect(item.label).toBe('Sans titre');
    expect(item.description).toBeUndefined();
    expect(item.assignedTo).toBeUndefined();
  });

  it('supprime la sous-tâche après confirmation', () => {
    create('2').remove();

    expect((taskService.update.mock.calls[0][0] as Task).checklist.map((i) => i.id)).toEqual(['1']);
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('ne supprime pas si la confirmation est refusée, et annuler n’écrit rien', () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    );
    const dialog = create();

    dialog.remove();
    dialog.close();

    expect(taskService.update).not.toHaveBeenCalled();
  });
});
