import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-monthly-budget',
  imports: [FormsModule],
  templateUrl: './monthly-budget.component.html',
  styleUrl: './monthly-budget.component.scss',
})
export class MonthlyBudgetComponent {
  monthlyBudget = model<number>();
  readonly totalExpenses = input<number>();

  get budgetUsedPercent() {
    const monthlyBudget = this.monthlyBudget();
    const totalExpenses = this.totalExpenses() ?? 0;
    if (!monthlyBudget) return 0;
    return Math.min(100, Math.round((totalExpenses / monthlyBudget) * 100));
  }
}
