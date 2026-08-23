import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentManager } from './document-manager';

describe('DocumentManager', () => {
  let component: DocumentManager;
  let fixture: ComponentFixture<DocumentManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentManager]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentManager);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
