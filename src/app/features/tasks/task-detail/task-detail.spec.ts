import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Task } from '../../../core/models/task.model';
import { TaskDetailComponent } from './task-detail';

const task: Task = {
  id: '1',
  title: 'Mettre en place l’authentification',
  description: 'Avec Keycloak',
  status: 'TODO',
  priority: 'HIGH',
  checklist: [{ id: 'c1', label: 'Configurer le realm', completed: true }],
  comments: [{ id: 'm1', author: 'Sophie', message: 'OK pour moi', date: '2026-10-01' }],
  attachments: ['schema.pdf'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('TaskDetailComponent', () => {
  let component: TaskDetailComponent;
  let fixture: ComponentFixture<TaskDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskDetailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskDetailComponent);
    component = fixture.componentInstance;
    component.task = task;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('affiche le titre, la description, la checklist, les commentaires et les documents', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Mettre en place l’authentification');
    expect(text).toContain('Avec Keycloak');
    expect(text).toContain('Configurer le realm');
    expect(text).toContain('Sophie');
    expect(text).toContain('OK pour moi');
    expect(text).toContain('schema.pdf');
  });
});
