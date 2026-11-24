import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';

import {
  Contract,
  DayEntry,
  DEFAULT_CONTRACT,
  normalizeEntry,
  splitWeekly,
} from '../models/timesheet';
import { JsonFileStore } from './json-file-store';
import { StorageService } from './storage.service';

export const TIMESHEET_FILE = 'timesheet.json';

/** Durée contractuelle, enregistrée comme liste d'un seul élément (format commun des fichiers du projet). */
export const CONTRACT_FILE = 'contract.json';

const CONTRACT_KEY = 'tf-contract';

/** Horaires réellement faits, jour par jour (timesheet.json), et durée contractuelle (navigateur). */
@Injectable({ providedIn: 'root' })
export class TimesheetService {
  private readonly storage = inject(StorageService);

  private readonly store = new JsonFileStore<DayEntry>(this.storage, TIMESHEET_FILE);

  private readonly contractStore = new JsonFileStore<Contract>(this.storage, CONTRACT_FILE);

  readonly entries = this.store.items;

  readonly error = this.store.error;

  readonly saving = this.store.saving;

  /** Saisies par jour, les anciennes (plage unique) étant converties en matin. */
  readonly byDate = computed(
    () => new Map(this.entries().map((entry) => [entry.date, normalizeEntry(entry)])),
  );

  private readonly contractState = signal<Contract>(this.restoreContract());

  readonly contract = this.contractState.asReadonly();

  constructor() {
    effect(() => {
      if (this.storage.projectOpened() > 0) {
        untracked(async () => {
          await Promise.all([this.store.load(), this.contractStore.load()]);
          const saved = this.contractStore.items()[0];
          if (this.validContract(saved)) {
            this.contractState.set(saved);
            this.cacheContract();
          } else {
            // Fichier absent : on y écrit le contrat déjà connu dans ce navigateur.
            this.persistContract();
          }
        });
      }
    });
  }

  /** Modifie la saisie d'un jour ; une saisie vide est supprimée. */
  save(date: string, change: Partial<Omit<DayEntry, 'date'>>) {
    const current = this.byDate().get(date) ?? { date };
    const next: DayEntry = { ...current, ...change };
    for (const key of Object.keys(next) as (keyof DayEntry)[]) {
      if (next[key] === undefined || next[key] === '' || next[key] === null) {
        delete next[key];
      }
    }
    const empty = Object.keys(next).length === 1;
    return this.store.update((list) => {
      const others = list.filter((entry) => entry.date !== date);
      return empty ? others : [...others, next].sort((a, b) => a.date.localeCompare(b.date));
    });
  }

  /** Répartit un total hebdomadaire à parts égales du lundi au vendredi (week-end à 0). */
  setContractWeekly(hours: number) {
    const days = this.contractState().days;
    this.contractState.set({ days, minutes: splitWeekly(hours, days) });
    this.persistContract();
  }

  /** Choisit les jours travaillés ; le total hebdomadaire est conservé et redistribué entre eux. */
  setContractDays(days: boolean[]) {
    const total = this.contractState().minutes.reduce((sum, m) => sum + m, 0);
    this.contractState.set({ days, minutes: splitWeekly(total / 60, days) });
    this.persistContract();
  }

  /** Durée attendue (minutes) un jour de la semaine : 0 = lundi … 6 = dimanche. */
  setContractDay(index: number, minutes: number) {
    this.contractState.update((contract) => ({
      minutes: contract.minutes.map((value, i) => (i === index ? Math.max(0, minutes) : value)),
      days: contract.days.map((worked, i) => (i === index ? minutes > 0 : worked)),
    }));
    this.persistContract();
  }

  /** Remplace les saisies en mémoire (récupération depuis GitHub). */
  updateEntries(entries: DayEntry[]) {
    this.store.set(entries);
  }

  /** Remplace la durée contractuelle (récupération depuis GitHub). */
  updateContract(contract: Contract) {
    if (this.validContract(contract)) {
      this.contractState.set(contract);
      this.contractStore.set([contract]);
      this.cacheContract();
    }
  }

  /** Durée contractuelle courante, sous forme de liste pour la synchronisation. */
  contractItems(): Contract[] {
    return [this.contractState()];
  }

  private validContract(contract: Contract | undefined): contract is Contract {
    return (
      !!contract &&
      Array.isArray(contract.minutes) &&
      contract.minutes.length === 7 &&
      contract.minutes.every((m) => Number.isFinite(m)) &&
      Array.isArray(contract.days) &&
      contract.days.length === 7
    );
  }

  private persistContract() {
    void this.contractStore.replace([this.contractState()]);
    this.cacheContract();
  }

  private cacheContract() {
    try {
      localStorage.setItem(CONTRACT_KEY, JSON.stringify(this.contractState()));
    } catch {
      // Stockage indisponible : la durée ne sera pas conservée.
    }
  }

  private restoreContract(): Contract {
    try {
      const saved = JSON.parse(localStorage.getItem(CONTRACT_KEY) ?? 'null') as Contract | null;
      if (saved?.minutes?.length === 7 && saved.minutes.every((m) => Number.isFinite(m))) {
        // Un contrat enregistré avant le choix des jours : les jours travaillés sont ceux qui ont une durée.
        return { minutes: saved.minutes, days: saved.days ?? saved.minutes.map((m) => m > 0) };
      }
    } catch {
      // Valeur illisible : on repart du contrat par défaut.
    }
    return structuredClone(DEFAULT_CONTRACT);
  }
}
