import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AppConfig } from '../models/app-config.model';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private readonly http = inject(HttpClient);

  getConfig(): Observable<AppConfig> {
    return this.http.get<AppConfig>('assets/config.json');
  }
}
