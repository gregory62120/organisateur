import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectHomeComponent } from './project-home';

describe('ProjectHome', () => {
  let component: ProjectHomeComponent;
  let fixture: ComponentFixture<ProjectHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectHomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectHomeComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
