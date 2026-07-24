import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AutoSaveService {
  private timer?: any;

  schedule(callback: Function) {
    clearTimeout(this.timer);

    this.timer = setTimeout(() => {
      callback();
    }, 1000);
  }
}
