import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoPaciente } from './info-paciente';

describe('InfoPaciente', () => {
  let component: InfoPaciente;
  let fixture: ComponentFixture<InfoPaciente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoPaciente],
    }).compileComponents();

    fixture = TestBed.createComponent(InfoPaciente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
