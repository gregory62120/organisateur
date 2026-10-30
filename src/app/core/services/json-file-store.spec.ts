import { signal } from '@angular/core';

import { JsonFileStore } from './json-file-store';
import { StorageService } from './storage.service';

describe('JsonFileStore', () => {
  let files: Map<string, string>;
  let isOpen: ReturnType<typeof signal<boolean>>;
  let write: ReturnType<typeof vi.fn>;
  let store: JsonFileStore<{ id: string }>;

  beforeEach(() => {
    files = new Map();
    isOpen = signal(true);
    write = vi.fn(async (path: string, content: string) => {
      files.set(path, content);
    });
    const storage = {
      isOpen,
      write,
      read: async (path: string) => {
        if (!files.has(path)) {
          throw new DOMException('absent', 'NotFoundError');
        }
        return files.get(path);
      },
    } as unknown as StorageService;
    store = new JsonFileStore(storage, 'data.json');
  });

  it('update modifie la liste puis l’écrit', async () => {
    await store.update((items) => [...items, { id: 'a' }]);

    expect(store.items()).toEqual([{ id: 'a' }]);
    expect(JSON.parse(files.get('data.json')!)).toEqual([{ id: 'a' }]);
    expect(store.saving()).toBe(false);
  });

  it('set modifie la liste sans écrire', () => {
    store.set([{ id: 'a' }]);

    expect(store.items()).toEqual([{ id: 'a' }]);
    expect(write).not.toHaveBeenCalled();
  });

  it('replace remplace la liste puis l’écrit', async () => {
    await store.replace([{ id: 'z' }]);

    expect(JSON.parse(files.get('data.json')!)).toEqual([{ id: 'z' }]);
  });

  it('enchaîne les écritures : la dernière contient tout', async () => {
    store.update((items) => [...items, { id: 'a' }]);
    store.update((items) => [...items, { id: 'b' }]);
    await store.update((items) => [...items, { id: 'c' }]);

    expect(JSON.parse(files.get('data.json')!).map((i: { id: string }) => i.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('signale l’absence de projet ouvert puis se rétablit', async () => {
    isOpen.set(false);
    await store.update((items) => [...items, { id: 'a' }]);
    expect(store.error()).toContain('Aucun projet ouvert');
    expect(write).not.toHaveBeenCalled();

    isOpen.set(true);
    await store.update((items) => items);
    expect(store.error()).toBeNull();
  });

  it('nomme le fichier dans l’erreur d’un fichier illisible et le protège', async () => {
    files.set('data.json', 'oups');
    await store.load();
    expect(store.error()).toContain('data.json est illisible');

    await store.update((items) => [...items, { id: 'a' }]);
    expect(files.get('data.json')).toBe('oups');

    files.set('data.json', '[{"id":"ok"}]');
    await store.load();
    expect(store.error()).toBeNull();
    await store.update((items) => [...items, { id: 'b' }]);
    expect(JSON.parse(files.get('data.json')!)).toHaveLength(2);
  });
});
