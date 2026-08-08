import { Router } from '@angular/router';
import { Extension, getAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export function AteLinkClickBehavior(router: Router) {
  return Extension.create({
    name: 'linkClickBehavior',

    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey('linkClickBehavior'),

          props: {
            handleClick(view, _pos, event) {
              if (typeof window === 'undefined') {
                return false;
              }

              const target = event.target;

              if (!(target instanceof HTMLAnchorElement)) {
                return false;
              }

              const href = target.getAttribute('href');

              if (!href) {
                return false;
              }

              event.preventDefault();
              event.stopPropagation();

              router.navigateByUrl(href);

              return true;
            },
          },
        }),
      ];
    },
  });
}
