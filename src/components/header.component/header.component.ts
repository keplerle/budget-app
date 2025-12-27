import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  readonly isDarkMode = input<boolean>();
  readonly applyThemeChange = output<'light' | 'dark'>();
  readonly lockStatusChange = output<boolean>();

  toggleTheme() {
    this.applyThemeChange.emit(this.isDarkMode() ? 'light' : 'dark');
  }

  lock() {
    this.lockStatusChange.emit(true);
  }
}
