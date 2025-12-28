import { Injectable } from '@angular/core';
import { Expense } from '../model/expense';
import { UtilService } from './util.service';

@Injectable({
  providedIn: 'root'
})
export class BudgetCalculationService {
  constructor(private utilService: UtilService) {}

  getFilteredExpenses(expenses: Expense[], selectedMonth: string): Expense[] {
    if (!selectedMonth) return expenses;
    return expenses.filter(e => e.date.startsWith(selectedMonth));
  }

  getTotalExpenses(filteredExpenses: Expense[]): number {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }

  getGroupedExpenses(filteredExpenses: Expense[]): Record<string, number> {
    const groups: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      groups[e.category] = (groups[e.category] || 0) + e.amount;
    });
    return groups;
  }

  getPreviousMonthTotal(expenses: Expense[], selectedMonth: string): number {
    if (!selectedMonth) return 0;
    const prev = this.utilService.getPreviousMonth(selectedMonth);
    return expenses
      .filter(e => e.date?.startsWith(prev))
      .reduce((sum, e) => sum + e.amount, 0);
  }

  getMonthComparisonPercent(totalExpenses: number, previousMonthTotal: number): number {
    if (previousMonthTotal === 0) return 0;
    return Math.round(((totalExpenses - previousMonthTotal) / previousMonthTotal) * 100);
  }

  getYearlyTotals(expenses: Expense[], selectedYear: string): number[] {
    const totals = Array(12).fill(0);
    expenses.forEach(e => {
      if (!e.date) return;
      const year = e.date.slice(0, 4);
      if (year !== selectedYear) return;
      const month = Number(e.date.slice(5, 7)) - 1;
      totals[month] += e.amount;
    });
    return totals;
  }

  getDailyAverage(filteredExpenses: Expense[], selectedMonth: string): number {
    if (!selectedMonth) return 0;
    const today = new Date();
    const [year, month] = selectedMonth.split('-').map(Number);
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
    const daysPassed = isCurrentMonth ? today.getDate() : new Date(year, month, 0).getDate();
    const total = filteredExpenses.reduce((a, b) => a + b.amount, 0);
    return Math.round(total / daysPassed);
  }

  getEndOfMonthProjection(dailyAverage: number, selectedMonth: string): number {
    if (!selectedMonth) return 0;
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    return Math.round(dailyAverage * daysInMonth);
  }
}