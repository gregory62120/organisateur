import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private users = signal<any[]>([]);

  usersSignal = this.users.asReadonly();

  add(user: any) {
    this.users.update((u) => [...u, user]);
  }
}
