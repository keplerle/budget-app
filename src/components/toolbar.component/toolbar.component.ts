import { Component, output } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-toolbar',
  imports: [FormsModule],
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.scss',
})
export class ToolbarComponent {
  csvExportMode = 'all';

  readonly executeExportPDF = output<void>();
  readonly executeExportCSV = output<string>();
  readonly executeCryptedExport = output<void>();
  readonly executeCryptedImport = output<any>();

  exportPDF() {
    this.executeExportPDF.emit();
  }

  exportCSV() {
    this.executeExportCSV.emit(this.csvExportMode);
  }

  exportEncrypted() {
    this.executeCryptedExport.emit();
  }

  importEncrypted(event: any) {
    this.executeCryptedImport.emit(event);
  }
}
