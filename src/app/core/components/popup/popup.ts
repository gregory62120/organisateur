import { Component, inject } from '@angular/core';
import { StorageService } from '../../services/storage.service';
import { PopupService } from '../../services/popup/popup';

@Component({
  selector: 'app-popup',
  imports: [],
  templateUrl: './popup.html',
  styleUrl: './popup.scss',
})
export class Popup {
  private storage = inject(StorageService);
  private popupService = inject(PopupService);

  async openProject() {
    await this.storage.openProject();
    this.popupService.closePopup();
  }
}
