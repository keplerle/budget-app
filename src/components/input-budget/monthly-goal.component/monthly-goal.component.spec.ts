import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyGoalComponent } from './monthly-goal.component';

describe('MonthlyGoalComponent', () => {
  let component: MonthlyGoalComponent;
  let fixture: ComponentFixture<MonthlyGoalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonthlyGoalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlyGoalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
