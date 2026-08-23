import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileDropZone } from './file-drop-zone';

describe('FileDropZone', () => {
  let component: FileDropZone;
  let fixture: ComponentFixture<FileDropZone>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileDropZone]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FileDropZone);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
