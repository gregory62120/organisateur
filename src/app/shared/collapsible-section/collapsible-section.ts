import { booleanAttribute, Component, input, model } from '@angular/core';

/**
 * En-tête dépliable avec compteur. Le contenu projeté est toujours créé par le parent :
 * pour ne rien instancier tant que la section est repliée, il faut l'entourer d'un
 * `@if (open())` côté parent (liaison `[(open)]`).
 */
@Component({
  selector: 'app-collapsible-section',
  standalone: true,
  host: { '[class.sticky]': 'sticky()' },
  template: `
    <button type="button" class="toggle" [attr.aria-expanded]="open()" (click)="open.set(!open())">
      <span class="material-symbols-outlined">{{ open() ? 'expand_more' : 'chevron_right' }}</span>
      {{ title() }}
      <span class="count">{{ count() }}</span>
    </button>
    <ng-content />
  `,
  styleUrl: './collapsible-section.scss',
})
export class CollapsibleSectionComponent {
  readonly title = input.required<string>();

  readonly count = input(0);

  readonly open = model(false);

  /** Garde l'en-tête visible à gauche quand le contenu défile horizontalement (Gantt). */
  readonly sticky = input(false, { transform: booleanAttribute });
}
