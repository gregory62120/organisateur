import { Dialog } from '@angular/cdk/dialog';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  GithubTokenDialogComponent,
  GithubTokenDialogData,
  GithubTokenDialogResult,
} from '../../layout/github-token-dialog/github-token-dialog';

export const GITHUB_TOKEN_KEY = 'tf-github-token';

/** « ghp_…a1b2 » : de quoi reconnaître le token sans l'afficher en entier. */
export function maskToken(token: string): string {
  return token.length <= 8 ? '••••' : `${token.slice(0, 4)}…${token.slice(-4)}`;
}

/**
 * Token GitHub servant à la synchronisation. Il peut être mémorisé dans ce navigateur (stockage
 * local, en clair) : à la synchronisation suivante, une fenêtre propose de le réutiliser.
 */
@Injectable({ providedIn: 'root' })
export class GithubTokenService {
  private readonly dialog = inject(Dialog);

  private readonly state = signal<string | null>(this.restore());

  readonly saved = this.state.asReadonly();

  readonly masked = computed(() => {
    const token = this.state();
    return token ? maskToken(token) : null;
  });

  remember(token: string) {
    this.state.set(token);
    this.write(token);
  }

  forget() {
    this.state.set(null);
    this.write(null);
  }

  /**
   * Demande le token à l'utilisateur : propose celui mémorisé s'il existe, sinon en demande un
   * (avec l'option de le mémoriser). Renvoie `null` si la fenêtre est fermée sans token.
   */
  async request(purpose: string): Promise<string | null> {
    for (;;) {
      const ref = this.dialog.open<GithubTokenDialogResult | undefined, GithubTokenDialogData>(
        GithubTokenDialogComponent,
        {
          panelClass: 'tf-dialog-panel',
          maxWidth: '96vw',
          data: { purpose, saved: this.masked() },
        },
      );
      const result = await firstValueFrom(ref.closed);
      if (!result) {
        return null;
      }
      if ('forget' in result) {
        this.forget();
        continue;
      }
      if ('useSaved' in result) {
        return this.state();
      }
      const token = result.token.trim();
      if (!token) {
        return null;
      }
      if (result.remember) {
        this.remember(token);
      }
      return token;
    }
  }

  private write(token: string | null) {
    try {
      if (token) {
        localStorage.setItem(GITHUB_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(GITHUB_TOKEN_KEY);
      }
    } catch {
      // Stockage indisponible (navigation privée…) : le token ne sera pas conservé.
    }
  }

  private restore(): string | null {
    try {
      return localStorage.getItem(GITHUB_TOKEN_KEY) || null;
    } catch {
      return null;
    }
  }
}
