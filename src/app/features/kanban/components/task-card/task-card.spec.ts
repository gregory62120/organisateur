import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Task } from '../../../../core/models/task.model';
import { TaskCardComponent } from './task-card';

const baseTask: Task = {
  id: '1',
  title: 'Mettre en place l’authentification',
  description: '',
  status: 'TODO',
  priority: 'HIGH',
  tags: ['Backend', 'Sécurité'],
  assignedTo: 'Sophie Martin',
  checklist: [
    { id: 'a', label: 'a', completed: true },
    { id: 'b', label: 'b', completed: false },
  ],
  comments: [{ id: 'c', author: 'x', message: 'm', date: '2026-01-01' }],
  attachments: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('TaskCardComponent', () => {
  let fixture: ComponentFixture<TaskCardComponent>;
  let el: HTMLElement;

  async function render(task: Task = baseTask) {
    fixture = TestBed.createComponent(TaskCardComponent);
    fixture.componentRef.setInput('task', task);
    await fixture.whenStable();
    el = fixture.nativeElement;
  }

  beforeEach(() => TestBed.configureTestingModule({ imports: [TaskCardComponent] }));

  it('affiche titre, étiquettes, priorité, checklist, commentaires et initiales', async () => {
    await render();

    expect(el.querySelector('h3')?.textContent).toContain('authentification');
    expect([...el.querySelectorAll('.tags li')].map((li) => li.textContent)).toEqual([
      'Backend',
      'Sécurité',
    ]);
    expect(el.querySelector('.priority')?.textContent).toContain('Haute');
    expect(el.textContent).toContain('1/2');
    expect(el.querySelector('.avatar')?.textContent?.trim()).toBe('SM');
  });

  it('colore chaque étiquette', async () => {
    await render();

    const tag = el.querySelector<HTMLElement>('.tags li')!;
    expect(tag.style.color).not.toBe('');
  });

  it('masque les blocs optionnels quand ils sont vides', async () => {
    await render({
      ...baseTask,
      tags: [],
      checklist: [],
      comments: [],
      assignedTo: undefined,
    });

    expect(el.querySelector('.tags')).toBeNull();
    expect(el.querySelector('.avatar')).toBeNull();
    expect(el.querySelector('.due')).toBeNull();
  });

  it('marque l’échéance dépassée', async () => {
    await render({ ...baseTask, dueDate: '2020-01-01' });

    expect(el.querySelector('.due.overdue')).not.toBeNull();
  });

  it('émet opened au clic sur la carte', async () => {
    await render();
    const spy = vi.fn();
    fixture.componentInstance.opened.subscribe(spy);

    el.querySelector<HTMLElement>('article')!.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('émet removed sans ouvrir la carte au clic sur supprimer', async () => {
    await render();
    const opened = vi.fn();
    const removed = vi.fn();
    fixture.componentInstance.opened.subscribe(opened);
    fixture.componentInstance.removed.subscribe(removed);

    el.querySelector<HTMLElement>('.delete')!.click();

    expect(removed).toHaveBeenCalledTimes(1);
    expect(opened).not.toHaveBeenCalled();
  });
});
