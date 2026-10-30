import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsComponent {
  readonly settings = inject(SettingsService);

  toggleReports(event: Event) {
    this.settings.setReportsEnabled((event.target as HTMLInputElement).checked);
  }
}
