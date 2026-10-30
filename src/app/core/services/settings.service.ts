import { computed, Injectable, signal } from '@angular/core';

import { Settings } from '../models/settings.model';

export const SETTINGS_KEY = 'tf-settings';

const DEFAULTS: Settings = { reportsEnabled: false };

/**
 * Préférences de l'application. Elles sont propres au navigateur (et non au projet) : le menu doit
 * être complet dès l'ouverture, avant qu'un dossier de projet soit choisi.
 */
@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly state = signal<Settings>(this.restore());

  readonly settings = this.state.asReadonly();

  readonly reportsEnabled = computed(() => this.state().reportsEnabled);

  setReportsEnabled(enabled: boolean) {
    this.state.update((s) => ({ ...s, reportsEnabled: enabled }));
    this.save();
  }

  private save() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.state()));
    } catch {
      // Stockage indisponible (navigation privée…) : la préférence ne sera pas conservée.
    }
  }

  private restore(): Settings {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null');
      return { ...DEFAULTS, reportsEnabled: saved?.reportsEnabled === true };
    } catch {
      return { ...DEFAULTS };
    }
  }
}
