import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AutoSaveService {
  private timer?: ReturnType<typeof setTimeout>;

  schedule(callback: () => void) {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      callback();
    }, 1000);
  }
}
