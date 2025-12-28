import { Injectable } from '@angular/core';
import { EncryptionService } from './encryption.service';
import { Expense } from '../model/expense';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor(private encryption: EncryptionService) {}

  // Expenses
  saveExpenses(expenses: Expense[], key: string) {
    const encrypted = this.encryption.encrypt(expenses, key);
    localStorage.setItem('expenses', encrypted);
  }

  loadExpenses(key: string): Expense[] {
    const enc = localStorage.getItem('expenses');
    return enc ? this.encryption.decrypt(enc, key) || [] : [];
  }

  // Categories
  saveCategories(categories: string[], key: string) {
    const encrypted = this.encryption.encrypt(categories, key);
    localStorage.setItem('categories', encrypted);
  }

  loadCategories(key: string): string[] {
    const enc = localStorage.getItem('categories');
    return enc ? this.encryption.decrypt(enc, key) || [] : [];
  }

  // Income
  saveIncome(income: number, key: string) {
    const encrypted = this.encryption.encrypt(income, key);
    localStorage.setItem('income', encrypted);
  }

  loadIncome(key: string): number {
    const enc = localStorage.getItem('income');
    return enc ? this.encryption.decrypt(enc, key) || 0 : 0;
  }

  // Monthly Budget
  saveMonthlyBudget(budget: number, key: string) {
    const encrypted = this.encryption.encrypt(budget, key);
    localStorage.setItem('monthlyBudget', encrypted);
  }

  loadMonthlyBudget(key: string): number {
    const enc = localStorage.getItem('monthlyBudget');
    return enc ? this.encryption.decrypt(enc, key) || 0 : 0;
  }

  // Monthly Goal
  saveMonthlyGoal(goal: number, key: string) {
    const encrypted = this.encryption.encrypt(goal, key);
    localStorage.setItem('monthlyGoal', encrypted);
  }

  loadMonthlyGoal(key: string): number {
    const enc = localStorage.getItem('monthlyGoal');
    return enc ? this.encryption.decrypt(enc, key) || 0 : 0;
  }

  // PIN
  savePin(pin: string) {
    const encrypted = CryptoJS.AES.encrypt(pin, 'master_key').toString();
    localStorage.setItem('app_pin', encrypted);
  }

  loadPin(): string {
    const savedPin = localStorage.getItem('app_pin');
    if (savedPin) {
      const bytes = CryptoJS.AES.decrypt(savedPin, 'master_key');
      return bytes.toString(CryptoJS.enc.Utf8);
    }
    return '';
  }
}