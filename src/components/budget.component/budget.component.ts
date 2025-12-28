import { Component, OnInit, signal, viewChild, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
import { ExportService } from '../../services/export.service';
import { StorageService } from '../../services/storage.service';
import { EncryptionService } from '../../services/encryption.service';
import { ThemeService } from '../../services/theme.service';
import { Expense } from '../../model/expense';

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

  get isDark() {
    return this.themeService.isDark();
  }

  private readonly STORAGE_KEY = 'budget-app-data';

  constructor(
    readonly exportService: ExportService,
    readonly utilService: UtilService,
    private storageService: StorageService,
    private encryptionService: EncryptionService,
    private themeService: ThemeService) {
    this.storedPin = signal(this.storageService.loadPin());
    this.isLocked = signal(!!this.storedPin());
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
    this.themeService.loadTheme();
    this.loadData();
  }

  lockStatusChange = (locked: boolean) => {
    this.isLocked.set(locked);
  }

  storedPinChange = (newPin: string) => {
    this.storedPin.set(newPin);
    this.storageService.savePin(newPin);
  }

  applyTheme(theme: 'light' | 'dark') {
    this.themeService.applyTheme(theme);
  }

  loadData() {
    const key = this.encryptionKey;
    this.expenses = this.storageService.loadExpenses(key);
    this.categories = this.storageService.loadCategories(key);
    this.income = this.storageService.loadIncome(key);
    this.monthlyBudget = this.storageService.loadMonthlyBudget(key);
  }

  saveData() {
    const key = this.encryptionKey;
    this.storageService.saveExpenses(this.expenses, key);
    this.storageService.saveCategories(this.categories, key);
    this.storageService.saveIncome(this.income, key);
    this.storageService.saveMonthlyBudget(this.monthlyBudget, key);
  }

  addExpense(expense: Expense) {
    this.expenses.push(expense);
    this.saveData();
  }

  removeExpense(id: number) {
    const index = this.expenses.findIndex(e => e.id === id);
    this.expenses.splice(index, 1);
    this.saveData();
  }

  updateFilter(selectedMonth: string) {
    this.selectedMonth = selectedMonth;
  }

  afterCategoriesChange(categories: string[]) {
    this.categories = categories;
    this.saveData();
  }

  exportPDF() {
    this.exportService.exportPDF('budget-content');
  }

  exportCSV(exportMode: string) {
    this.exportService.exportCSV(this.expenses, exportMode, this.selectedMonth);
  }

  exportEncrypted() {
    this.exportService.exportEncrypted(this.fullBackup, this.encryptionKey);
  }

  importEncrypted(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const encryptedText = reader.result as string;
      const decrypted = this.encryptionService.decrypt(encryptedText, this.encryptionKey);

      if (!decrypted) {
        alert('Impossible de déchiffrer le fichier. PIN incorrect ?');
        return;
      }

      this.expenses = decrypted.expenses || [];
      this.categories = decrypted.categories || [];
      this.income = decrypted.income || 0;

      this.saveData();
      alert('Données restaurées avec succès !');
    };

    reader.readAsText(file);
  }
}