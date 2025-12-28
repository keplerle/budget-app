import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as CryptoJS from 'crypto-js';

@Component({
  selector: 'app-lock-screen',
  imports: [FormsModule],
  templateUrl: './lock-screen.component.html',
  styleUrl: './lock-screen.component.scss',
})
export class LockScreenComponent {
  pinInput = '';
  readonly storedPin = input<string>();

  readonly lockStatusChange = output<boolean>();
  readonly storedPinChange = output<string>();

  setPin() {
    if (this.pinInput.length === 4) {
      localStorage.setItem('app_pin', CryptoJS.AES.encrypt(this.pinInput, 'master_key').toString());
      this.storedPinChange.emit(this.pinInput);
      this.pinInput = '';
      alert('PIN défini !');
    }
  }

  unlock() {
    if (this.pinInput === this.storedPin()) {
      this.pinInput = '';
      this.lockStatusChange.emit(false);
    } else {
      alert('PIN incorrect');
    }
  }
}
