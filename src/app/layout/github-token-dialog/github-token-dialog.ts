import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject, signal } from '@angular/core';

export interface GithubTokenDialogData {
  /** Ce que fait la synchronisation (« envoyer », « récupérer »). */
  purpose: string;
  /** Token mémorisé, masqué (« ghp_…a1b2 »), ou `null` s'il n'y en a pas. */
  saved: string | null;
}

export type GithubTokenDialogResult =
  { useSaved: true } | { forget: true } | { token: string; remember: boolean };

@Component({
  selector: 'app-github-token-dialog',
  standalone: true,
  templateUrl: './github-token-dialog.html',
  // Même mise en page que les autres fenêtres, complétée par les styles propres à celle-ci.
  styleUrls: [
    '../../features/kanban/components/task-dialog/task-dialog.scss',
    './github-token-dialog.scss',
  ],
})
export class GithubTokenDialogComponent {
  private readonly dialogRef = inject<DialogRef<GithubTokenDialogResult | undefined>>(DialogRef);

  readonly data = inject<GithubTokenDialogData>(DIALOG_DATA);

  /** Un token mémorisé est proposé d'abord ; « Saisir un autre token » passe à la saisie. */
  readonly entering = signal(!this.data.saved);

  readonly token = signal('');

  readonly remember = signal(true);

  useSaved() {
    this.dialogRef.close({ useSaved: true });
  }

  forget() {
    this.dialogRef.close({ forget: true });
  }

  submit() {
    const token = this.token().trim();
    if (token) {
      this.dialogRef.close({ token, remember: this.remember() });
    }
  }

  close() {
    this.dialogRef.close(undefined);
  }
}
