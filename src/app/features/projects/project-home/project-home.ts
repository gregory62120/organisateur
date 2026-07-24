import { Component, inject } from '@angular/core';

import { ProjectService } from '../../../core/services/project.service';

@Component({
  selector: 'app-project-home',

  standalone: true,

  templateUrl: './project-home.html',
})
export class ProjectHomeComponent {
  service = inject(ProjectService);

  async open() {
    const project = await this.service.create('Mon premier projet');

    console.log(project);
  }
}
