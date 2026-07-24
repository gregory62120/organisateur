import { Injectable, signal } from '@angular/core';
import { Settings } from '../models/settings.model';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  settings = signal<Settings>({
    darkMode: false,

    autoSave: true,

    projectName: '',
  });

  toggleDark() {
    this.settings.update((s) => ({
      ...s,

      darkMode: !s.darkMode,
    }));
  }
}
