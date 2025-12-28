import { Injectable, signal, WritableSignal } from '@angular/core';
import { StorageService } from './storage.service';
import { Expense } from '../model/expense';

export interface BudgetData {
  expenses: Expense[];
  categories: string[];
  income: number;
  monthlyBudget: number;
  monthlyGoal: number;
}

@Injectable({
  providedIn: 'root'
})
export class BudgetDataService {
  private expensesSignal: WritableSignal<Expense[]> = signal([]);
  private categoriesSignal: WritableSignal<string[]> = signal([]);
  private incomeSignal: WritableSignal<number> = signal(0);
  private monthlyBudgetSignal: WritableSignal<number> = signal(0);
  private monthlyGoalSignal: WritableSignal<number> = signal(0);

  constructor(private storageService: StorageService) {}

  get expenses(): WritableSignal<Expense[]> {
    return this.expensesSignal;
  }

  get categories(): WritableSignal<string[]> {
    return this.categoriesSignal;
  }

  get income(): WritableSignal<number> {
    return this.incomeSignal;
  }

  get monthlyBudget(): WritableSignal<number> {
    return this.monthlyBudgetSignal;
  }

  get monthlyGoal(): WritableSignal<number> {
    return this.monthlyGoalSignal;
  }

  loadData(key: string): void {
    this.expensesSignal.set(this.storageService.loadExpenses(key));
    this.categoriesSignal.set(this.storageService.loadCategories(key));
    this.incomeSignal.set(this.storageService.loadIncome(key));
    this.monthlyBudgetSignal.set(this.storageService.loadMonthlyBudget(key));
    this.monthlyGoalSignal.set(this.storageService.loadMonthlyGoal(key));
  }

  saveData(key: string): void {
    this.storageService.saveExpenses(this.expensesSignal(), key);
    this.storageService.saveCategories(this.categoriesSignal(), key);
    this.storageService.saveIncome(this.incomeSignal(), key);
    this.storageService.saveMonthlyBudget(this.monthlyBudgetSignal(), key);
    this.storageService.saveMonthlyGoal(this.monthlyGoalSignal(), key);
  }

  addExpense(expense: Expense): void {
    this.expensesSignal.update(expenses => [...expenses, expense]);
  }

  removeExpense(id: number): void {
    this.expensesSignal.update(expenses => expenses.filter(e => e.id !== id));
  }

  updateCategories(categories: string[]): void {
    this.categoriesSignal.set(categories);
  }

  updateIncome(income: number): void {
    this.incomeSignal.set(income);
  }

  updateMonthlyBudget(budget: number): void {
    this.monthlyBudgetSignal.set(budget);
  }

  updateMonthlyGoal(goal: number): void {
    this.monthlyGoalSignal.set(goal);
  }
}