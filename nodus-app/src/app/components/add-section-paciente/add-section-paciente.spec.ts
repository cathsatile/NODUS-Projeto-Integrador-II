import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddSectionPaciente } from './add-section-paciente';

describe('AddSectionPaciente', () => {
  let component: AddSectionPaciente;
  let fixture: ComponentFixture<AddSectionPaciente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddSectionPaciente],
    }).compileComponents();

    fixture = TestBed.createComponent(AddSectionPaciente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
