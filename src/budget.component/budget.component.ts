import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as CryptoJS from 'crypto-js';
Chart.register(...registerables);

@Component({
  selector: 'app-budget',
  standalone: true,
  templateUrl: './budget.component.html',
  styleUrls: ['./budget.component.scss'],
  imports: [FormsModule]

})
export class BudgetComponent implements OnInit, AfterViewInit {
  isLocked = true;
  pinInput = '';
  storedPin = '';
  csvExportMode = 'all';
  categories: string[] = [];
  income = 0;
  expenseAmount = 0;
  expenseCategory = '';
  expenses: { id: number; amount: number; category: string, date: string }[] = [];
  expenseDate: string = '';
  selectedMonth = '';
  chart: any;
  monthlyChart: any;
  categoryTrendChart: any;
  monthCompareChart: any;
  yearChart: any;
  projectionChart: any;
  isDark = true;
  newCategory = '';
  selectedCategoryForTrend = '';
  monthlyBudget = 0;
  selectedYear = new Date().getFullYear().toString();
  monthlyGoal = 0;

  private readonly STORAGE_KEY = 'budget-app-data';

  constructor() {

    const savedPin = localStorage.getItem('app_pin');
    if (savedPin) {
      const bytes = CryptoJS.AES.decrypt(savedPin, 'master_key');
      this.storedPin = bytes.toString(CryptoJS.enc.Utf8);
    }
    this.isLocked = !!savedPin;

    const encExpenses = localStorage.getItem('expenses');
    const encCategories = localStorage.getItem('categories');
    const encIncome = localStorage.getItem('income');
    const savedBudget = localStorage.getItem('monthlyBudget');
    const savedGoal = localStorage.getItem('monthlyGoal');
    this.monthlyGoal = savedGoal ? Number(savedGoal) : 0;
    this.monthlyBudget = savedBudget ? this.decrypt(savedBudget) || 0 : 0;
    this.expenses = encExpenses ? this.decrypt(encExpenses) || [] : [];
    this.categories = encCategories ? this.decrypt(encCategories) || [] : [];
    this.income = encIncome ? this.decrypt(encIncome) || 0 : 0;

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


  ngAfterViewInit() {
    this.renderChart();
    this.renderMonthlyChart();
    this.renderCategoryTrendChart();
    this.renderMonthCompareChart();
    this.renderYearChart();
    this.renderProjectionChart();
  }

  addCategory() {
    const cat = this.newCategory.trim();
    if (cat && !this.categories.includes(cat)) {
      this.categories.push(cat);
      this.saveCategories();
    }
    this.newCategory = '';
  }

  removeCategory(cat: string) {
    this.categories = this.categories.filter(c => c !== cat);
    this.saveCategories();
  }


  toggleTheme() {
    this.applyTheme(this.isDark ? 'light' : 'dark');

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

  renderChart() {
    if (this.chart) {
      this.chart.destroy();
    }

    const labels = Object.keys(this.groupedExpenses);
    const values = Object.values(this.groupedExpenses);

    this.chart = new Chart('expensesChart', {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF',
              '#FF9F40'
            ]
          }
        ]
      },
      options: {
        animation: {
          duration: 600,
          easing: 'easeOutQuart'
        },
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
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

  addExpense() {
    if (this.expenseAmount > 0 && this.expenseCategory.trim()) {
      const dateToUse = this.expenseDate
        ? new Date(this.expenseDate).toISOString()
        : new Date().toISOString();

      this.expenses.push({
        id: Date.now(),
        amount: this.expenseAmount,
        category: this.expenseCategory.trim(),
        date: dateToUse
      });

      this.expenseAmount = 0;
      this.expenseCategory = '';
      this.expenseDate = '';

      this.saveToStorage();
      this.renderChart();
      this.renderMonthlyChart();
      this.renderCategoryTrendChart();
      this.renderMonthCompareChart();
      this.renderYearChart();
      this.renderProjectionChart();
    }
  }

  removeExpense(index: number) {
    this.expenses.splice(index, 1);
    this.saveToStorage();
    this.renderChart();
    this.renderMonthlyChart();
    this.renderCategoryTrendChart();
    this.renderMonthCompareChart();
    this.renderYearChart();
    this.renderProjectionChart();
  }

  updateFilter() {
    this.renderChart();
    this.renderProjectionChart();
  }

  get totalExpenses() {
    return this.filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }

  get balance() {
    return this.income - this.totalExpenses;
  }

  get groupedExpenses() {
    const groups: Record<string, number> = {};

    this.filteredExpenses.forEach(e => {
      groups[e.category] = (groups[e.category] || 0) + e.amount;
    });

    return groups;
  }

  get groupedExpensesArray() {
    return Object.entries(this.groupedExpenses);
  }


  get filteredExpenses() {
    if (!this.selectedMonth) return this.expenses;

    return this.expenses.filter(e =>
      e.date.startsWith(this.selectedMonth)
    );
  }

  get months() {
    const uniqueMonths = new Set<string>();

    this.expenses.forEach(e => {
      const month = e.date.slice(0, 7); // ex: "2025-03"
      uniqueMonths.add(month);
    });

    // Convertit en tableau trié
    return Array.from(uniqueMonths)
      .sort()
      .map(m => ({
        value: m,
        label: this.formatMonthLabel(m)
      }));
  }

  formatMonthLabel(month: string) {
    const [year, monthNum] = month.split('-').map(Number);

    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    return `${months[monthNum - 1]} ${year}`;
  }

  get monthlyTotals() {
    const map = new Map<string, number>();

    this.expenses.forEach(e => {
      if (!e.date) {
        return;
      }

      const monthKey = e.date.slice(0, 7); // "YYYY-MM"
      const current = map.get(monthKey) ?? 0;
      map.set(monthKey, current + e.amount);
    });

    // Tri par mois croissant
    const sortedKeys = Array.from(map.keys()).sort();

    return sortedKeys.map(key => ({
      key,                 // "2025-03"
      label: this.formatMonthLabel(key), // "Mars 2025"
      total: map.get(key) ?? 0
    }));
  }
  renderMonthlyChart() {
    if (this.monthlyChart) {
      this.monthlyChart.destroy();
    }

    const data = this.monthlyTotals;

    if (!data.length) {
      return;
    }

    const labels = data.map(d => d.label);
    const values = data.map(d => d.total);

    this.monthlyChart = new Chart('monthlyChart', {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Dépenses mensuelles',
            data: values,
            borderColor: '#4fc3f7',
            backgroundColor: 'rgba(79, 195, 247, 0.2)',
            tension: 0.3,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: '#81d4fa'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 600,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            ticks: {
              color: getComputedStyle(document.body)
                .getPropertyValue('--text-color')
                .trim()
            },
            grid: {
              color: 'rgba(255,255,255,0.05)'
            }
          },
          y: {
            ticks: {
              color: getComputedStyle(document.body)
                .getPropertyValue('--text-color')
                .trim()
            },
            grid: {
              color: 'rgba(255,255,255,0.08)'
            }
          }
        }
      }
    });
  }

  saveCategories() {
    localStorage.setItem('categories', JSON.stringify(this.categories));
  }

  get categoryMonthlyTotals() {
    if (!this.selectedCategoryForTrend) {
      return [];
    }

    const map = new Map<string, number>();

    this.expenses.forEach(e => {
      if (!e.date || e.category !== this.selectedCategoryForTrend) {
        return;
      }

      const monthKey = e.date.slice(0, 7); // "YYYY-MM"
      const current = map.get(monthKey) ?? 0;
      map.set(monthKey, current + e.amount);
    });

    const sortedKeys = Array.from(map.keys()).sort();

    return sortedKeys.map(key => ({
      key,
      label: this.formatMonthLabel(key),
      total: map.get(key) ?? 0
    }));
  }
  renderCategoryTrendChart() {
    // si aucune catégorie sélectionnée : on détruit le chart et on sort
    if (this.categoryTrendChart) {
      this.categoryTrendChart.destroy();
      this.categoryTrendChart = null;
    }

    if (!this.selectedCategoryForTrend) {
      return;
    }

    const data = this.categoryMonthlyTotals;
    if (!data.length) {
      return;
    }

    const labels = data.map(d => d.label);
    const values = data.map(d => d.total);

    const textColor = getComputedStyle(document.body)
      .getPropertyValue('--text-color')
      .trim();

    this.categoryTrendChart = new Chart('categoryTrendChart', {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `Dépenses - ${this.selectedCategoryForTrend}`,
            data: values,
            borderColor: '#ffb74d',
            backgroundColor: 'rgba(255, 183, 77, 0.2)',
            tension: 0.3,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: '#ffcc80'
          }
        ]
      },
      options: {
        animation: {
          duration: 600,
          easing: 'easeOutQuart'
        },
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            ticks: { color: textColor },
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          y: {
            ticks: { color: textColor },
            grid: { color: 'rgba(255,255,255,0.08)' }
          }
        }
      }
    });
  }

  setPin() {
    if (this.pinInput.length === 4) {
      localStorage.setItem('app_pin', CryptoJS.AES.encrypt(this.pinInput, 'master_key').toString());
      this.storedPin = this.pinInput;
      this.pinInput = '';
      alert('PIN défini !');
    }
  }

  unlock() {
    if (this.pinInput === this.storedPin) {
      this.isLocked = false;
      this.pinInput = '';
    } else {
      alert('PIN incorrect');
    }
  }

  lock() {
    this.isLocked = true;
  }

  get encryptionKey() {
    return this.storedPin || 'default_key';
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

  get fullBackup() {
    return {
      expenses: this.expenses,
      categories: this.categories,
      income: this.income,
      timestamp: new Date().toISOString()
    };
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
      this.renderChart();
      this.renderMonthlyChart();
      this.renderCategoryTrendChart();

      alert('Données restaurées avec succès !');
    };

    reader.readAsText(file);
  }

  saveBudget() {
    localStorage.setItem('monthlyBudget', String(this.monthlyBudget));
    this.renderProjectionChart();
  }

  get budgetUsedPercent() {
    if (!this.monthlyBudget) return 0;
    return Math.min(100, Math.round((this.totalExpenses / this.monthlyBudget) * 100));
  }

  getPreviousMonth(month: string) {
    const [year, m] = month.split('-').map(Number);
    if (m === 1) {
      return `${year - 1}-12`;
    }
    const prev = (m - 1).toString().padStart(2, '0');
    return `${year}-${prev}`;
  }

  get previousMonthTotal() {
    if (!this.selectedMonth) return 0;

    const prev = this.getPreviousMonth(this.selectedMonth);

    return this.expenses
      .filter(e => e.date?.startsWith(prev))
      .reduce((sum, e) => sum + e.amount, 0);
  }

  get monthComparisonPercent() {
    const prev = this.previousMonthTotal;
    if (prev === 0) return 0;

    return Math.round(((this.totalExpenses - prev) / prev) * 100);
  }

  renderMonthCompareChart() {
    if (this.monthCompareChart) {
      this.monthCompareChart.destroy();
    }

    if (!this.selectedMonth) return;

    const prev = this.getPreviousMonth(this.selectedMonth);

    const labels = [
      this.formatMonthLabel(prev),
      this.formatMonthLabel(this.selectedMonth)
    ];

    const values = [
      this.previousMonthTotal,
      this.totalExpenses
    ];

    const textColor = getComputedStyle(document.body)
      .getPropertyValue('--text-color')
      .trim();

    this.monthCompareChart = new Chart('monthCompareChart', {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Dépenses',
            data: values,
            backgroundColor: ['#90caf9', '#42a5f5']
          }
        ]
      },
      options: {
        animation: {
          duration: 600,
          easing: 'easeOutQuart'
        },
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: { color: textColor },
            grid: { display: false }
          },
          y: {
            ticks: { color: textColor },
            grid: { color: 'rgba(255,255,255,0.1)' }
          }
        }
      }
    });
  }

  get availableYears() {
    const years = new Set<string>();

    this.expenses.forEach(e => {
      if (e.date) {
        years.add(e.date.slice(0, 4));
      }
    });

    return Array.from(years).sort();
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

  get yearlyTotal() {
    return this.yearlyTotals.reduce((a, b) => a + b, 0);
  }

  get yearlyAverage() {
    return Math.round(this.yearlyTotal / 12);
  }

  get highestMonth() {
    const max = Math.max(...this.yearlyTotals);
    const index = this.yearlyTotals.indexOf(max);
    return { month: index + 1, value: max };
  }

  get lowestMonth() {
    const min = Math.min(...this.yearlyTotals);
    const index = this.yearlyTotals.indexOf(min);
    return { month: index + 1, value: min };
  }

  renderYearChart() {
    if (this.yearChart) {
      this.yearChart.destroy();
    }

    const labels = [
      'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
      'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
    ];

    const values = this.yearlyTotals;

    const textColor = getComputedStyle(document.body)
      .getPropertyValue('--text-color')
      .trim();

    this.yearChart = new Chart('yearChart', {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Dépenses mensuelles',
            data: values,
            backgroundColor: '#4fc3f7'
          }
        ]
      },
      options: {
        animation: {
          duration: 600,
          easing: 'easeOutQuart'
        },
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: { color: textColor },
            grid: { display: false }
          },
          y: {
            ticks: { color: textColor },
            grid: { color: 'rgba(255,255,255,0.1)' }
          }
        }
      }
    });
  }

  get expensesForCSV() {
    if (this.csvExportMode === 'month' && this.selectedMonth) {
      return this.filteredExpenses; // tu l’as déjà
    }
    return this.expenses;
  }

  generateCSV() {
    const rows = [
      ['date', 'category', 'amount'] // en-tête
    ];

    this.expensesForCSV.forEach(e => {
      rows.push([
        e.date,
        e.category,
        e.amount.toString()
      ]);
    });

    return rows.map(r => r.join(';')).join('\n');
  }

  exportCSV() {
    const csv = this.generateCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `budget_${date}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  saveGoal() {
    localStorage.setItem('monthlyGoal', String(this.monthlyGoal));
    this.renderProjectionChart();
  }

  get goalProgress() {
    if (!this.monthlyGoal) return 0;

    const saved = this.monthlyGoal - this.totalExpenses;
    const percent = (saved / this.monthlyGoal) * 100;

    return Math.max(0, Math.min(100, Math.round(percent)));
  }

  get currentMonthExpenses() {
    return this.filteredExpenses;
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

    const total = this.currentMonthExpenses.reduce((a, b) => a + b.amount, 0);

    return Math.round(total / daysPassed);
  }

  get endOfMonthProjection() {
    if (!this.selectedMonth) return 0;

    const [year, month] = this.selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    return Math.round(this.dailyAverage * daysInMonth);
  }
  renderProjectionChart() {
    if (this.projectionChart) {
      this.projectionChart.destroy();
    }

    if (!this.selectedMonth) return;

    const textColor = getComputedStyle(document.body)
      .getPropertyValue('--text-color')
      .trim();

    const labels = ['Budget', 'Dépenses actuelles', 'Projection fin de mois'];

    const values = [
      this.monthlyBudget,
      this.totalExpenses,
      this.endOfMonthProjection
    ];

    const colors = [
      '#4caf50', // budget
      '#42a5f5', // dépenses actuelles
      this.endOfMonthProjection > this.monthlyBudget ? '#e53935' : '#ffb74d' // projection
    ];

    this.projectionChart = new Chart('projectionChart', {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Montants',
            data: values,
            backgroundColor: colors
          }
        ]
      },
      options: {
        animation: {
          duration: 600,
          easing: 'easeOutQuart'
        },
        indexAxis: 'y', // barres horizontales
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: { color: textColor },
            grid: { color: 'rgba(255,255,255,0.1)' }
          },
          y: {
            ticks: { color: textColor },
            grid: { display: false }
          }
        }
      }
    });
  }
}