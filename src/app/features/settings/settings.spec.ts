import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SettingsService } from '../../core/services/settings.service';
import { SettingsComponent } from './settings';

describe('SettingsComponent', () => {
  const enabled = signal(false);
  const settings = {
    reportsEnabled: enabled,
    setReportsEnabled: vi.fn((v: boolean) => enabled.set(v)),
  };

  async function create() {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: SettingsService, useValue: settings }],
    });
    const fixture = TestBed.createComponent(SettingsComponent);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    enabled.set(false);
  });

  it('propose l’option Rapports, désactivée par défaut, sans lien vers les rapports', async () => {
    const { el } = await create();

    const input = el.querySelector<HTMLInputElement>('#reports-switch')!;
    expect(input.checked).toBe(false);
    expect(input.getAttribute('role')).toBe('switch');
    expect(el.textContent).toContain('Rapports');
    expect(el.querySelector('a.open')).toBeNull();
  });

  it('active l’option au clic et propose alors d’ouvrir les rapports', async () => {
    const { fixture, el } = await create();

    el.querySelector<HTMLInputElement>('#reports-switch')!.click();
    await fixture.whenStable();

    expect(settings.setReportsEnabled).toHaveBeenCalledWith(true);
    expect(el.querySelector('a.open')?.getAttribute('href')).toBe('/reports');
  });

  it('désactive l’option', async () => {
    enabled.set(true);
    const { fixture, el } = await create();
    const input = el.querySelector<HTMLInputElement>('#reports-switch')!;
    expect(input.checked).toBe(true);

    input.click();
    await fixture.whenStable();

    expect(settings.setReportsEnabled).toHaveBeenCalledWith(false);
    expect(el.querySelector('a.open')).toBeNull();
  });

  it('précise que le réglage reste dans le navigateur', async () => {
    const { el } = await create();

    expect(el.querySelector('.note')?.textContent).toContain('dans ce navigateur');
  });
});
