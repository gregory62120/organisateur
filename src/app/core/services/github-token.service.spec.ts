import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { GITHUB_TOKEN_KEY, GithubTokenService, maskToken } from './github-token.service';

describe('GithubTokenService', () => {
  let store: Record<string, string>;
  let results: unknown[];
  let opened: unknown[];

  beforeEach(() => {
    store = {};
    results = [];
    opened = [];
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => (store[key] = value),
      removeItem: (key: string) => delete store[key],
    });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Dialog,
          useValue: {
            open: (_component: unknown, config: { data: unknown }) => {
              opened.push(config.data);
              return { closed: of(results.shift()) };
            },
          },
        },
      ],
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('masque le token', () => {
    expect(maskToken('ghp_abcdefghijklmnop1234')).toBe('ghp_…1234');
    expect(maskToken('court')).toBe('••••');
  });

  it('mémorise un token saisi quand on le demande, puis le propose', async () => {
    const service = TestBed.inject(GithubTokenService);
    results.push({ token: ' ghp_secret_1234 ', remember: true });

    expect(await service.request('envoyer')).toBe('ghp_secret_1234');
    expect(store[GITHUB_TOKEN_KEY]).toBe('ghp_secret_1234');

    results.push({ useSaved: true });
    expect(await service.request('envoyer')).toBe('ghp_secret_1234');
    expect(opened[1]).toEqual({ purpose: 'envoyer', saved: 'ghp_…1234' });
  });

  it('ne mémorise rien si la case n’est pas cochée', async () => {
    const service = TestBed.inject(GithubTokenService);
    results.push({ token: 'ghp_temporaire_9999', remember: false });

    expect(await service.request('envoyer')).toBe('ghp_temporaire_9999');
    expect(service.saved()).toBeNull();
    expect(store[GITHUB_TOKEN_KEY]).toBeUndefined();
  });

  it('retrouve le token mémorisé au démarrage', () => {
    store[GITHUB_TOKEN_KEY] = 'ghp_ancien_0000';
    expect(TestBed.inject(GithubTokenService).saved()).toBe('ghp_ancien_0000');
  });

  it('oublie le token, puis redemande la saisie', async () => {
    store[GITHUB_TOKEN_KEY] = 'ghp_ancien_0000';
    const service = TestBed.inject(GithubTokenService);
    results.push({ forget: true }, { token: 'ghp_nouveau_1111', remember: true });

    expect(await service.request('récupérer')).toBe('ghp_nouveau_1111');
    expect(opened[1]).toEqual({ purpose: 'récupérer', saved: null });
    expect(store[GITHUB_TOKEN_KEY]).toBe('ghp_nouveau_1111');
  });

  it('renvoie null si la fenêtre est fermée', async () => {
    const service = TestBed.inject(GithubTokenService);
    results.push(undefined);
    expect(await service.request('envoyer')).toBeNull();
  });
});
