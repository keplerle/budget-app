import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UtilService {

  formatMonthLabel(month: string) {
    const [year, monthNum] = month.split('-').map(Number);

    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    return `${months[monthNum - 1]} ${year}`;
  }

  getPreviousMonth(month: string) {
    const [year, m] = month.split('-').map(Number);
    if (m === 1) {
      return `${year - 1}-12`;
    }
    const prev = (m - 1).toString().padStart(2, '0');
    return `${year}-${prev}`;
  }

}
