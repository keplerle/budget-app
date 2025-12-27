import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UtilService } from '../../services/util.service';

@Component({
  selector: 'app-expense-list',
  imports: [FormsModule],
  templateUrl: './expense-list.component.html',
  styleUrl: './expense-list.component.scss',
})
export class ExpenseListComponent {
  readonly selectedMonth = model<string>();
  readonly filteredExpenses = input<Expense[]>([]);
  readonly groupedExpenses = input<Record<string, number>>({});
  readonly expenses = input<Expense[]>([]);

  readonly removeExpenseChange = output<number>();
  readonly updatedFilterChange = output<string>();

  constructor(private utilService: UtilService) { }

  get groupedExpensesArray() {
    return Object.entries(this.groupedExpenses());
  }

  get months(): { value: string; label: string }[] {
    const uniqueMonths = new Set<string>();

    this.expenses().forEach(e => {
      const month = e.date.slice(0, 7); // ex: "2025-03"
      uniqueMonths.add(month);
    });

    // Convertit en tableau trié
    return Array.from(uniqueMonths)
      .sort()
      .map(m => ({
        value: m,
        label: this.utilService.formatMonthLabel(m)
      }));
  }

  updateFilter(selectedMonth: string) {
    this.updatedFilterChange.emit(selectedMonth);
  }

  removeExpense(id: number) {
    this.removeExpenseChange.emit(id);
  }
}
