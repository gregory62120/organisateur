import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';

import { SettingsService } from '../services/settings.service';
import { reportsGuard } from './reports.guard';

describe('reportsGuard', () => {
  const enabled = signal(false);
  const tree = {} as UrlTree;
  const router = { createUrlTree: vi.fn(() => tree) };

  const run = () => TestBed.runInInjectionContext(() => reportsGuard({} as never, {} as never));

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: SettingsService, useValue: { reportsEnabled: enabled } },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('laisse passer quand la section est activée', () => {
    enabled.set(true);

    expect(run()).toBe(true);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('renvoie vers les paramètres quand elle est désactivée', () => {
    enabled.set(false);

    expect(run()).toBe(tree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/settings']);
  });
});
