import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RunSummaryComponent } from './run-summary.component';

describe('RunSummaryComponent', () => {
  let component: RunSummaryComponent;
  let fixture: ComponentFixture<RunSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RunSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RunSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
