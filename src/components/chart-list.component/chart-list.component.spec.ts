import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChartListComponent } from './chart-list.component';

describe('ChartListComponent', () => {
  let component: ChartListComponent;
  let fixture: ComponentFixture<ChartListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChartListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
