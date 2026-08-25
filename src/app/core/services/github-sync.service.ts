import { Injectable, inject, signal } from '@angular/core';
import { DocumentService } from './document.service';
import { StorageService } from './storage.service';
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
  private readonly storage = inject(StorageService);
  private readonly documentService = inject(DocumentService);
  private readonly taskService = inject(TaskService);

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

      const [tasks, documents] = await Promise.all([
        this.storage.read('tasks.json'),
        this.storage.read('document.json'),
      ]);

      if (tasks === undefined) {
        throw new Error('Impossible de lire tasks.json');
      }

      if (documents === undefined) {
        throw new Error('Impossible de lire document.json');
      }

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
    const json = await this.githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      headers,
    );

    if (!json.content) {
      throw new Error(`Le fichier ${path} est introuvable dans GitHub`);
    }

    const binary = atob(json.content.replace(/\n/g, ''));

    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

    return new TextDecoder().decode(bytes);
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
