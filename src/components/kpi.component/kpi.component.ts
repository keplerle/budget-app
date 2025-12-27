import { Component, input } from '@angular/core';

@Component({
  selector: 'app-kpi',
  imports: [],
  templateUrl: './kpi.component.html',
  styleUrl: './kpi.component.scss',
})
export class KpiComponent {
  readonly yearlyTotals = input<number[]>([]);
  readonly monthlyGoal = input<number>(0);
  readonly monthlyBudget = input<number>(0);
  readonly totalExpenses = input<number>(0);
  readonly income = input<number>(0);
  readonly filteredExpenses = input<Expense[]>([]);
  readonly selectedYear = input<string>();  
  readonly selectedMonth = input<string>();
  readonly endOfMonthProjection = input<number>(0);
  readonly dailyAverage = input<number>(0);
  readonly monthComparisonPercent = input<number>(0);

  get yearlyTotal() {
    return this.yearlyTotals().reduce((a, b) => a + b, 0);
  }

  get yearlyAverage() {
    return Math.round(this.yearlyTotal / 12);
  }

  get highestMonth() {
    const max = Math.max(...this.yearlyTotals());
    const index = this.yearlyTotals().indexOf(max);
    return { month: index + 1, value: max };
  }

  get lowestMonth() {
    const min = Math.min(...this.yearlyTotals());
    const index = this.yearlyTotals().indexOf(min);
    return { month: index + 1, value: min };
  }

  get balance() {
    return this.income() - this.totalExpenses();
  }

}
