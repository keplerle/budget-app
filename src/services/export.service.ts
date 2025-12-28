import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as CryptoJS from 'crypto-js';
import { Expense } from '../model/expense';

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  
  // Pour CSV et export chiffré, passez les données en paramètre
  generateCSV(expenses: Expense[], exportMode: string, selectedMonth: string) {
    const filtered = exportMode === 'month' && selectedMonth 
      ? expenses.filter(e => e.date.startsWith(selectedMonth)) 
      : expenses;

    const rows = [['date', 'category', 'amount']];
    filtered.forEach(e => rows.push([e.date, e.category, e.amount.toString()]));
    return rows.map(r => r.join(';')).join('\n');
  }

  exportCSV(expenses: Expense[], exportMode: string, selectedMonth: string) {
    const csv = this.generateCSV(expenses, exportMode, selectedMonth);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportEncrypted(data: any, encryptionKey: string) {
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), encryptionKey).toString();
    const blob = new Blob([encrypted], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'budget_secure_backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  exportPDF(elementId: string) {
    const element = document.getElementById(elementId);
    if (!element) return;

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
