import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SettingsService } from '../../core/services/settings.service';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('menu', () => {
    const enabled = signal(false);

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [Sidebar],
        providers: [
          provideRouter([]),
          { provide: SettingsService, useValue: { reportsEnabled: enabled } },
        ],
      });
      fixture = TestBed.createComponent(Sidebar);
      component = fixture.componentInstance;
    });

    const labels = () => component.menu().map((item) => item.label);

    it('n’affiche pas Rapports tant que l’option est désactivée, mais toujours Paramètres', () => {
      enabled.set(false);

      expect(labels()).not.toContain('Rapports');
      expect(labels().at(-1)).toBe('Paramètres');
    });

    it('ajoute Rapports après Gantt quand l’option est activée, puis le retire', async () => {
      enabled.set(true);
      await fixture.whenStable();

      expect(labels()).toContain('Rapports');
      expect(labels().indexOf('Rapports')).toBe(labels().indexOf('Gantt') + 1);
      expect(component.menu().find((i) => i.label === 'Rapports')?.url).toBe('/reports');
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('a[href="/reports"]')).not.toBeNull();

      enabled.set(false);
      await fixture.whenStable();
      expect(el.querySelector('a[href="/reports"]')).toBeNull();
      expect(el.querySelector('a[href="/settings"]')).not.toBeNull();
    });
  });
});
