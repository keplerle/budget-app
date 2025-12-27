import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BudgetComponent } from '../components/budget.component/budget.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BudgetComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('budget-app');
}
