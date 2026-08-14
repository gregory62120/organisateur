import { Injectable, inject } from '@angular/core';

import { StorageService } from './storage.service';

import { Project } from '../models/project.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  storage = inject(StorageService);

  current?: Project;

  async create(name: string) {
    const project: Project = {
      id: crypto.randomUUID(),

      name,

      description: '',

      createdAt: new Date().toISOString(),

      updatedAt: new Date().toISOString(),
    };

    await this.storage.write(
      'project.json',

      JSON.stringify(project, null, 2),
    );

    this.current = project;

    return project;
  }
}
