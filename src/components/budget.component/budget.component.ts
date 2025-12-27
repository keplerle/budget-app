import { Component, OnInit, signal, viewChild, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as CryptoJS from 'crypto-js';
import { HeaderComponent } from "../header.component/header.component";
import { LockScreenComponent } from "../lock-screen.component/lock-screen.component";
import { ToolbarComponent } from "../toolbar.component/toolbar.component";
import { MonthlyGoalComponent } from '../input-budget/monthly-goal.component/monthly-goal.component';
import { MonthlyBudgetComponent } from '../input-budget/monthly-budget.component/monthly-budget.component';
import { IncomeComponent } from '../input-budget/income.component/income.component';
import { ExpenseComponent } from '../input-budget/expense.component/expense.component';
import { CategoryComponent } from '../input-budget/category.component/category.component';
import { KpiComponent } from '../kpi.component/kpi.component';
import { ExpenseListComponent } from "../expense-list.component/expense-list.component";
import { ChartListComponent } from '../chart-list.component/chart-list.component';
import { UtilService } from '../../services/util.service';

@Component({
  selector: 'app-budget',
  standalone: true,
  templateUrl: './budget.component.html',
  styleUrls: ['./budget.component.scss'],
  imports: [
    FormsModule,
    HeaderComponent,
    LockScreenComponent,
    ToolbarComponent,
    MonthlyGoalComponent,
    MonthlyBudgetComponent,
    IncomeComponent,
    ExpenseComponent,
    CategoryComponent,
    KpiComponent,
    ExpenseListComponent,
    ChartListComponent
  ]
})
export class BudgetComponent implements OnInit {
  readonly ref = viewChild<ChartListComponent>('chartList');

  isLocked: WritableSignal<boolean>;
  storedPin: WritableSignal<string>;

  categories: string[] = [];
  expenses: Expense[] = [];

  income = 0;
  monthlyGoal = 0;
  monthlyBudget = 0;

  selectedMonth = '';
  selectedCategoryForTrend = '';
  selectedYear = new Date().getFullYear().toString();

  isDark = true;

  private readonly STORAGE_KEY = 'budget-app-data';

  constructor(readonly utilService: UtilService) {
    const savedPin = localStorage.getItem('app_pin');
    if (savedPin) {
      const bytes = CryptoJS.AES.decrypt(savedPin, 'master_key');
      this.storedPin = signal(bytes.toString(CryptoJS.enc.Utf8));
    } else {
      this.storedPin = signal('');
    }

    this.isLocked = signal(!!savedPin);

    const encExpenses = localStorage.getItem('expenses');
    const encCategories = localStorage.getItem('categories');
    const encIncome = localStorage.getItem('income');
    const savedBudget = localStorage.getItem('monthlyBudget');

    this.monthlyBudget = savedBudget ? this.decrypt(savedBudget) || 0 : 0;
    this.expenses = encExpenses ? this.decrypt(encExpenses) || [] : [];
    this.categories = encCategories ? this.decrypt(encCategories) || [] : [];
    this.income = encIncome ? this.decrypt(encIncome) || 0 : 0;
  }

  get totalExpenses() {
    return this.filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }

  get filteredExpenses() {
    if (!this.selectedMonth) return this.expenses;

    return this.expenses.filter(e =>
      e.date.startsWith(this.selectedMonth)
    );
  }

  get groupedExpenses() {
    const groups: Record<string, number> = {};

    this.filteredExpenses.forEach(e => {
      groups[e.category] = (groups[e.category] || 0) + e.amount;
    });

    return groups;
  }

  get previousMonthTotal() {
    if (!this.selectedMonth) return 0;

    const prev = this.utilService.getPreviousMonth(this.selectedMonth);

    return this.expenses
      .filter(e => e.date?.startsWith(prev))
      .reduce((sum, e) => sum + e.amount, 0);
  }

  get monthComparisonPercent() {
    const prev = this.previousMonthTotal;
    if (prev === 0) return 0;

    return Math.round(((this.totalExpenses - prev) / prev) * 100);
  }

  get yearlyTotals() {
    const totals = Array(12).fill(0);

    this.expenses.forEach(e => {
      if (!e.date) return;

      const year = e.date.slice(0, 4);
      if (year !== this.selectedYear) return;

      const month = Number(e.date.slice(5, 7)) - 1;
      totals[month] += e.amount;
    });

    return totals;
  }

  get dailyAverage() {
    if (!this.selectedMonth) return 0;

    const today = new Date();
    const [year, month] = this.selectedMonth.split('-').map(Number);

    // Si on regarde un mois passé → on prend le nombre total de jours du mois
    const isCurrentMonth =
      today.getFullYear() === year && today.getMonth() + 1 === month;

    const daysPassed = isCurrentMonth
      ? today.getDate()
      : new Date(year, month, 0).getDate();

    const total = this.filteredExpenses.reduce((a, b) => a + b.amount, 0);

    return Math.round(total / daysPassed);
  }

  get endOfMonthProjection() {
    if (!this.selectedMonth) return 0;

    const [year, month] = this.selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    return Math.round(this.dailyAverage * daysInMonth);
  }

  get encryptionKey() {
    return this.storedPin() || 'default_key';
  }

  get fullBackup() {
    return {
      expenses: this.expenses,
      categories: this.categories,
      income: this.income,
      timestamp: new Date().toISOString()
    };
  }

  ngOnInit() {
    const saved: 'light' | 'dark' = localStorage.getItem('theme') as 'light' | 'dark';

    if (saved) {
      this.applyTheme(saved);
      return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.applyTheme(prefersDark ? 'dark' : 'light');
  }

  lockStatusChange = (locked: boolean) => {
    this.isLocked.set(locked);
  }

  storedPinChange = (newPin: string) => {
    this.storedPin.set(newPin);
  }

  applyTheme(theme: 'light' | 'dark') {
    const body = document.body;

    if (theme === 'dark') {
      body.classList.add('dark-theme');
    } else {
      body.classList.remove('dark-theme');
    }

    localStorage.setItem('theme', theme);
    this.isDark = theme === 'dark';
  }

  loadFromStorage() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      this.income = data.income ?? 0;
      this.expenses = Array.isArray(data.expenses) ? data.expenses : [];
    } catch {
      // si JSON cassé, on ignore
    }
  }

  saveToStorage() {
    const encryptedExpenses = this.encrypt(this.expenses);
    const encryptedCategories = this.encrypt(this.categories);
    const encryptedIncome = this.encrypt(this.income);
    const encryptedBudget = this.encrypt(this.monthlyBudget);
    localStorage.setItem('monthlyBudget', encryptedBudget);
    localStorage.setItem('expenses', encryptedExpenses);
    localStorage.setItem('categories', encryptedCategories);
    localStorage.setItem('income', encryptedIncome);
  }

  addExpense(expense: Expense) {
    this.expenses.push(expense);
    this.saveToStorage();
  }

  removeExpense(id: number) {
    const index = this.expenses.findIndex(e => e.id === id);
    this.expenses.splice(index, 1);
    this.saveToStorage();
  }

  updateFilter(selectedMonth: string) {
    this.selectedMonth = selectedMonth;
  }

  afterCategoriesChange(categories: string[]) {
    this.categories = categories;
    const encryptedCategories = this.encrypt(this.categories);
    localStorage.setItem('categories', encryptedCategories);
  }

  encrypt(data: any): string {
    return CryptoJS.AES.encrypt(JSON.stringify(data), this.encryptionKey).toString();
  }

  decrypt(cipher: string): any {
    try {
      const bytes = CryptoJS.AES.decrypt(cipher, this.encryptionKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  exportPDF() {
    const element = document.getElementById('budget-content'); // ton conteneur principal
    if (element) {

      html2canvas(element, { scale: 2 }).then(canvas => {

        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;
        const margin = 10;
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth - margin * 2, imgHeight);
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save('budget.pdf');
      });
    }
  }

  expensesForCSV(exportMode: string) {
    if (exportMode === 'month' && this.selectedMonth) {
      return this.filteredExpenses;
    }
    return this.expenses;
  }

  generateCSV(exportMode: string) {
    const rows = [
      ['date', 'category', 'amount'] // en-tête
    ];

    this.expensesForCSV(exportMode).forEach(e => {
      rows.push([
        e.date,
        e.category,
        e.amount.toString()
      ]);
    });

    return rows.map(r => r.join(';')).join('\n');
  }

  exportCSV(exportMode: string) {
    const csv = this.generateCSV(exportMode);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `budget_${date}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  exportEncrypted() {
    const data = this.fullBackup;
    const encrypted = this.encrypt(data); // AES avec ton PIN

    const blob = new Blob([encrypted], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'budget_secure_backup.json';
    a.click();

    URL.revokeObjectURL(url);
  }

  importEncrypted(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const encryptedText = reader.result as string;
      const decrypted = this.decrypt(encryptedText);

      if (!decrypted) {
        alert('Impossible de déchiffrer le fichier. PIN incorrect ?');
        return;
      }

      this.expenses = decrypted.expenses || [];
      this.categories = decrypted.categories || [];
      this.income = decrypted.income || 0;

      this.saveToStorage();
      alert('Données restaurées avec succès !');
    };

    reader.readAsText(file);
  }
}