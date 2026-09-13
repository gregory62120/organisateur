import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ConfigService } from '../services/config.service';
import { LogService } from '../services/log.service';

import { AppConfig, LogSource } from '../models/app-config.model';

import { LogEntry, LogLevel } from '../models/log-entry.model';
import { FlowDestination, FlowSource } from '../models/flow.models';
import { FlowComponent } from '../flow/flow';

interface SelectedSource {
  source: LogSource;
  handle: FileSystemDirectoryHandle;
}

interface LogFeature {
  id: string;
  type: string;
  logs: LogEntry[];
  destinations: FlowDestination[];
}

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, FlowComponent],
  templateUrl: './logs.component.html',
  styleUrl: './logs.component.scss',
})
export class LogsComponent {
  private readonly configService = inject(ConfigService);
  private readonly logService = inject(LogService);

  // ---------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------

  readonly config = signal<AppConfig | null>(null);

  readonly sources = computed(() => this.config()?.logSources ?? []);

  readonly applications = computed(() => this.config()?.applications ?? []);

  // ---------------------------------------------------------
  // Sélection des sources
  // ---------------------------------------------------------

  readonly selectedSources = signal<SelectedSource[]>([]);

  // ---------------------------------------------------------
  // Sélection des applications
  // ---------------------------------------------------------

  readonly selectedApplications = signal<string[]>([]);

  // ---------------------------------------------------------
  // Filtres
  // ---------------------------------------------------------

  readonly selectedDate = signal(this.getToday());

  readonly startTime = signal('00:00');

  readonly endTime = signal('23:59');

  // ---------------------------------------------------------
  // Logs
  // ---------------------------------------------------------

  readonly logs = signal<LogEntry[]>([]);

  readonly loading = signal(false);

  readonly error = signal<string | null>(null);

  readonly searched = signal(false);

  // ---------------------------------------------------------
  // Statistiques
  // ---------------------------------------------------------

  readonly logCount = computed(() => this.logs().length);

  readonly features = computed<LogFeature[]>(() => {
    const allLogs = this.logs();

    const featureMap = new Map<string, LogFeature>();

    // Détection des features
    for (const log of allLogs) {
      const match = log.message.match(/Start Authentification Session with Type:\s*(.+)/i);

      if (!match || !log.requestId) {
        continue;
      }

      const type = match[1].trim();

      if (!featureMap.has(log.requestId)) {
        featureMap.set(log.requestId, {
          id: log.requestId,
          type,
          logs: [],
          destinations: [],
        });
      }
    }

    // Association de tous les logs à leur feature
    for (const log of allLogs) {
      if (!log.requestId) {
        continue;
      }

      const feature = featureMap.get(log.requestId);

      if (!feature) {
        continue;
      }

      feature.logs.push(log);
    }

    // Calcul du flow pour chaque feature
    for (const feature of featureMap.values()) {
      feature.destinations = this.buildFeatureDestinations(feature.logs);
    }

    return Array.from(featureMap.values());
  });

  /**
   * Source du flux.
   */
  readonly source = signal<FlowSource>({
    id: 'source',
    label: 'Source',
    description: 'Envoi des données',
    icon: 'send',
  });

  constructor() {
    this.loadConfig();
  }

  trackFeatureLog(index: number, log: LogEntry): string {
    return `${log.requestId}-${log.timestamp.getTime()}-${index}`;
  }

  // =========================================================
  // CONFIG
  // =========================================================

  private loadConfig(): void {
    this.configService.getConfig().subscribe({
      next: (config) => {
        this.config.set(config);
      },

      error: () => {
        this.error.set('Impossible de charger le fichier config.json.');
      },
    });
  }

  // =========================================================
  // SOURCES
  // =========================================================

  async selectSource(source: LogSource): Promise<void> {
    try {
      const handle = await window.showDirectoryPicker({
        mode: 'read',
      });

      this.selectedSources.update((sources) => {
        // Si cette source était déjà sélectionnée,
        // on remplace simplement son handle.
        const existing = sources.findIndex((selected) => selected.source.id === source.id);

        if (existing !== -1) {
          const updated = [...sources];
          updated[existing] = {
            source,
            handle,
          };
          return updated;
        }

        // Sinon on ajoute la nouvelle instance
        return [
          ...sources,
          {
            source,
            handle,
          },
        ];
      });
    } catch (error) {
      // L'utilisateur a annulé le sélecteur
      if ((error as DOMException)?.name === 'AbortError') {
        return;
      }

      console.error('Impossible d’ouvrir le dossier', error);
    }
  }

  removeSource(sourceId: string): void {
    this.selectedSources.update((sources) => sources.filter((item) => item.source.id !== sourceId));
  }

  isSourceSelected(sourceId: string): boolean {
    return this.selectedSources().some((item) => item.source.id === sourceId);
  }

  getSelectedSource(sourceId: string): SelectedSource | undefined {
    return this.selectedSources().find((item) => item.source.id === sourceId);
  }

  // =========================================================
  // APPLICATIONS
  // =========================================================

  toggleApplication(application: string): void {
    this.selectedApplications.update((applications) => {
      if (applications.includes(application)) {
        return applications.filter((item) => item !== application);
      }

      return [...applications, application];
    });
  }

  isApplicationSelected(application: string): boolean {
    return this.selectedApplications().includes(application);
  }

  selectAllApplications(): void {
    this.selectedApplications.set([...this.applications()]);
  }

  clearApplications(): void {
    this.selectedApplications.set([]);
  }

  // =========================================================
  // FILTRES
  // =========================================================

  onDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.selectedDate.set(input.value);
  }

  onStartTimeChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.startTime.set(input.value);
  }

  onEndTimeChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.endTime.set(input.value);
  }

  // =========================================================
  // RECHERCHE
  // =========================================================

  async search(): Promise<void> {
    this.error.set(null);
    this.searched.set(true);

    const sources = this.selectedSources();

    const applications = this.selectedApplications();

    if (sources.length === 0) {
      this.error.set('Sélectionne au moins un dossier partagé.');

      return;
    }

    if (applications.length === 0) {
      this.error.set('Sélectionne au moins une application.');

      return;
    }

    if (this.startTime() > this.endTime()) {
      this.error.set('L’heure de début doit être antérieure à l’heure de fin.');

      return;
    }

    this.loading.set(true);
    this.logs.set([]);

    try {
      const requests: Promise<LogEntry[]>[] = [];

      for (const selectedSource of sources) {
        for (const application of applications) {
          requests.push(
            this.logService.readApplicationLogs(
              selectedSource.source,
              selectedSource.handle,
              application,
              {
                date: this.selectedDate(),
                startTime: this.startTime(),
                endTime: this.endTime(),
              },
            ),
          );
        }
      }

      const results = await Promise.all(requests);

      const logs = results.flat().sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      this.logs.set(logs);
    } catch (error) {
      console.error(error);

      this.error.set('Une erreur est survenue pendant la lecture des logs.');
    } finally {
      this.loading.set(false);
    }
  }

  // =========================================================
  // UTILITAIRES
  // =========================================================

  formatTimestamp(timestamp: Date): string {
    return timestamp.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  }

  getLevelClass(level: LogLevel): string {
    return level.toLowerCase();
  }

  trackLog(index: number, log: LogEntry): string {
    return `${log.sourceId}-${log.application}-${log.timestamp.getTime()}-${index}`;
  }

  private getToday(): string {
    const date = new Date();

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private buildFeatureDestinations(logs: LogEntry[]): FlowDestination[] {
    const messages = logs.map((log) => log.message.toLowerCase());

    const contains = (value: string): boolean =>
      messages.some((message) => message.includes(value.toLowerCase()));

    const containsSql = (sql: string, table: string): boolean =>
      messages.some(
        (message) => message.includes(sql.toLowerCase()) && message.includes(table.toLowerCase()),
      );

    return [
      {
        id: 'CICB_BEI_CRT',
        label: 'Appel CICB_BEI_CRT',
        description: 'Récupération information carte',
        icon: 'database',
        status: containsSql('select', 'CICB_BEI_CRT') ? 'success' : 'error',
      },

      {
        id: 'REFERENTIEL_ENTREPRISE',
        label: 'Appel REFERENTIEL_ENTREPRISE',
        description: 'Récupération de la configuration de la période',
        icon: 'database',
        status: containsSql('select', 'REFERENTIEL_ENTREPRISE') ? 'success' : 'success',
      },

      {
        id: '/enrollment/DefaultEnrolment/',
        label: 'Appel /enrollment/DefaultEnrolment/',
        description: "Vérification de l'enrollment d'un mobile de l'utilisateur",
        icon: 'api',
        status: contains('/enrollment/DefaultEnrolment/') ? 'success' : 'error',
      },

      {
        id: 'CICB_BEI_3DS',
        label: 'Sauvegarde CICB_BEI_3DS',
        description: 'Sauvegarde des informations de la session 3DS',
        icon: 'database',
        status: containsSql('update', 'CICB_BEI_3DS') ? 'success' : 'error',
      },
    ];
  }
}
