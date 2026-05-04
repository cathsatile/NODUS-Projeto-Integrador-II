import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectionResume } from './section-resume';

describe('SectionResume', () => {
  let component: SectionResume;
  let fixture: ComponentFixture<SectionResume>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionResume],
    }).compileComponents();

    fixture = TestBed.createComponent(SectionResume);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
