import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDark: WritableSignal<boolean> = signal(true);

  applyTheme(theme: 'light' | 'dark') {
    const body = document.body;

    if (theme === 'dark') {
      body.classList.add('dark-theme');
    } else {
      body.classList.remove('dark-theme');
    }

    localStorage.setItem('theme', theme);
    this.isDark.set(theme === 'dark');
  }

  loadTheme() {
    const saved: 'light' | 'dark' = localStorage.getItem('theme') as 'light' | 'dark';

    if (saved) {
      this.applyTheme(saved);
      return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.applyTheme(prefersDark ? 'dark' : 'light');
  }
}