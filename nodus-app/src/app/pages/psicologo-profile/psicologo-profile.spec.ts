import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PsicologoProfile } from './psicologo-profile';

describe('PsicologoProfile', () => {
  let component: PsicologoProfile;
  let fixture: ComponentFixture<PsicologoProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PsicologoProfile],
    }).compileComponents();

    fixture = TestBed.createComponent(PsicologoProfile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
