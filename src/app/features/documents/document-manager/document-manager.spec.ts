import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentManagerComponent } from './document-manager';

describe('DocumentManagerComponent', () => {
  let component: DocumentManagerComponent;
  let fixture: ComponentFixture<DocumentManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentManagerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentManagerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
