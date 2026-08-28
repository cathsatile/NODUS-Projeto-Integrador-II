import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { AddSectionPaciente } from './add-section-paciente';

describe('AddSectionPaciente', () => {
  let component: AddSectionPaciente;
  let fixture: ComponentFixture<AddSectionPaciente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddSectionPaciente],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: { add: 'sessao' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddSectionPaciente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
