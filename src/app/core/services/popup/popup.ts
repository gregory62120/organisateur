import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Popup } from '../../components/popup/popup';

@Injectable({
  providedIn: 'root',
})
export class PopupService {
  private dialog = inject(MatDialog);
  private dialogRef?: MatDialogRef<Popup>;

  openPopup() {
    console.log('open popup test');
    this.dialogRef = this.dialog.open(Popup, {
      height: '300px',
      width: '600px',
    });
  }

  closePopup() {
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = undefined;
    }
  }

  isOpen(): boolean {
    return !!this.dialogRef;
  }
}
