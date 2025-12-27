import { Component, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-income',
  imports: [FormsModule],
  templateUrl: './income.component.html',
  styleUrl: './income.component.scss',
})
export class IncomeComponent {
    readonly income = model<number>();
    readonly afterIncomeAdd = output<void>();

    afterIncomeAddEmit() {
        this.afterIncomeAdd.emit();
    }
}
