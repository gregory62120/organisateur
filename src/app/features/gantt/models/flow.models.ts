export type FlowStatus = 'pending' | 'success' | 'error';

export interface FlowNode {
  /** Identifiant unique du bloc. */
  id: string;

  /**
   * Libellé affiché dans le bloc.
   */
  label: string;

  /**
   * Description affichée sous le libellé.
   */
  description?: string;

  /**
   * Icône affichée dans le cercle du bloc.
   *
   * La valeur correspond au nom d'une icône Material Symbols.
   */
  icon: string;
}

export interface FlowSource extends FlowNode {}

export interface FlowDestination extends FlowNode {
  /**
   * Indique si cette destination provoque l'arrêt du flux.
   */
  status?: FlowStatus;
}

export interface FlowPoint {
  x: number;
  y: number;
}

export interface FlowRoute {
  id: string;
  path: string;
  points: FlowPoint[];
  destination: FlowDestination;
  status: FlowStatus;
}
