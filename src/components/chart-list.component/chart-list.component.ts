import { Component, effect, input, model } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { UtilService } from '../../services/util.service';
import { FormsModule } from '@angular/forms';
Chart.register(...registerables);

@Component({
  selector: 'app-chart-list',
  imports: [FormsModule],
  templateUrl: './chart-list.component.html',
  styleUrl: './chart-list.component.scss',
})
export class ChartListComponent {
  readonly categories = input<string[]>([]);
  readonly expenses = input<Expense[]>([]);
  readonly groupedExpenses = input<Record<string, number>>({});
  readonly selectedMonth = input<string>('');
  readonly totalExpenses = input<number>(0);
  readonly monthlyBudget = input<number>(0);
  readonly previousMonthTotal = input<number>(0);
  readonly endOfMonthProjection = input<number>(0);
  readonly yearlyTotals = input<number[]>([]);

  readonly selectedYear = model<string>('');
  readonly selectedCategoryForTrend = model<string>('');

  chart: any;
  monthlyChart: any;
  categoryTrendChart: any;
  monthCompareChart: any;
  yearChart: any;
  projectionChart: any;

  constructor(private utilService: UtilService) {
    effect(() => {
      if (this.groupedExpenses() != null) {
        this.renderChart();
      }
    });

    effect(() => {
      if (this.selectedMonth() != null && this.monthlyBudget() != null && this.totalExpenses() != null && this.endOfMonthProjection() != null) {
        this.renderProjectionChart();
      }
    });

    effect(() => {
      if (this.selectedMonth() != null && this.previousMonthTotal() != null && this.totalExpenses() != null) {
        this.renderMonthCompareChart();
      }
    });

    effect(() => {
      if (this.yearlyTotals() != null) {
        this.renderYearChart();
      } 
    });

    effect(() => {
      if (this.selectedCategoryForTrend() != null) {
        this.renderCategoryTrendChart();
      } 
    });

    effect(() => {
      if (this.selectedMonth() != null && this.previousMonthTotal() != null && this.totalExpenses() != null) {
        this.renderMonthlyChart();
      } 
    });
  }

  get availableYears() {
    const years = new Set<string>();

    this.expenses().forEach(e => {
      if (e.date) {
        years.add(e.date.slice(0, 4));
      }
    });

    return Array.from(years).sort();
  }

  get monthlyTotals() {
    const map = new Map<string, number>();

    this.expenses().forEach(e => {
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
      label: this.utilService.formatMonthLabel(key), // "Mars 2025"
      total: map.get(key) ?? 0
    }));
  }

  get categoryMonthlyTotals() {
    if (!this.selectedCategoryForTrend()) {
      return [];
    }

    const map = new Map<string, number>();

    this.expenses().forEach(e => {
      if (!e.date || e.category !== this.selectedCategoryForTrend()) {
        return;
      }

      const monthKey = e.date.slice(0, 7); // "YYYY-MM"
      const current = map.get(monthKey) ?? 0;
      map.set(monthKey, current + e.amount);
    });

    const sortedKeys = Array.from(map.keys()).sort();

    return sortedKeys.map(key => ({
      key,
      label: this.utilService.formatMonthLabel(key),
      total: map.get(key) ?? 0
    }));
  }

  renderChart() {
    if (this.chart) {
      this.chart.destroy();
    }

    const labels = Object.keys(this.groupedExpenses());
    const values = Object.values(this.groupedExpenses());

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

  renderMonthCompareChart() {
    if (this.monthCompareChart) {
      this.monthCompareChart.destroy();
    }

    if (!this.selectedMonth()) return;

    const prev = this.utilService.getPreviousMonth(this.selectedMonth());

    const labels = [
      this.utilService.formatMonthLabel(prev),
      this.utilService.formatMonthLabel(this.selectedMonth())
    ];

    const values = [
      this.previousMonthTotal(),
      this.totalExpenses()
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

  renderYearChart() {
    if (this.yearChart) {
      this.yearChart.destroy();
    }

    const labels = [
      'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
      'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
    ];

    const values = this.yearlyTotals();

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

  renderCategoryTrendChart() {
    // si aucune catégorie sélectionnée : on détruit le chart et on sort
    if (this.categoryTrendChart) {
      this.categoryTrendChart.destroy();
      this.categoryTrendChart = null;
    }

    if (!this.selectedCategoryForTrend()) {
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
            label: `Dépenses - ${this.selectedCategoryForTrend()}`,
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

  renderProjectionChart() {
    if (this.projectionChart) {
      this.projectionChart.destroy();
    }

    if (!this.selectedMonth()) return;

    const textColor = getComputedStyle(document.body)
      .getPropertyValue('--text-color')
      .trim();

    const labels = ['Budget', 'Dépenses actuelles', 'Projection fin de mois'];

    const values = [
      this.monthlyBudget(),
      this.totalExpenses(),
      this.endOfMonthProjection()
    ];

    const colors = [
      '#4caf50', // budget
      '#42a5f5', // dépenses actuelles
      this.endOfMonthProjection() > this.monthlyBudget() ? '#e53935' : '#ffb74d' // projection
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
