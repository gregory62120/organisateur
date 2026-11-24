import { Injectable, inject, signal } from '@angular/core';
import { DocumentService } from './document.service';
import { EVENTS_FILE, EventService } from './event.service';
import { SUMMARIES_FILE, SummaryService } from './summary.service';
import { MUSIC_PLAN_FILE, MusicPlanService } from './music-plan.service';
import { MUSIC_FILE, MusicService } from './music.service';
import { TIMELOG_FILE, TimeLogService } from './time-log.service';
import { CONTRACT_FILE, TIMESHEET_FILE, TimesheetService } from './timesheet.service';
import { TaskService } from './task.service';

interface GithubConfig {
  owner: string;
  repo: string;
  branch: string;
}

@Injectable({
  providedIn: 'root',
})
export class GithubSyncService {
  private readonly documentService = inject(DocumentService);
  private readonly taskService = inject(TaskService);
  private readonly eventService = inject(EventService);
  private readonly musicService = inject(MusicService);
  private readonly musicPlanService = inject(MusicPlanService);
  private readonly summaryService = inject(SummaryService);
  private readonly timesheetService = inject(TimesheetService);
  private readonly timeLogService = inject(TimeLogService);

  /**
   * Fichiers qui n'existent qu'une fois utilisés (évènements, musique, planification, résumés) : ils sont synchronisés
   * s'ils sont présents, et leur absence n'empêche pas la synchronisation.
   */
  private readonly optionalFiles: {
    path: string;
    current: () => unknown[];
    apply: (json: string) => void;
  }[] = [
    {
      path: EVENTS_FILE,
      current: () => this.eventService.eventsSignal(),
      apply: (json) => this.eventService.updateEvents(JSON.parse(json)),
    },
    {
      path: MUSIC_FILE,
      current: () => this.musicService.tracks(),
      apply: (json) => this.musicService.updateTracks(JSON.parse(json)),
    },
    {
      path: MUSIC_PLAN_FILE,
      current: () => this.musicPlanService.slots(),
      apply: (json) => this.musicPlanService.updateSlots(JSON.parse(json)),
    },
    {
      path: SUMMARIES_FILE,
      current: () => this.summaryService.summaries(),
      apply: (json) => this.summaryService.updateSummaries(JSON.parse(json)),
    },
    {
      path: TIMESHEET_FILE,
      current: () => this.timesheetService.entries(),
      apply: (json) => this.timesheetService.updateEntries(JSON.parse(json)),
    },
    {
      path: TIMELOG_FILE,
      current: () => this.timeLogService.logs(),
      apply: (json) => this.timeLogService.updateLogs(JSON.parse(json)),
    },
    {
      path: CONTRACT_FILE,
      current: () => this.timesheetService.contractItems(),
      apply: (json) => this.timesheetService.updateContract(JSON.parse(json)[0]),
    },
  ];

  private readonly syncingState = signal(false);
  readonly syncing = this.syncingState.asReadonly();

  private readonly pullingState = signal(false);
  readonly pulling = this.pullingState.asReadonly();

  private readonly lastSyncState = signal<Date | null>(null);
  readonly lastSync = this.lastSyncState.asReadonly();

  private config: GithubConfig | null = null;

  /**
   * À remplacer plus tard par une configuration provenant
   * du projet.
   */
  setConfig(config: GithubConfig): void {
    this.config = config;
  }

  async sync(token: string): Promise<void> {
    if (!this.config) {
      throw new Error('Aucun dépôt GitHub configuré.');
    }

    if (!token) {
      throw new Error('Token GitHub manquant.');
    }

    this.syncingState.set(true);

    try {
      const { owner, repo, branch } = this.config;

      /*
       * Les données en mémoire sont la référence : sur tablette (stockage privé du navigateur)
       * les fichiers locaux ne sont pas forcément écrits.
       */
      const tasks = JSON.stringify(this.taskService.tasksSignal(), null, 2);
      const documents = JSON.stringify(this.documentService.allPages());
      const optional = this.optionalFiles.map((file) => {
        const items = file.current();
        return items.length ? JSON.stringify(items, null, 2) : undefined;
      });

      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      };

      /*
       * 1. Récupération de la branche
       */
      const ref = await this.githubFetch(
        `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
        headers,
      );

      const latestCommitSha = ref.object.sha;

      /*
       * 2. Récupération du commit actuel
       */
      const latestCommit = await this.githubFetch(
        `https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
        headers,
      );

      const baseTreeSha = latestCommit.tree.sha;

      /*
       * 3. Création des blobs
       */
      const tasksBlob = await this.createBlob(owner, repo, tasks, token);

      const documentsBlob = await this.createBlob(owner, repo, documents, token);

      const optionalBlobs = await Promise.all(
        this.optionalFiles.map(async (file, i) => {
          const content = optional[i];
          return content === undefined
            ? null
            : { path: file.path, blob: await this.createBlob(owner, repo, content, token) };
        }),
      );

      /*
       * 4. Création d'un tree contenant les 2 fichiers
       */
      const tree = await this.githubFetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees`,
        headers,
        {
          method: 'POST',
          body: JSON.stringify({
            base_tree: baseTreeSha,
            tree: [
              {
                path: 'tasks.json',
                mode: '100644',
                type: 'blob',
                sha: tasksBlob.sha,
              },
              {
                path: 'document.json',
                mode: '100644',
                type: 'blob',
                sha: documentsBlob.sha,
              },
              ...optionalBlobs.flatMap((item) =>
                item ? [{ path: item.path, mode: '100644', type: 'blob', sha: item.blob.sha }] : [],
              ),
            ],
          }),
        },
      );

      /*
       * 5. Un seul commit
       */
      const commit = await this.githubFetch(
        `https://api.github.com/repos/${owner}/${repo}/git/commits`,
        headers,
        {
          method: 'POST',
          body: JSON.stringify({
            message: 'Synchronisation du projet',
            tree: tree.sha,
            parents: [latestCommitSha],
          }),
        },
      );

      /*
       * 6. Déplacement de la branche
       */
      await this.githubFetch(
        `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
        headers,
        {
          method: 'PATCH',
          body: JSON.stringify({
            sha: commit.sha,
            force: false,
          }),
        },
      );

      this.lastSyncState.set(new Date());
    } finally {
      this.syncingState.set(false);
    }
  }

  async pull(token: string): Promise<void> {
    if (!this.config) {
      throw new Error('Aucun dépôt GitHub configuré.');
    }

    if (!token) {
      throw new Error('Token GitHub manquant.');
    }

    this.pullingState.set(true);

    try {
      const { owner, repo, branch } = this.config;

      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      };

      const [tasks, documents] = await Promise.all([
        this.getFile(owner, repo, branch, 'tasks.json', headers),
        this.getFile(owner, repo, branch, 'document.json', headers),
      ]);

      // await Promise.all([
      //   this.storage.write('tasks.json', tasks),
      //   this.storage.write('document.json', documents),
      // ]);

      const docs = JSON.parse(documents);
      this.documentService.updateDocuments(docs);
      this.taskService.updateTask(JSON.parse(tasks));

      // Un dépôt qui n'a jamais reçu ces fichiers reste valide : on garde alors les données locales.
      await Promise.all(
        this.optionalFiles.map(async (file) => {
          const content = await this.getFile(owner, repo, branch, file.path, headers).catch(
            () => null,
          );
          if (content) {
            file.apply(content);
          }
        }),
      );

      this.lastSyncState.set(new Date());
    } finally {
      this.pullingState.set(false);
    }
  }

  private async getFile(
    owner: string,
    repo: string,
    branch: string,
    path: string,
    headers: Record<string, string>,
  ): Promise<string> {
    // Le type « raw » renvoie le fichier tel quel, même au-delà de 1 Mo où l'API « contents » ne donne plus de contenu.
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      { headers: { ...headers, Accept: 'application/vnd.github.raw+json' } },
    );

    if (!response.ok) {
      throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
    }

    return response.text();
  }

  private async createBlob(owner: string, repo: string, content: string, token: string) {
    return this.githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
      {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      {
        method: 'POST',
        body: JSON.stringify({
          content,
          encoding: 'utf-8',
        }),
      },
    );
  }

  private async githubFetch(
    url: string,
    headers: Record<string, string>,
    options: RequestInit = {},
  ): Promise<any> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      const error = await response.text();

      throw new Error(`GitHub API ${response.status}: ${error}`);
    }

    return response.json();
  }
}
