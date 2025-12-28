import { Component, OnInit, signal, viewChild, WritableSignal, computed } from '@angular/core';
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
import { BudgetDataService } from '../../services/budget-data.service';
import { BudgetCalculationService } from '../../services/budget-calculation.service';
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
    private themeService: ThemeService,
    readonly dataService: BudgetDataService,
    private calcService: BudgetCalculationService) {
    this.storedPin = signal(this.storageService.loadPin());
    this.isLocked = signal(!!this.storedPin());
  }

  filteredExpenses = computed(() => this.calcService.getFilteredExpenses(this.dataService.expenses(), this.selectedMonth));

  totalExpenses = computed(() => this.calcService.getTotalExpenses(this.filteredExpenses()));

  groupedExpenses = computed(() => this.calcService.getGroupedExpenses(this.filteredExpenses()));

  previousMonthTotal = computed(() => this.calcService.getPreviousMonthTotal(this.dataService.expenses(), this.selectedMonth));

  monthComparisonPercent = computed(() => this.calcService.getMonthComparisonPercent(this.totalExpenses(), this.previousMonthTotal()));

  yearlyTotals = computed(() => this.calcService.getYearlyTotals(this.dataService.expenses(), this.selectedYear));

  dailyAverage = computed(() => this.calcService.getDailyAverage(this.filteredExpenses(), this.selectedMonth));

  endOfMonthProjection = computed(() => this.calcService.getEndOfMonthProjection(this.dailyAverage(), this.selectedMonth));

  get encryptionKey() {
    return this.storedPin() || 'default_key';
  }

  get fullBackup() {
    return {
      expenses: this.dataService.expenses(),
      categories: this.dataService.categories(),
      income: this.dataService.income(),
      timestamp: new Date().toISOString()
    };
  }

  ngOnInit() {
    this.themeService.loadTheme();
    this.dataService.loadData(this.encryptionKey);
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

  saveData() {
    this.dataService.saveData(this.encryptionKey);
  }

  addExpense(expense: Expense) {
    this.dataService.addExpense(expense);
    this.saveData();
  }

  removeExpense(id: number) {
    this.dataService.removeExpense(id);
    this.saveData();
  }

  updateFilter(selectedMonth: string) {
    this.selectedMonth = selectedMonth;
  }

  afterCategoriesChange(categories: string[]) {
    this.dataService.updateCategories(categories);
    this.saveData();
  }

  exportPDF() {
    this.exportService.exportPDF('budget-content');
  }

  exportCSV(exportMode: string) {
    this.exportService.exportCSV(this.dataService.expenses(), exportMode, this.selectedMonth);
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

      this.dataService.expenses.set(decrypted.expenses || []);
      this.dataService.categories.set(decrypted.categories || []);
      this.dataService.income.set(decrypted.income || 0);

      this.saveData();
      alert('Données restaurées avec succès !');
    };

    reader.readAsText(file);
  }
}