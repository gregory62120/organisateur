import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  FlowPoint,
  FlowDestination,
  FlowSource,
  FlowStatus,
  FlowRoute,
} from '../models/flow.models';

/**
 * Composant graphique permettant de représenter un flux entre
 * une provenance et plusieurs destinations.
 *
 * Le composant génère automatiquement les branches SVG,
 * les flèches animées et le déplacement de l'indicateur.
 */
@Component({
  selector: 'app-flow',
  standalone: true,
  templateUrl: './flow.html',
  styleUrl: './flow.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowComponent implements AfterViewInit, OnDestroy {
  /**
   * Provenance du flux.
   */
  readonly source = input.required<FlowSource>();

  /**
   * Destinations du flux.
   */
  readonly destinations = input.required<FlowDestination[]>();

  /**
   * Largeur logique du SVG.
   */
  readonly width = input<number>(1000);

  /**
   * Hauteur logique du SVG.
   */
  readonly height = input<number>(520);

  /**
   * Largeur CSS du conteneur.
   */
  readonly containerWidth = input<string>('100%');

  /**
   * Hauteur CSS du conteneur.
   */
  readonly containerHeight = input<string>('520px');

  /**
   * Durée de déplacement de l'indicateur sur une branche.
   */
  readonly indicatorDuration = input<number>(1800);

  /**
   * Temps d'attente sur la destination en erreur avant
   * de recommencer le parcours.
   */
  readonly errorPauseDuration = input<number>(0);

  /**
   * Active ou désactive l'animation des flèches.
   */
  readonly animatedArrows = input<boolean>(true);

  /**
   * Active ou désactive l'indicateur.
   */
  readonly animatedIndicator = input<boolean>(true);

  private readonly svg = viewChild<ElementRef<SVGSVGElement>>('svg');

  private readonly routesState = signal<FlowRoute[]>([]);

  /**
   * Routes calculées à partir des destinations.
   */
  readonly routes = this.routesState.asReadonly();

  /**
   * Index de la destination actuellement parcourue par l'indicateur.
   */
  readonly activeRouteIndex = signal<number>(0);

  /**
   * Première destination en erreur.
   */
  readonly errorIndex = computed(() => {
    const destinations = this.destinations();

    return destinations.findIndex((destination) => destination.status === 'error');
  });

  /**
   * Indique si le flux contient une erreur.
   */
  readonly hasError = computed(() => this.errorIndex() !== -1);

  /**
   * Index de la dernière destination qui doit être parcourue.
   */
  readonly lastRouteIndex = computed(() => {
    const errorIndex = this.errorIndex();
    const destinations = this.destinations();

    if (!destinations.length) {
      return -1;
    }

    return errorIndex === -1 ? destinations.length - 1 : errorIndex;
  });

  /**
   * Route actuellement parcourue.
   */
  readonly activeRoute = computed(() => {
    const routes = this.routes();

    if (!routes.length) {
      return undefined;
    }

    return routes[this.activeRouteIndex() % routes.length];
  });

  /**
   * Indique si l'animation est actuellement active.
   */
  readonly isPlaying = signal(false);

  /**
   * Progression actuelle de l'indicateur sur la route.
   */
  private readonly indicatorProgress = signal(0);

  private animationFrameId?: number;
  private pauseTimeoutId?: ReturnType<typeof setTimeout>;
  private animationStartTime = 0;
  private resizeObserver?: ResizeObserver;

  private readonly sourcePoint: FlowPoint = {
    x: 260,
    y: 260,
  };

  readonly destinationX = 820;

  constructor() {
    effect(() => {
      const destinations = this.destinations();

      this.buildRoutes(destinations);
    });

    effect(() => {
      this.animatedIndicator();

      if (!this.animatedIndicator()) {
        this.stopAnimation();
        return;
      }

      if (this.svg()) {
        this.startIndicator();
      }
    });
  }

  /**
   * Initialise l'observation du SVG après son rendu.
   */
  ngAfterViewInit(): void {
    this.buildRoutes(this.destinations());

    this.resizeObserver = new ResizeObserver(() => {
      this.buildRoutes(this.destinations());
    });

    const svgElement = this.svg()?.nativeElement;

    if (svgElement) {
      this.resizeObserver.observe(svgElement);
    }

    if (this.animatedIndicator()) {
      this.startIndicator();
    }
  }

  /**
   * Libère les ressources d'animation et d'observation.
   */
  ngOnDestroy(): void {
    this.stopAnimation();
    this.resizeObserver?.disconnect();
  }

  /**
   * Retourne l'état graphique effectif d'une destination.
   */
  getEffectiveStatus(index: number): FlowStatus {
    const errorIndex = this.errorIndex();

    if (errorIndex === -1) {
      return 'success';
    }

    if (index < errorIndex) {
      return 'success';
    }

    if (index === errorIndex) {
      return 'error';
    }

    return 'pending';
  }

  /**
   * Retourne la classe CSS correspondant à l'état d'une destination.
   */
  statusClass(status: FlowStatus | undefined): string {
    return `status-${status ?? 'pending'}`;
  }

  /**
   * Retourne le symbole visuel correspondant à l'état d'une destination.
   */
  statusIcon(status: FlowStatus | undefined): string {
    switch (status) {
      case 'success':
        return '✓';

      case 'error':
        return '×';

      default:
        return 'remove';
    }
  }

  /**
   * Active ou met en pause l'animation du flux.
   */
  toggleAnimation(): void {
    if (this.isPlaying()) {
      this.isPlaying.set(false);
      this.stopAnimation();
      return;
    }

    this.isPlaying.set(true);
    this.startIndicator();
  }

  /**
   * Construit les chemins SVG entre la provenance et les destinations.
   */
  private buildRoutes(destinations: FlowDestination[]): void {
    if (!destinations.length) {
      this.routesState.set([]);
      return;
    }

    const availableHeight = this.height() - 120;
    const spacing = availableHeight / destinations.length;

    const routes = destinations.map((destination, index) => {
      const y = 60 + spacing * index + spacing / 2;

      const controlX1 = 420;
      const controlX2 = 560;

      const points: FlowPoint[] = [
        {
          x: this.sourcePoint.x,
          y: this.sourcePoint.y,
        },
        {
          x: controlX1,
          y: this.sourcePoint.y,
        },
        {
          x: controlX2,
          y,
        },
        {
          x: this.destinationX,
          y,
        },
      ];

      const path = [
        `M ${this.sourcePoint.x} ${this.sourcePoint.y}`,
        `C ${controlX1} ${this.sourcePoint.y}`,
        `${controlX2} ${y}`,
        `${this.destinationX} ${y}`,
      ].join(' ');

      return {
        id: destination.id,
        path,
        points,
        destination,
        status: this.getEffectiveStatus(index),
      };
    });

    this.routesState.set(routes);

    if (this.activeRouteIndex() > this.lastRouteIndex()) {
      this.activeRouteIndex.set(0);
    }

    queueMicrotask(() => {
      if (this.animatedIndicator()) {
        this.startIndicator();
      }
    });
  }

  /**
   * Démarre ou reprend le déplacement de l'indicateur sur la route courante.
   */
  private startIndicator(): void {
    this.stopAnimation(false);

    if (!this.isPlaying()) {
      return;
    }

    const route = this.activeRoute();

    if (!route) {
      return;
    }

    const svg = this.svg()?.nativeElement;

    if (!svg) {
      return;
    }

    const path = svg.querySelector(`[data-flow-path="${route.id}"]`) as SVGPathElement | null;

    const indicator = svg.querySelector('[data-flow-indicator]') as SVGCircleElement | null;

    const indicatorCore = svg.querySelector(
      '[data-flow-indicator-core]',
    ) as SVGCircleElement | null;

    if (!path || !indicator || !indicatorCore) {
      return;
    }

    const totalLength = path.getTotalLength();

    if (!totalLength) {
      return;
    }

    const initialProgress = this.indicatorProgress();

    this.animationStartTime = performance.now() - initialProgress * this.indicatorDuration();

    const animate = (timestamp: number): void => {
      if (!this.isPlaying()) {
        return;
      }

      const elapsed = timestamp - this.animationStartTime;

      const duration = this.indicatorDuration();

      const progress = Math.min(elapsed / duration, 1);

      this.indicatorProgress.set(progress);

      const easedProgress = this.easeInOut(progress);

      const point = path.getPointAtLength(totalLength * easedProgress);

      indicator.setAttribute('cx', `${point.x}`);
      indicator.setAttribute('cy', `${point.y}`);

      indicatorCore.setAttribute('cx', `${point.x}`);
      indicatorCore.setAttribute('cy', `${point.y}`);

      if (progress >= 1) {
        this.indicatorProgress.set(0);
        this.onRouteCompleted();
        return;
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Traite la fin du déplacement sur une destination.
   */
  private onRouteCompleted(): void {
    this.animationFrameId = undefined;
    this.indicatorProgress.set(0);

    if (!this.isPlaying()) {
      return;
    }

    const currentIndex = this.activeRouteIndex();
    const lastIndex = this.lastRouteIndex();

    if (currentIndex >= lastIndex) {
      this.pauseAndRestart();
      return;
    }

    this.activeRouteIndex.update((index) => index + 1);

    requestAnimationFrame(() => {
      this.startIndicator();
    });
  }

  /**
   * Attend avant de recommencer le parcours depuis la source.
   */
  private pauseAndRestart(): void {
    this.animationFrameId = undefined;

    if (!this.isPlaying()) {
      return;
    }

    this.pauseTimeoutId = setTimeout(() => {
      this.pauseTimeoutId = undefined;

      if (!this.isPlaying()) {
        return;
      }

      this.activeRouteIndex.set(0);
      this.indicatorProgress.set(0);
      this.startIndicator();
    }, this.errorPauseDuration());
  }

  /**
   * Arrête l'animation en cours.
   */
  private stopAnimation(clearPause = true): void {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }

    if (clearPause && this.pauseTimeoutId !== undefined) {
      clearTimeout(this.pauseTimeoutId);
      this.pauseTimeoutId = undefined;
    }
  }

  /**
   * Applique une interpolation douce au déplacement.
   */
  private easeInOut(value: number): number {
    return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
  }
}
