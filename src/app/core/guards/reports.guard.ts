import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SettingsService } from '../services/settings.service';

/** Réserve la page Rapports à ceux qui ont activé l'option ; sinon renvoie vers les paramètres. */
export const reportsGuard: CanActivateFn = () =>
  inject(SettingsService).reportsEnabled() ? true : inject(Router).createUrlTree(['/settings']);
