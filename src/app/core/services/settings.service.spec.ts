import { TestBed } from '@angular/core/testing';

import { SETTINGS_KEY, SettingsService } from './settings.service';

describe('SettingsService', () => {
  const create = () => TestBed.inject(SettingsService);

  beforeEach(() => localStorage.removeItem(SETTINGS_KEY));

  it('désactive la section Rapports par défaut', () => {
    expect(create().reportsEnabled()).toBe(false);
  });

  it('active la section et mémorise le choix dans le navigateur', () => {
    const service = create();

    service.setReportsEnabled(true);

    expect(service.reportsEnabled()).toBe(true);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toEqual({ reportsEnabled: true });
  });

  it('retrouve le choix mémorisé', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ reportsEnabled: true }));

    expect(create().reportsEnabled()).toBe(true);
  });

  it('peut être désactivée à nouveau', () => {
    const service = create();
    service.setReportsEnabled(true);

    service.setReportsEnabled(false);

    expect(service.reportsEnabled()).toBe(false);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toEqual({ reportsEnabled: false });
  });

  it('ignore une valeur mémorisée illisible ou invalide', () => {
    localStorage.setItem(SETTINGS_KEY, '{pas du json');
    expect(create().reportsEnabled()).toBe(false);

    TestBed.resetTestingModule();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ reportsEnabled: 'oui' }));
    expect(create().reportsEnabled()).toBe(false);
  });
});
