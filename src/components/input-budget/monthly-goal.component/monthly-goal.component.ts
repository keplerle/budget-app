import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-monthly-goal',
  imports: [FormsModule],
  templateUrl: './monthly-goal.component.html',
  styleUrl: './monthly-goal.component.scss',
})
export class MonthlyGoalComponent {

  readonly monthlyGoal = model<number>();
  readonly totalExpenses = input<number>();

  get saved() {
    const goal = this.monthlyGoal() ?? 0;
    const totalExpenses = this.totalExpenses() ?? 0;
    return goal - totalExpenses;
  }

  saveGoal() {
    localStorage.setItem('monthlyGoal', String(this.monthlyGoal()));
  }

  get goalProgress() {
    const goal = this.monthlyGoal();

    if (!goal) return 0;

    const percent = (this.saved / goal) * 100;
    return Math.max(0, Math.min(100, Math.round(percent)));
  }
}
