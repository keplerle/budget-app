import { Component } from '@angular/core';
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
export class BudgetComponent {
  isLocked = true;
  pinInput = '';
  storedPin = '';

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
  isDark = true;
  newCategory = '';
  selectedCategoryForTrend = '';
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

    this.expenses = encExpenses ? this.decrypt(encExpenses) || [] : [];
    this.categories = encCategories ? this.decrypt(encCategories) || [] : [];
    this.income = encIncome ? this.decrypt(encIncome) || 0 : 0;

  }

  ngAfterViewInit() {
    this.renderChart();
    this.renderMonthlyChart();
    this.renderCategoryTrendChart();
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
    this.isDark = !this.isDark;
    this.applyTheme();
  }

  applyTheme() {
    if (this.isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
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

    }
  }

  removeExpense(index: number) {
    this.expenses.splice(index, 1);
    this.saveToStorage();
    this.renderChart();
    this.renderMonthlyChart();
    this.renderCategoryTrendChart();

  }

  updateFilter() {
    this.renderChart();
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
}