import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class HistoryService {
  private history = signal<any[]>([]);

  historySignal = this.history.asReadonly();

  add(action: string, detail: string) {
    this.history.update((h) => [
      ...h,

      {
        id: crypto.randomUUID(),

        date: new Date(),

        action,

        detail,
      },
    ]);
  }
}
