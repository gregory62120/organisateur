import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CollapsibleSectionComponent } from './collapsible-section';

@Component({
  imports: [CollapsibleSectionComponent],
  template: `
    <app-collapsible-section title="Archivées" [count]="3" [(open)]="open">
      @if (open()) {
        <p class="content">contenu</p>
      }
    </app-collapsible-section>
  `,
})
class HostComponent {
  readonly open = signal(false);
}

describe('CollapsibleSectionComponent', () => {
  async function render() {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('affiche le titre et le compteur, replié par défaut', async () => {
    const { el } = await render();

    expect(el.querySelector('.toggle')?.textContent).toContain('Archivées');
    expect(el.querySelector('.count')?.textContent).toBe('3');
    expect(el.querySelector('.toggle')?.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector('.content')).toBeNull();
  });

  it('se déplie et se replie au clic, en synchronisant le parent', async () => {
    const { fixture, el } = await render();
    const toggle = el.querySelector<HTMLElement>('.toggle')!;

    toggle.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(true);
    expect(el.querySelector('.content')).not.toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    toggle.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(false);
    expect(el.querySelector('.content')).toBeNull();
  });
});
