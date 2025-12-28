import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Expense } from '../../../model/expense';

@Component({
  selector: 'app-expense',
  imports: [FormsModule],
  templateUrl: './expense.component.html',
  styleUrl: './expense.component.scss',
})
export class ExpenseComponent {
  expenseAmount = 0;
  expenseCategory = '';
  expenseDate = '';

  readonly categories = input<string[]>();
  readonly addExpenseHandler = output<Expense>();

  addExpense() {
    if (this.expenseAmount > 0 && this.expenseCategory.trim()) {
      const dateToUse = this.expenseDate
        ? new Date(this.expenseDate).toISOString()
        : new Date().toISOString();
      this.addExpenseHandler.emit({
        id: Date.now(),
        amount: this.expenseAmount,
        category: this.expenseCategory.trim(),
        date: dateToUse
      });

      this.expenseAmount = 0;
      this.expenseCategory = '';
      this.expenseDate = '';
    }
  }
}
