import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';

import { Task } from '../../../core/models/task.model';
import { SubtaskDialogComponent } from '../components/subtask-dialog/subtask-dialog';
import { TaskDialogComponent } from '../components/task-dialog/task-dialog';
import { TaskDialogService } from './task-dialog.service';

describe('TaskDialogService', () => {
  const dialog = { open: vi.fn() };
  const task = { id: 't' } as Task;
  let service: TaskDialogService;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: Dialog, useValue: dialog }] });
    service = TestBed.inject(TaskDialogService);
  });

  it('ouvre le formulaire d’une tâche existante', () => {
    service.openTask(task);

    expect(dialog.open).toHaveBeenCalledWith(
      TaskDialogComponent,
      expect.objectContaining({ data: { task, isNew: false }, panelClass: 'tf-dialog-panel' }),
    );
  });

  it('ouvre le formulaire en mode création', () => {
    service.openTask(task, true);

    expect(dialog.open.mock.calls[0][1].data).toEqual({ task, isNew: true });
  });

  it('ouvre le formulaire d’une sous-tâche', () => {
    service.openSubtask(task, 's1');

    expect(dialog.open).toHaveBeenCalledWith(
      SubtaskDialogComponent,
      expect.objectContaining({ data: { task, subtaskId: 's1' }, panelClass: 'tf-dialog-panel' }),
    );
  });
});
