import { mergeAttributes, Node } from '@tiptap/core';
import { recognizeShape } from './shape-recognition';

interface DrawingPoint {
  x: number;
  y: number;
  p?: number;
}

type FillPattern = 'solid' | 'hatch' | 'cross' | 'horizontal' | 'vertical' | 'dots';

const FILL_PATTERNS: { value: FillPattern; label: string }[] = [
  { value: 'solid', label: 'Plein' },
  { value: 'hatch', label: 'Hachures' },
  { value: 'cross', label: 'Croisé' },
  { value: 'horizontal', label: 'Lignes' },
  { value: 'vertical', label: 'Colonnes' },
  { value: 'dots', label: 'Points' },
];

/** Peint une trame (hachures, lignes, points…) dans la zone de découpe courante. */
const paintPattern = (
  ctx: CanvasRenderingContext2D,
  pattern: FillPattern,
  box: { x0: number; y0: number; x1: number; y1: number },
  gap = 8,
) => {
  const { x0, y0, x1, y1 } = box;
  const w = x1 - x0;
  const h = y1 - y0;
  ctx.beginPath();
  if (pattern === 'dots') {
    for (let x = x0; x <= x1; x += gap) {
      for (let y = y0; y <= y1; y += gap) {
        ctx.moveTo(x + 1.6, y);
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      }
    }
    ctx.fill();
    return;
  }
  if (pattern === 'hatch' || pattern === 'cross') {
    for (let k = -h; k <= w; k += gap) {
      ctx.moveTo(x0 + k, y1);
      ctx.lineTo(x0 + k + h, y0);
    }
  }
  if (pattern === 'cross') {
    for (let k = -h; k <= w; k += gap) {
      ctx.moveTo(x0 + k, y0);
      ctx.lineTo(x0 + k + h, y1);
    }
  }
  if (pattern === 'horizontal') {
    for (let y = y0; y <= y1; y += gap) {
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
    }
  }
  if (pattern === 'vertical') {
    for (let x = x0; x <= x1; x += gap) {
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
    }
  }
  ctx.stroke();
};

type DrawingTool =
  | 'pen'
  | 'highlighter'
  | 'shape'
  | 'eraser'
  | 'strokeEraser'
  | 'lasso'
  | 'text'
  | 'laser'
  | 'pan'
  | 'pipette';
type PenKind = 'ballpoint' | 'fountain' | 'pencil';
const PEN_KINDS: { kind: PenKind | undefined; icon: string; label: string }[] = [
  { kind: undefined, icon: 'edit', label: 'Stylo' },
  { kind: 'ballpoint', icon: 'stylus', label: 'Stylo bille' },
  { kind: 'fountain', icon: 'ink_pen', label: 'Plume' },
  { kind: 'pencil', icon: 'draw', label: 'Crayon' },
];
type ShapeKind = 'line' | 'arrow' | 'rect' | 'ellipse' | 'triangle' | 'diamond' | 'polygon';

const SHAPE_OPTIONS: { value: ShapeKind; label: string; icon: string }[] = [
  { value: 'line', label: 'Ligne', icon: 'horizontal_rule' },
  { value: 'arrow', label: 'Flèche', icon: 'arrow_right_alt' },
  { value: 'rect', label: 'Rectangle', icon: 'rectangle' },
  { value: 'ellipse', label: 'Ellipse', icon: 'circle' },
  { value: 'triangle', label: 'Triangle', icon: 'change_history' },
  { value: 'diamond', label: 'Losange', icon: 'diamond' },
];

const PEN_SIZES = [
  { label: 'Fin', value: 1.8, dot: 4 },
  { label: 'Moyen', value: 3, dot: 8 },
  { label: 'Épais', value: 5.5, dot: 12 },
];

const RULER_THICKNESS = 44;
const LASER_LIFETIME = 1200;

const TEXT_SIZES = [18, 26, 38];
const TEXT_FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const TEXT_LINE_HEIGHT = 1.25;

const HIGHLIGHTER_ALPHA = 0.35;
const HIGHLIGHTER_FACTOR = 5;

interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface LassoGesture {
  mode:
    | 'lasso'
    | 'move'
    | 'scale'
    | 'erase'
    | 'rulerMove'
    | 'rulerRotate'
    | 'laser'
    | 'areaErase'
    | 'pan';
  erased: number[];
  start: DrawingPoint;
  path: DrawingPoint[];
  bounds: Bounds | null;
  dx: number;
  dy: number;
  s: number;
  base?: DrawingStroke[];
  /** Redimensionnement : poignée saisie, point fixe (opposé) et facteurs par axe. */
  handle?: string;
  anchor?: { x: number; y: number };
  sx?: number;
  sy?: number;
}

// Poignées de redimensionnement (fx, fy : position relative sur la boîte de sélection).
const HANDLE_DEFS = [
  { id: 'nw', fx: 0, fy: 0 },
  { id: 'ne', fx: 1, fy: 0 },
  { id: 'se', fx: 1, fy: 1 },
  { id: 'sw', fx: 0, fy: 1 },
  { id: 'n', fx: 0.5, fy: 0 },
  { id: 'e', fx: 1, fy: 0.5 },
  { id: 's', fx: 0.5, fy: 1 },
  { id: 'w', fx: 0, fy: 0.5 },
];

interface DrawingStroke {
  color: string;
  size: number;
  tool?: DrawingTool | 'image';
  src?: string;
  shape?: ShapeKind;
  fill?: string | boolean;
  fillAlpha?: number;
  fillPattern?: FillPattern;
  fillGap?: number;
  pen?: PenKind;
  dash?: 'dashed' | 'dotted';
  points: DrawingPoint[];
}

type DrawingPageStyle =
  'blank' | 'seyes' | 'seyesMargin' | 'smallGrid' | 'largeGrid' | 'ruled' | 'largeRuled' | 'dots';

interface DrawingPageStyleOption {
  value: DrawingPageStyle;
  label: string;
  icon: string;
}

export interface DrawingOptions {
  HTMLAttributes: Record<string, unknown>;
  width: number;
  height: number;
  color: string;
  colors: string[];
  size: number;
  eraserSize: number;
}

const PAGE_STYLE_OPTIONS: DrawingPageStyleOption[] = [
  { value: 'blank', label: 'Blanche', icon: 'crop_square' },
  { value: 'seyes', label: 'Seyes sans marge', icon: 'border_all' },
  { value: 'seyesMargin', label: 'Seyes avec marge', icon: 'format_indent_increase' },
  { value: 'smallGrid', label: 'Petits carreaux', icon: 'grid_on' },
  { value: 'largeGrid', label: 'Gros carreaux', icon: 'grid_4x4' },
  { value: 'ruled', label: 'Lignes', icon: 'table_rows' },
  { value: 'largeRuled', label: 'Grosses lignes', icon: 'density_large' },
  { value: 'dots', label: 'Points', icon: 'more_horiz' },
];

const parsePageStyle = (value: unknown): DrawingPageStyle => {
  const style = typeof value === 'string' ? value : '';
  return PAGE_STYLE_OPTIONS.some((option) => option.value === style)
    ? (style as DrawingPageStyle)
    : 'blank';
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    drawing: {
      insertDrawing: () => ReturnType;
      insertWhiteboard: () => ReturnType;
    };
  }
}

const parseStrokes = (value: unknown): DrawingStroke[] => {
  if (Array.isArray(value)) {
    return value as DrawingStroke[];
  }

  if (typeof value !== 'string' || !value) {
    return [];
  }

  try {
    const decoded = decodeURIComponent(value);
    const parsed = JSON.parse(decoded);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const serializeStrokes = (strokes: DrawingStroke[]) => encodeURIComponent(JSON.stringify(strokes));

interface ActiveDrawing {
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => void;
  redo: () => void;
  copy: (cut: boolean) => boolean;
  paste: () => boolean;
}

// Dessin avec lequel l'utilisateur interagit en dernier : Ctrl+Z / Ctrl+Y agissent sur lui.
// Presse-papiers commun à tous les dessins (copier d'un dessin, coller dans un autre).
let drawingClipboard: DrawingStroke[] = [];
let activeDrawing: ActiveDrawing | null = null;
let globalListenersInstalled = false;

const isInsideDrawing = (target: EventTarget | null) =>
  target instanceof Element && target.closest('.ate-drawing-node') !== null;

// Écouteurs globaux (phase de capture) : ils passent avant ceux de l'éditeur, donc avant
// son historique. Ctrl+Z / Ctrl+Y agissent sur le dessin touché en dernier, tant que
// l'utilisateur n'a ni cliqué ailleurs ni tapé de texte.
const installGlobalListeners = () => {
  if (globalListenersInstalled || typeof document === 'undefined') {
    return;
  }
  globalListenersInstalled = true;

  document.addEventListener(
    'pointerdown',
    (event) => {
      if (!isInsideDrawing(event.target)) {
        activeDrawing = null;
      }
    },
    true,
  );

  document.addEventListener(
    'keydown',
    (event) => {
      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (modifier && (key === 'z' || key === 'y')) {
        const redo = key === 'y' || event.shiftKey;
        const target = event.target as HTMLElement | null;
        // Dans un champ de saisie (texte du dessin, curseurs…) on laisse le navigateur faire.
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          return;
        }
        const drawing = activeDrawing;
        if (drawing && (redo ? drawing.canRedo() : drawing.canUndo())) {
          event.preventDefault();
          event.stopPropagation();
          if (redo) {
            drawing.redo();
          } else {
            drawing.undo();
          }
        }
        return;
      }
      if (modifier && (key === 'c' || key === 'x' || key === 'v')) {
        const target = event.target as HTMLElement | null;
        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          !activeDrawing
        ) {
          return;
        }
        const done = key === 'v' ? activeDrawing.paste() : activeDrawing.copy(key === 'x');
        if (done) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
      // Taper du texte hors d'un dessin rend la main à l'historique de l'éditeur.
      if (
        !modifier &&
        !isInsideDrawing(event.target) &&
        (event.key.length === 1 ||
          event.key === 'Backspace' ||
          event.key === 'Delete' ||
          event.key === 'Enter')
      ) {
        activeDrawing = null;
      }
    },
    true,
  );
};

export const Drawing = Node.create<DrawingOptions>({
  name: 'drawing',

  // Passe avant l'historique de l'éditeur pour les raccourcis annuler / rétablir.
  priority: 1000,

  group: 'block',

  atom: true,

  draggable: true,

  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      width: 720,
      height: 360,
      color: '#111827',
      colors: [
        '#111827',
        '#ef4444',
        '#f97316',
        '#eab308',
        '#22c55e',
        '#06b6d4',
        '#3b82f6',
        '#a855f7',
      ],
      size: 3,
      eraserSize: 18,
    };
  },

  addAttributes() {
    return {
      width: {
        default: this.options.width,
        parseHTML: (element) => Number(element.getAttribute('data-width')) || this.options.width,
        renderHTML: (attributes) => ({ 'data-width': attributes['width'] }),
      },
      height: {
        default: this.options.height,
        parseHTML: (element) => Number(element.getAttribute('data-height')) || this.options.height,
        renderHTML: (attributes) => ({ 'data-height': attributes['height'] }),
      },
      strokes: {
        default: [],
        parseHTML: (element) => parseStrokes(element.getAttribute('data-strokes')),
        renderHTML: (attributes) => ({
          'data-strokes': serializeStrokes(parseStrokes(attributes['strokes'])),
        }),
      },
      board: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-board') === 'true',
        renderHTML: (attributes) => ({ 'data-board': attributes['board'] ? 'true' : 'false' }),
      },
      view: {
        default: null,
        parseHTML: (element) => {
          try {
            const parsed = JSON.parse(element.getAttribute('data-view') ?? 'null');
            return parsed && typeof parsed.zoom === 'number' ? parsed : null;
          } catch {
            return null;
          }
        },
        renderHTML: (attributes) =>
          attributes['view'] ? { 'data-view': JSON.stringify(attributes['view']) } : {},
      },
      pageStyle: {
        default: 'blank',
        parseHTML: (element) => parsePageStyle(element.getAttribute('data-page-style')),
        renderHTML: (attributes) => ({
          'data-page-style': parsePageStyle(attributes['pageStyle']),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="drawing"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'drawing',
        class: 'ate-drawing',
      }),
    ];
  },

  addCommands() {
    return {
      insertDrawing:
        () =>
        ({ commands }) =>
          commands.insertContent([
            {
              type: this.name,
              attrs: {
                width: this.options.width,
                height: this.options.height,
                strokes: [],
                pageStyle: 'blank',
              },
            },
            { type: 'paragraph' },
          ]),
      insertWhiteboard:
        () =>
        ({ commands }) =>
          commands.insertContent([
            {
              type: this.name,
              attrs: {
                width: 1000,
                height: 700,
                strokes: [],
                pageStyle: 'dots',
                board: true,
              },
            },
            { type: 'paragraph' },
          ]),
    };
  },

  addNodeView() {
    installGlobalListeners();
    return ({ node, editor, getPos }) => {
      let currentNode = node;
      let strokes = parseStrokes(currentNode.attrs['strokes']);
      let currentStroke: DrawingStroke | null = null;
      let isDrawing = false;
      let currentColor = this.options.color;
      let currentTool: DrawingTool = 'pen';
      let lastDrawTool: DrawingTool = 'pen';
      let currentShape: ShapeKind = 'line';
      // Remplissage des formes : null = aucun, 'auto' = couleur du trait, sinon une couleur.
      let shapeFill: string | null = null;
      let shapeFillColor = '#3b82f6';
      let shapeFillAlpha = 0.25;
      let shapeFillPattern: FillPattern = 'solid';
      let shapeFillGap = 8;
      let isFillMenuOpen = false;
      let fillTimer: ReturnType<typeof setTimeout> | null = null;
      let currentSizeIndex = 1;
      let isShapeMenuOpen = false;
      let holdTimer: ReturnType<typeof setTimeout> | null = null;
      let holdAnchor: DrawingPoint | null = null;
      // Forme fermée reconnue pendant le tracé : elle ne suit plus le stylet.
      let frozenShape = false;
      let currentEraserSize = this.options.eraserSize;
      let currentPageStyle = parsePageStyle(currentNode.attrs['pageStyle']);
      let eraserMode: 'area' | 'stroke' = 'area';
      let isEraserSizePopupOpen = false;
      let isPageStyleMenuOpen = false;
      let lastPointerEvent: PointerEvent | null = null;
      let isResizing = false;
      let resizeStartY = 0;
      let resizeStartHeight = 0;
      let logicalWidth = Number(currentNode.attrs['width']) || this.options.width;
      let logicalHeight = Number(currentNode.attrs['height']) || this.options.height;
      // Tableau blanc : surface infinie, avec déplacement (pan) et zoom.
      const board = Boolean(currentNode.attrs['board']);
      const view = { x: 0, y: 0, zoom: 1 };
      const savedView = currentNode.attrs['view'] as { x: number; y: number; zoom: number } | null;
      if (board && savedView && [savedView.x, savedView.y, savedView.zoom].every(Number.isFinite)) {
        view.x = savedView.x;
        view.y = savedView.y;
        view.zoom = savedView.zoom;
      }
      let needsInitialFit = board && !(savedView && Number.isFinite(savedView.zoom));
      let lastSavedView: string | null = null;
      let viewTimer: ReturnType<typeof setTimeout> | null = null;
      const viewKey = () =>
        JSON.stringify({
          x: Math.round(view.x),
          y: Math.round(view.y),
          zoom: Math.round(view.zoom * 100) / 100,
        });
      let isFullscreen = false;
      const boundsCache = new WeakMap<DrawingStroke, Bounds>();
      const touches = new Map<number, { x: number; y: number }>();
      const consumedTouches = new Set<number>();
      let pinch: { dist: number; cx: number; cy: number } | null = null;
      let panAnchor: { x: number; y: number } | null = null;
      let scale = 1;
      let liveIndex = 0;
      let activePointerId: number | null = null;
      let allowFinger = false;
      let history: DrawingStroke[][] = [];
      let future: DrawingStroke[][] = [];
      let selection: number[] = [];
      let penIndex = 0;
      let currentDash: 'solid' | 'dashed' | 'dotted' = 'solid';
      let lockRatio = false;
      let gesture: LassoGesture | null = null;
      const ruler = {
        active: false,
        cx: logicalWidth / 2,
        cy: logicalHeight / 2,
        angle: 0,
        length: Math.min(logicalWidth * 0.7, 480),
      };
      let rulerSide: number | null = null;
      let laserTrail: { x: number; y: number; t: number }[] = [];
      let laserFrame: number | null = null;
      let editingIndex: number | null = null;
      let lastTap: { time: number; x: number; y: number } | null = null;

      const wrapper = document.createElement('div');
      wrapper.className = 'ate-drawing-node';
      wrapper.contentEditable = 'false';
      wrapper.style.border = '1px solid var(--ate-border, #e2e8f0)';
      wrapper.style.borderRadius = '8px';
      wrapper.style.background = 'var(--ate-surface, #ffffff)';
      wrapper.style.overflow = 'visible';
      wrapper.style.margin = '12px 0';
      wrapper.style.maxWidth = '100%';

      const toolbar = document.createElement('div');
      toolbar.className = 'ate-drawing-toolbar';
      toolbar.style.display = 'flex';
      toolbar.style.alignItems = 'center';
      toolbar.style.justifyContent = 'space-between';
      toolbar.style.gap = '8px';
      toolbar.style.padding = '8px';
      toolbar.style.borderBottom = '1px solid var(--ate-border, #e2e8f0)';
      toolbar.style.background = 'var(--ate-surface-secondary, #f8f9fa)';

      const label = document.createElement('span');
      label.textContent = 'Dessin';
      label.style.color = 'var(--ate-text-secondary, #64748b)';
      label.style.fontSize = '12px';
      label.style.fontWeight = '600';

      const controls = document.createElement('div');
      controls.style.display = 'flex';
      controls.style.alignItems = 'center';
      controls.style.gap = '8px';
      controls.style.flexWrap = 'wrap';

      const palette = document.createElement('div');
      palette.style.display = 'flex';
      palette.style.alignItems = 'center';
      palette.style.gap = '4px';

      const colorPickerLabel = document.createElement('label');
      colorPickerLabel.title = 'Choisir une couleur';
      colorPickerLabel.setAttribute('aria-label', 'Choisir une couleur');
      colorPickerLabel.style.position = 'relative';
      colorPickerLabel.style.display = 'inline-flex';
      colorPickerLabel.style.alignItems = 'center';
      colorPickerLabel.style.justifyContent = 'center';
      colorPickerLabel.style.width = '30px';
      colorPickerLabel.style.height = '30px';
      colorPickerLabel.style.border = '1px solid var(--ate-border, #e2e8f0)';
      colorPickerLabel.style.borderRadius = '6px';
      colorPickerLabel.style.background = 'var(--ate-surface, #ffffff)';
      colorPickerLabel.style.color = 'var(--ate-text, #2d3748)';
      colorPickerLabel.style.cursor = 'pointer';

      const paletteIcon = document.createElement('span');
      paletteIcon.className = 'material-symbols-outlined';
      paletteIcon.textContent = 'palette';
      paletteIcon.style.fontSize = '18px';
      paletteIcon.style.lineHeight = '1';

      const colorPicker = document.createElement('input');
      colorPicker.type = 'color';
      colorPicker.value = currentColor;
      colorPicker.title = 'Choisir une couleur';
      colorPicker.style.position = 'absolute';
      colorPicker.style.inset = '0';
      colorPicker.style.width = '100%';
      colorPicker.style.height = '100%';
      colorPicker.style.opacity = '0';
      colorPicker.style.cursor = 'pointer';

      colorPickerLabel.append(paletteIcon, colorPicker);

      const currentColorPreview = document.createElement('span');
      currentColorPreview.title = 'Couleur active';
      currentColorPreview.style.width = '22px';
      currentColorPreview.style.height = '22px';
      currentColorPreview.style.border = '1px solid var(--ate-border, #e2e8f0)';
      currentColorPreview.style.borderRadius = '999px';
      currentColorPreview.style.background = currentColor;
      currentColorPreview.style.flexShrink = '0';

      palette.append(colorPickerLabel, currentColorPreview);

      const colorButtons = this.options.colors.map((paletteColor) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.title = `Couleur ${paletteColor}`;
        button.setAttribute('aria-label', `Couleur ${paletteColor}`);
        button.style.width = '22px';
        button.style.height = '22px';
        button.style.border = '1px solid var(--ate-border, #e2e8f0)';
        button.style.borderRadius = '999px';
        button.style.background = paletteColor;
        button.style.padding = '0';
        button.style.cursor = 'pointer';
        button.style.boxShadow =
          paletteColor === currentColor ? '0 0 0 2px var(--ate-primary, #2563eb)' : 'none';
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!editor.isEditable) {
            return;
          }
          currentColor = paletteColor;
          colorPicker.value = currentColor;
          if (currentTool === 'eraser') {
            currentTool = lastDrawTool;
          }
          updateToolbarState();
        });
        palette.appendChild(button);
        return { button, color: paletteColor };
      });

      const pageStyleWrapper = document.createElement('div');
      pageStyleWrapper.style.position = 'relative';
      pageStyleWrapper.style.display = 'inline-flex';
      pageStyleWrapper.style.alignItems = 'center';

      const pageStyleButton = document.createElement('button');
      pageStyleButton.type = 'button';
      pageStyleButton.title = 'Format de page';
      pageStyleButton.setAttribute('aria-label', 'Format de page');

      const pageStyleIcon = document.createElement('span');
      pageStyleIcon.className = 'material-symbols-outlined';
      pageStyleIcon.textContent =
        PAGE_STYLE_OPTIONS.find((option) => option.value === currentPageStyle)?.icon ?? 'article';
      pageStyleIcon.style.fontSize = '18px';
      pageStyleIcon.style.lineHeight = '1';

      pageStyleButton.appendChild(pageStyleIcon);

      const pageStyleMenu = document.createElement('div');
      pageStyleMenu.style.position = 'absolute';
      pageStyleMenu.style.top = 'calc(100% + 8px)';
      pageStyleMenu.style.left = '50%';
      pageStyleMenu.style.transform = 'translateX(-50%)';
      pageStyleMenu.style.display = 'grid';
      pageStyleMenu.style.gridTemplateColumns = 'repeat(2, minmax(122px, 1fr))';
      pageStyleMenu.style.gap = '4px';
      pageStyleMenu.style.padding = '6px';
      pageStyleMenu.style.border = '1px solid var(--ate-border, #e2e8f0)';
      pageStyleMenu.style.borderRadius = '8px';
      pageStyleMenu.style.background = 'var(--ate-surface, #ffffff)';
      pageStyleMenu.style.boxShadow = 'var(--ate-menu-shadow, 0 10px 15px -3px rgba(0, 0, 0, 0.1))';
      pageStyleMenu.style.zIndex = '6';
      pageStyleMenu.style.visibility = 'hidden';
      pageStyleMenu.style.pointerEvents = 'none';

      const pageStyleButtons = PAGE_STYLE_OPTIONS.map((option) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.title = option.label;
        button.setAttribute('aria-label', option.label);
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.gap = '6px';
        button.style.border = '1px solid var(--ate-border, #e2e8f0)';
        button.style.borderRadius = '6px';
        button.style.background = 'var(--ate-surface, #ffffff)';
        button.style.color = 'var(--ate-text, #2d3748)';
        button.style.padding = '6px 8px';
        button.style.fontSize = '12px';
        button.style.cursor = 'pointer';
        button.style.whiteSpace = 'nowrap';

        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined';
        icon.textContent = option.icon;
        icon.style.fontSize = '17px';
        icon.style.lineHeight = '1';

        const text = document.createElement('span');
        text.textContent = option.label;

        button.append(icon, text);
        pageStyleMenu.appendChild(button);
        return { button, option };
      });

      pageStyleWrapper.append(pageStyleButton, pageStyleMenu);

      const eraserButton = document.createElement('button');
      eraserButton.type = 'button';
      eraserButton.title = 'Utiliser la gomme';
      eraserButton.setAttribute('aria-label', 'Utiliser la gomme');

      const eraserIcon = document.createElement('span');
      eraserIcon.className = 'material-symbols-outlined';
      eraserIcon.textContent = 'ink_eraser';
      eraserIcon.style.fontSize = '18px';
      eraserIcon.style.lineHeight = '1';

      eraserButton.appendChild(eraserIcon);

      const eraserToolWrapper = document.createElement('div');
      eraserToolWrapper.style.position = 'relative';
      eraserToolWrapper.style.display = 'inline-flex';
      eraserToolWrapper.style.alignItems = 'center';

      const eraserSizeControl = document.createElement('label');
      eraserSizeControl.title = 'Taille de la gomme';
      eraserSizeControl.style.display = 'flex';
      eraserSizeControl.style.alignItems = 'center';
      eraserSizeControl.style.gap = '8px';
      eraserSizeControl.style.flexDirection = 'column';
      eraserSizeControl.style.alignItems = 'stretch';
      eraserSizeControl.style.color = 'var(--ate-text-secondary, #64748b)';
      eraserSizeControl.style.fontSize = '12px';
      eraserSizeControl.style.position = 'absolute';
      eraserSizeControl.style.top = 'calc(100% + 8px)';
      eraserSizeControl.style.left = '50%';
      eraserSizeControl.style.transform = 'translateX(-50%)';
      eraserSizeControl.style.padding = '8px';
      eraserSizeControl.style.border = '1px solid var(--ate-border, #e2e8f0)';
      eraserSizeControl.style.borderRadius = '8px';
      eraserSizeControl.style.background = 'var(--ate-surface, #ffffff)';
      eraserSizeControl.style.boxShadow =
        'var(--ate-menu-shadow, 0 10px 15px -3px rgba(0, 0, 0, 0.1))';
      eraserSizeControl.style.zIndex = '5';
      eraserSizeControl.style.visibility = 'hidden';
      eraserSizeControl.style.pointerEvents = 'none';
      eraserSizeControl.style.whiteSpace = 'nowrap';

      const eraserSizeLabel = document.createElement('span');
      eraserSizeLabel.textContent = `${currentEraserSize}px`;
      eraserSizeLabel.style.minWidth = '34px';
      eraserSizeLabel.style.textAlign = 'right';

      const eraserSizeInput = document.createElement('input');
      eraserSizeInput.type = 'range';
      eraserSizeInput.min = '6';
      eraserSizeInput.max = '48';
      eraserSizeInput.step = '2';
      eraserSizeInput.value = String(currentEraserSize);
      eraserSizeInput.style.width = '92px';
      eraserSizeInput.style.accentColor = 'var(--ate-primary, #2563eb)';

      const eraserModeRow = document.createElement('div');
      Object.assign(eraserModeRow.style, { display: 'flex', gap: '4px' });
      const makeModeButton = (text: string, title: string) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.title = title;
        Object.assign(button.style, {
          flex: '1',
          border: '1px solid var(--ate-border, #e2e8f0)',
          borderRadius: '6px',
          padding: '4px 8px',
          fontSize: '12px',
          cursor: 'pointer',
          color: 'var(--ate-text, #2d3748)',
          background: 'var(--ate-surface, #ffffff)',
        });
        eraserModeRow.appendChild(button);
        return button;
      };
      const areaModeButton = makeModeButton(
        'Partie',
        'Efface seulement la zone sous la gomme (selon la taille réglée)',
      );
      const strokeModeButton = makeModeButton(
        'Trait entier',
        "Efface le trait, la forme, l'image ou le texte en entier dès qu'on le touche",
      );

      const eraserSizeRow = document.createElement('div');
      Object.assign(eraserSizeRow.style, { display: 'flex', alignItems: 'center', gap: '6px' });
      eraserSizeRow.append(eraserSizeInput, eraserSizeLabel);
      eraserSizeControl.append(eraserModeRow, eraserSizeRow);
      eraserToolWrapper.append(eraserButton, eraserSizeControl);

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '6px';

      const undoButton = document.createElement('button');
      undoButton.type = 'button';
      undoButton.textContent = 'Annuler';
      undoButton.title = 'Supprimer le dernier trait';

      const clearButton = document.createElement('button');
      clearButton.type = 'button';
      clearButton.textContent = 'Effacer';
      clearButton.title = 'Effacer le dessin';

      const redoButton = document.createElement('button');
      redoButton.type = 'button';
      redoButton.textContent = 'Rétablir';
      redoButton.title = 'Rétablir le trait annulé';

      const fingerButton = document.createElement('button');
      fingerButton.type = 'button';
      fingerButton.title = 'Dessiner aussi au doigt (sinon : stylet uniquement)';
      fingerButton.setAttribute('aria-label', 'Dessiner aussi au doigt');
      const fingerIcon = document.createElement('span');
      fingerIcon.className = 'material-symbols-outlined';
      fingerIcon.textContent = 'touch_app';
      fingerIcon.style.fontSize = '18px';
      fingerIcon.style.lineHeight = '1';
      fingerButton.appendChild(fingerIcon);

      [pageStyleButton, eraserButton, undoButton, redoButton, clearButton, fingerButton].forEach(
        (button) => {
          button.style.border = '1px solid var(--ate-border, #e2e8f0)';
          button.style.borderRadius = '6px';
          button.style.background = 'var(--ate-surface, #ffffff)';
          button.style.color = 'var(--ate-text, #2d3748)';
          button.style.padding = '4px 8px';
          button.style.fontSize = '12px';
          button.style.cursor = 'pointer';
        },
      );
      pageStyleButton.style.display = 'inline-flex';
      pageStyleButton.style.alignItems = 'center';
      pageStyleButton.style.justifyContent = 'center';
      pageStyleButton.style.width = '30px';
      pageStyleButton.style.height = '30px';
      pageStyleButton.style.padding = '0';
      fingerButton.style.display = 'inline-flex';
      fingerButton.style.alignItems = 'center';
      fingerButton.style.justifyContent = 'center';
      fingerButton.style.width = '30px';
      fingerButton.style.height = '30px';
      fingerButton.style.padding = '0';
      eraserButton.style.display = 'inline-flex';
      eraserButton.style.alignItems = 'center';
      eraserButton.style.justifyContent = 'center';
      eraserButton.style.width = '30px';
      eraserButton.style.height = '30px';
      eraserButton.style.padding = '0';

      const makeToolButton = (icon: string, title: string) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.title = title;
        button.setAttribute('aria-label', title);
        Object.assign(button.style, {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '30px',
          height: '30px',
          padding: '0',
          border: '1px solid var(--ate-border, #e2e8f0)',
          borderRadius: '6px',
          background: 'var(--ate-surface, #ffffff)',
          color: 'var(--ate-text, #2d3748)',
          cursor: 'pointer',
        });
        const iconEl = document.createElement('span');
        iconEl.className = 'material-symbols-outlined';
        iconEl.textContent = icon;
        iconEl.style.fontSize = '18px';
        iconEl.style.lineHeight = '1';
        button.appendChild(iconEl);
        return { button, iconEl };
      };

      const setActive = (button: HTMLButtonElement, active: boolean, disabled: boolean) => {
        button.disabled = disabled;
        button.style.opacity = disabled ? '0.45' : '1';
        button.style.background = active
          ? 'var(--ate-primary-light, #dbeafe)'
          : 'var(--ate-surface, #ffffff)';
        button.style.borderColor = active
          ? 'var(--ate-primary, #2563eb)'
          : 'var(--ate-border, #e2e8f0)';
      };

      const penTool = makeToolButton('edit', 'Stylo');
      const pipetteTool = makeToolButton(
        'colorize',
        'Pipette : toucher un trait pour reprendre sa couleur',
      );
      const highlighterTool = makeToolButton('ink_highlighter', 'Surligneur');
      const shapeTool = makeToolButton('shapes', 'Formes');
      const textTool = makeToolButton('text_fields', 'Texte (toucher un texte pour le modifier)');
      const laserTool = makeToolButton('ads_click', 'Pointeur laser');
      const rulerTool = makeToolButton('straighten', 'Règle');
      const fullscreenTool = makeToolButton('fullscreen', 'Plein écran');
      const panTool = makeToolButton('pan_tool', 'Main : déplacer le tableau');
      const zoomOutButton = makeToolButton('remove', 'Zoom arrière');
      const zoomInButton = makeToolButton('add', 'Zoom avant');
      const zoomLabel = makeToolButton('', 'Réinitialiser le zoom (100 %)');
      zoomLabel.iconEl.className = '';
      zoomLabel.iconEl.style.fontSize = '11px';
      zoomLabel.button.style.width = '46px';
      const fitButton = makeToolButton('center_focus_strong', 'Recentrer sur le contenu');
      const newPageButton = makeToolButton('note_add', 'Ajouter une page à la suite');
      const imageTool = makeToolButton('image', 'Insérer une image');
      const imageInput = document.createElement('input');
      imageInput.type = 'file';
      imageInput.accept = 'image/*';
      imageInput.style.display = 'none';
      const lassoTool = makeToolButton(
        'lasso_select',
        'Lasso : sélectionner, déplacer, redimensionner',
      );
      const deleteSelectionButton = makeToolButton('delete', 'Supprimer la sélection');
      const duplicateSelectionButton = makeToolButton('content_copy', 'Dupliquer la sélection');
      const convertSelectionButton = makeToolButton(
        'auto_fix_high',
        'Convertir les tracés en formes propres',
      );
      const frontButton = makeToolButton('flip_to_front', 'Mettre la sélection au premier plan');
      const backButton = makeToolButton('flip_to_back', "Mettre la sélection à l'arrière-plan");
      const dashButton = makeToolButton(
        'line_style',
        'Style de trait des formes : continu, tirets ou pointillés',
      );
      const copyButton = makeToolButton(
        'file_copy',
        'Copier la sélection (collable dans un autre dessin)',
      );
      const cutButton = makeToolButton('content_cut', 'Couper la sélection');
      const pasteButton = makeToolButton('content_paste', 'Coller');
      const exportButton = makeToolButton('download', 'Exporter le dessin en image PNG');
      const lockRatioButton = makeToolButton('aspect_ratio', 'Conserver les proportions');
      const fillSelectionButton = makeToolButton(
        'format_color_fill',
        'Appliquer le remplissage (réglé dans le menu Formes) aux formes sélectionnées',
      );
      const colorSelectionButton = makeToolButton(
        'palette',
        'Appliquer la couleur active à la sélection',
      );

      const shapeToolWrapper = document.createElement('div');
      shapeToolWrapper.style.position = 'relative';
      shapeToolWrapper.style.display = 'inline-flex';

      const shapeMenu = document.createElement('div');
      Object.assign(shapeMenu.style, {
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '4px',
        padding: '6px',
        border: '1px solid var(--ate-border, #e2e8f0)',
        borderRadius: '8px',
        background: 'var(--ate-surface, #ffffff)',
        boxShadow: 'var(--ate-menu-shadow, 0 10px 15px -3px rgba(0, 0, 0, 0.1))',
        zIndex: '7',
        visibility: 'hidden',
        pointerEvents: 'none',
      });
      const shapeButtons = SHAPE_OPTIONS.map((option) => {
        const tool = makeToolButton(option.icon, option.label);
        shapeMenu.appendChild(tool.button);
        return { ...tool, option };
      });
      const smallButtonStyle = {
        border: '1px solid var(--ate-border, #e2e8f0)',
        borderRadius: '6px',
        padding: '4px 8px',
        fontSize: '12px',
        cursor: 'pointer',
        color: 'var(--ate-text, #2d3748)',
        background: 'var(--ate-surface, #ffffff)',
      };
      const fillSection = document.createElement('div');
      Object.assign(fillSection.style, {
        gridColumn: '1 / -1',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        marginTop: '4px',
        paddingTop: '6px',
        borderTop: '1px solid var(--ate-border, #e2e8f0)',
        fontSize: '12px',
        color: 'var(--ate-text-secondary, #64748b)',
      });
      const fillTitle = document.createElement('span');
      fillTitle.textContent = 'Remplissage';
      const fillChoices = document.createElement('div');
      Object.assign(fillChoices.style, { display: 'flex', gap: '4px', alignItems: 'center' });
      const noFillButton = document.createElement('button');
      noFillButton.type = 'button';
      noFillButton.textContent = 'Aucun';
      const autoFillButton = document.createElement('button');
      autoFillButton.type = 'button';
      autoFillButton.textContent = 'Trait';
      autoFillButton.title = 'Remplir avec la couleur du trait';
      Object.assign(noFillButton.style, smallButtonStyle);
      Object.assign(autoFillButton.style, smallButtonStyle);
      const fillColorInput = document.createElement('input');
      fillColorInput.type = 'color';
      fillColorInput.value = shapeFillColor;
      fillColorInput.title = 'Couleur de remplissage';
      Object.assign(fillColorInput.style, {
        width: '32px',
        height: '28px',
        padding: '0',
        border: '1px solid var(--ate-border, #e2e8f0)',
        borderRadius: '6px',
        background: 'transparent',
        cursor: 'pointer',
      });
      fillChoices.append(noFillButton, autoFillButton, fillColorInput);
      const alphaRow = document.createElement('label');
      Object.assign(alphaRow.style, { display: 'flex', alignItems: 'center', gap: '6px' });
      const alphaInput = document.createElement('input');
      alphaInput.type = 'range';
      alphaInput.min = '5';
      alphaInput.max = '100';
      alphaInput.step = '5';
      alphaInput.value = String(Math.round(shapeFillAlpha * 100));
      alphaInput.title = 'Opacité du remplissage';
      alphaInput.style.flex = '1';
      alphaInput.style.accentColor = 'var(--ate-primary, #2563eb)';
      const alphaLabel = document.createElement('span');
      alphaLabel.style.minWidth = '34px';
      alphaLabel.style.textAlign = 'right';
      alphaLabel.textContent = `${Math.round(shapeFillAlpha * 100)}%`;
      alphaRow.append(alphaInput, alphaLabel);
      const gapRow = document.createElement('label');
      Object.assign(gapRow.style, { display: 'flex', alignItems: 'center', gap: '6px' });
      const gapInput = document.createElement('input');
      gapInput.type = 'range';
      gapInput.min = '4';
      gapInput.max = '24';
      gapInput.step = '1';
      gapInput.value = String(shapeFillGap);
      gapInput.title = 'Espacement des hachures';
      gapInput.style.flex = '1';
      gapInput.style.accentColor = 'var(--ate-primary, #2563eb)';
      const gapLabel = document.createElement('span');
      gapLabel.style.minWidth = '34px';
      gapLabel.style.textAlign = 'right';
      gapLabel.textContent = `${shapeFillGap}px`;
      gapRow.append(gapInput, gapLabel);
      fillSection.append(fillTitle, fillChoices, alphaRow, gapRow);
      const fillSwatches = document.createElement('div');
      Object.assign(fillSwatches.style, { display: 'flex', flexWrap: 'wrap', gap: '4px' });
      const swatchButtons = this.options.colors.map((swatchColor) => {
        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.title = `Remplir avec ${swatchColor}`;
        swatch.setAttribute('aria-label', `Remplir avec ${swatchColor}`);
        Object.assign(swatch.style, {
          width: '22px',
          height: '22px',
          padding: '0',
          borderRadius: '999px',
          border: '1px solid var(--ate-border, #e2e8f0)',
          background: swatchColor,
          cursor: 'pointer',
        });
        fillSwatches.appendChild(swatch);
        return { swatch, color: swatchColor };
      });
      fillSection.insertBefore(fillSwatches, fillSection.children[2]);

      const patternRow = document.createElement('div');
      Object.assign(patternRow.style, { display: 'flex', flexWrap: 'wrap', gap: '4px' });
      const patternButtons = FILL_PATTERNS.map((pattern) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = pattern.label;
        button.title = `Motif : ${pattern.label}`;
        Object.assign(button.style, smallButtonStyle);
        button.style.padding = '3px 6px';
        patternRow.appendChild(button);
        return { button, pattern: pattern.value };
      });
      fillSection.insertBefore(patternRow, fillSection.children[3]);

      const fillMenu = document.createElement('div');
      Object.assign(fillMenu.style, {
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '220px',
        padding: '8px',
        border: '1px solid var(--ate-border, #e2e8f0)',
        borderRadius: '8px',
        background: 'var(--ate-surface, #ffffff)',
        boxShadow: 'var(--ate-menu-shadow, 0 10px 15px -3px rgba(0, 0, 0, 0.1))',
        zIndex: '7',
        visibility: 'hidden',
        pointerEvents: 'none',
      });
      fillSection.style.marginTop = '0';
      fillSection.style.paddingTop = '0';
      fillSection.style.borderTop = 'none';
      fillMenu.appendChild(fillSection);
      shapeMenu.style.minWidth = '200px';
      shapeToolWrapper.append(shapeTool.button, shapeMenu);

      const fillTool = makeToolButton('format_color_fill', 'Remplissage des formes');
      const fillToolWrapper = document.createElement('div');
      fillToolWrapper.style.position = 'relative';
      fillToolWrapper.style.display = 'inline-flex';
      fillToolWrapper.append(fillTool.button, fillMenu);

      const sizeButtons = PEN_SIZES.map((size) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.title = `Épaisseur : ${size.label}`;
        button.setAttribute('aria-label', `Épaisseur : ${size.label}`);
        Object.assign(button.style, {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '26px',
          height: '30px',
          padding: '0',
          border: '1px solid var(--ate-border, #e2e8f0)',
          borderRadius: '6px',
          background: 'var(--ate-surface, #ffffff)',
          cursor: 'pointer',
        });
        const dot = document.createElement('span');
        dot.style.width = `${size.dot}px`;
        dot.style.height = `${size.dot}px`;
        dot.style.borderRadius = '999px';
        dot.style.background = 'var(--ate-text, #2d3748)';
        button.appendChild(dot);
        return button;
      });

      const selectionActions = document.createElement('div');
      selectionActions.style.display = 'none';
      selectionActions.style.gap = '6px';
      selectionActions.append(
        lockRatioButton.button,
        copyButton.button,
        cutButton.button,
        frontButton.button,
        backButton.button,
        convertSelectionButton.button,
        fillSelectionButton.button,
        colorSelectionButton.button,
        deleteSelectionButton.button,
        duplicateSelectionButton.button,
      );
      actions.prepend(selectionActions);
      actions.append(
        pasteButton.button,
        dashButton.button,
        exportButton.button,
        newPageButton.button,
      );

      const setShapeMenuOpen = (open: boolean) => {
        isShapeMenuOpen = open;
        shapeMenu.style.visibility = open ? 'visible' : 'hidden';
        shapeMenu.style.pointerEvents = open ? 'auto' : 'none';
        if (open && isFillMenuOpen) {
          setFillMenuOpen(false);
        }
      };

      const setFillMenuOpen = (open: boolean) => {
        isFillMenuOpen = open;
        fillMenu.style.visibility = open ? 'visible' : 'hidden';
        fillMenu.style.pointerEvents = open ? 'auto' : 'none';
        if (open && isShapeMenuOpen) {
          setShapeMenuOpen(false);
        }
      };

      // Les réglages de remplissage s'appliquent en direct aux formes sélectionnées.
      const scheduleSelectionFill = () => {
        if (!selection.some((index) => strokes[index]?.tool === 'shape')) {
          return;
        }
        if (fillTimer !== null) {
          clearTimeout(fillTimer);
        }
        fillTimer = setTimeout(() => {
          fillTimer = null;
          applyFillToSelection();
        }, 250);
      };

      const updateToolButtons = () => {
        const disabled = !editor.isEditable;
        setActive(penTool.button, currentTool === 'pen', disabled);
        penTool.iconEl.textContent = PEN_KINDS[penIndex].icon;
        penTool.button.title = `${PEN_KINDS[penIndex].label} (toucher à nouveau pour changer de stylo)`;
        setActive(pipetteTool.button, currentTool === 'pipette', disabled);
        setActive(highlighterTool.button, currentTool === 'highlighter', disabled);
        setActive(shapeTool.button, currentTool === 'shape', disabled);
        setActive(lassoTool.button, currentTool === 'lasso', disabled);
        setActive(lockRatioButton.button, lockRatio, disabled);
        setActive(textTool.button, currentTool === 'text', disabled);
        setActive(laserTool.button, currentTool === 'laser', disabled);
        setActive(rulerTool.button, ruler.active, disabled);
        setActive(panTool.button, currentTool === 'pan', false);
        setActive(newPageButton.button, false, disabled);
        setActive(dashButton.button, currentDash !== 'solid', disabled);
        dashButton.iconEl.textContent =
          currentDash === 'dotted'
            ? 'more_horiz'
            : currentDash === 'dashed'
              ? 'line_style'
              : 'horizontal_rule';
        setActive(imageTool.button, false, disabled);
        setActive(areaModeButton, eraserMode === 'area', disabled);
        setActive(strokeModeButton, eraserMode === 'stroke', disabled);
        eraserIcon.textContent = eraserMode === 'stroke' ? 'backspace' : 'ink_eraser';
        eraserButton.title =
          eraserMode === 'stroke'
            ? 'Gomme : trait entier (toucher à nouveau pour les réglages)'
            : 'Gomme : partie (toucher à nouveau pour les réglages)';
        const fillPreview =
          shapeFill === null ? null : shapeFill === 'auto' ? currentColor : shapeFill;
        setActive(fillTool.button, isFillMenuOpen, disabled);
        fillTool.button.style.boxShadow = fillPreview ? `inset 0 -4px 0 ${fillPreview}` : 'none';
        swatchButtons.forEach(({ swatch, color: swatchColor }) => {
          swatch.style.boxShadow =
            shapeFill === swatchColor ? '0 0 0 2px var(--ate-primary, #2563eb)' : 'none';
        });
        patternButtons.forEach(({ button, pattern }) =>
          setActive(button, shapeFillPattern === pattern, disabled),
        );
        setActive(noFillButton, shapeFill === null, disabled);
        setActive(autoFillButton, shapeFill === 'auto', disabled);
        fillColorInput.style.borderColor =
          shapeFill !== null && shapeFill !== 'auto'
            ? 'var(--ate-primary, #2563eb)'
            : 'var(--ate-border, #e2e8f0)';
        fillColorInput.style.outline =
          shapeFill !== null && shapeFill !== 'auto'
            ? '2px solid var(--ate-primary, #2563eb)'
            : 'none';
        shapeTool.iconEl.textContent =
          SHAPE_OPTIONS.find((option) => option.value === currentShape)?.icon ?? 'shapes';
        shapeButtons.forEach(({ button, option }) =>
          setActive(button, option.value === currentShape, disabled),
        );
        sizeButtons.forEach((button, index) =>
          setActive(button, index === currentSizeIndex, disabled),
        );
      };

      const selectTool = (tool: DrawingTool) => {
        currentTool = tool;
        lastDrawTool = tool;
        if (tool !== 'lasso') {
          selection = [];
        }
        renderOverlay();
        setPageStyleMenuOpen(false);
        setEraserSizePopupOpen(false);
      };

      controls.append(
        palette,
        penTool.button,
        highlighterTool.button,
        pipetteTool.button,
        shapeToolWrapper,
        fillToolWrapper,
        lassoTool.button,
        textTool.button,
        laserTool.button,
        rulerTool.button,
        ...(board
          ? [
              panTool.button,
              zoomOutButton.button,
              zoomLabel.button,
              zoomInButton.button,
              fitButton.button,
            ]
          : []),
        fullscreenTool.button,
        imageTool.button,
        ...sizeButtons,
        pageStyleWrapper,
        eraserToolWrapper,
        fingerButton,
      );
      actions.append(undoButton, redoButton, clearButton);
      toolbar.append(label, controls, actions);

      const canvasArea = document.createElement('div');
      canvasArea.style.position = 'relative';
      canvasArea.style.overflow = 'hidden';

      const canvas = document.createElement('canvas');
      canvas.width = logicalWidth;
      canvas.height = logicalHeight;
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      canvas.style.touchAction = board ? 'none' : 'pan-y pinch-zoom';
      canvas.style.userSelect = 'none';
      canvas.style.setProperty('-webkit-user-select', 'none');
      canvas.style.setProperty('-webkit-touch-callout', 'none');
      canvas.style.cursor = editor.isEditable ? 'crosshair' : 'default';

      const eraserCursor = document.createElement('div');
      eraserCursor.setAttribute('aria-hidden', 'true');
      eraserCursor.style.position = 'absolute';
      eraserCursor.style.left = '0';
      eraserCursor.style.top = '0';
      eraserCursor.style.width = `${currentEraserSize}px`;
      eraserCursor.style.height = `${currentEraserSize}px`;
      eraserCursor.style.border = '1px solid var(--ate-primary, #2563eb)';
      eraserCursor.style.borderRadius = '999px';
      eraserCursor.style.background =
        'color-mix(in srgb, var(--ate-primary, #2563eb), transparent 88%)';
      eraserCursor.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.85)';
      eraserCursor.style.pointerEvents = 'none';
      eraserCursor.style.opacity = '0';
      eraserCursor.style.transform = 'translate(-50%, -50%)';
      eraserCursor.style.zIndex = '2';

      // Calque de prévisualisation (surligneur, formes) : repeint à chaque mouvement.
      const overlay = document.createElement('canvas');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.position = 'absolute';
      overlay.style.inset = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.pointerEvents = 'none';
      const overlayContext = overlay.getContext('2d');

      canvasArea.append(canvas, overlay, eraserCursor);

      const resizeHandle = document.createElement('div');
      resizeHandle.title = 'Agrandir ou réduire la zone de dessin';
      resizeHandle.setAttribute('aria-label', 'Agrandir ou réduire la zone de dessin');
      resizeHandle.style.display = 'flex';
      resizeHandle.style.alignItems = 'center';
      resizeHandle.style.justifyContent = 'center';
      resizeHandle.style.height = '18px';
      resizeHandle.style.borderTop = '1px solid var(--ate-border, #e2e8f0)';
      resizeHandle.style.borderBottomLeftRadius = '8px';
      resizeHandle.style.borderBottomRightRadius = '8px';
      resizeHandle.style.background = 'var(--ate-surface-secondary, #f8f9fa)';
      resizeHandle.style.color = 'var(--ate-text-secondary, #64748b)';
      resizeHandle.style.cursor = 'ns-resize';
      resizeHandle.style.userSelect = 'none';
      resizeHandle.style.touchAction = 'none';

      const resizeIcon = document.createElement('span');
      resizeIcon.className = 'material-symbols-outlined';
      resizeIcon.textContent = 'drag_handle';
      resizeIcon.style.fontSize = '18px';
      resizeIcon.style.lineHeight = '1';
      resizeHandle.appendChild(resizeIcon);

      wrapper.append(toolbar, canvasArea, resizeHandle, imageInput);

      if (board) {
        resizeHandle.style.display = 'none';
        newPageButton.button.style.display = 'none';
        pageStyleButtons.forEach(({ button, option }) => {
          if (!['blank', 'dots', 'smallGrid', 'largeGrid'].includes(option.value)) {
            button.style.display = 'none';
          }
        });
      }

      const context = canvas.getContext('2d');

      const setEraserSizePopupOpen = (open: boolean) => {
        isEraserSizePopupOpen = open;
        eraserSizeControl.style.visibility = open ? 'visible' : 'hidden';
        eraserSizeControl.style.pointerEvents = open ? 'auto' : 'none';
      };

      const setPageStyleMenuOpen = (open: boolean) => {
        isPageStyleMenuOpen = open;
        pageStyleMenu.style.visibility = open ? 'visible' : 'hidden';
        pageStyleMenu.style.pointerEvents = open ? 'auto' : 'none';
      };

      // Résolution réelle du canvas = taille affichée × devicePixelRatio (rendu net sur iPad).
      const clampZoom = (zoom: number) => Math.min(4, Math.max(0.1, zoom));

      const pxPerUnit = () =>
        board ? view.zoom : canvas.getBoundingClientRect().width / logicalWidth;

      const setWorldTransform = (ctx: CanvasRenderingContext2D) => {
        ctx.setTransform(
          scale,
          0,
          0,
          scale,
          board ? -view.x * scale : 0,
          board ? -view.y * scale : 0,
        );
      };

      const layoutBoard = () => {
        if (!board) {
          return;
        }
        const height = isFullscreen
          ? Math.max(240, window.innerHeight - toolbar.offsetHeight)
          : Math.max(360, Math.min(Math.round(window.innerHeight * 0.75), 760));
        canvasArea.style.height = `${height}px`;
      };

      // Résolution réelle du canvas = taille affichée × devicePixelRatio (rendu net sur iPad).
      const fitCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        let backingWidth: number;
        let backingHeight: number;
        if (board) {
          const rect = canvasArea.getBoundingClientRect();
          backingWidth = Math.max(1, Math.round((rect.width || 600) * dpr));
          backingHeight = Math.max(1, Math.round((rect.height || 400) * dpr));
          scale = dpr * view.zoom;
          canvas.style.height = '100%';
          canvas.style.aspectRatio = 'auto';
        } else {
          const cssWidth = canvasArea.getBoundingClientRect().width || logicalWidth;
          backingWidth = Math.max(1, Math.round(cssWidth * dpr));
          backingHeight = Math.max(1, Math.round((backingWidth * logicalHeight) / logicalWidth));
          scale = backingWidth / logicalWidth;
          canvas.style.aspectRatio = `${logicalWidth} / ${logicalHeight}`;
        }
        if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
          canvas.width = backingWidth;
          canvas.height = backingHeight;
        }
        if (overlay.width !== backingWidth || overlay.height !== backingHeight) {
          overlay.width = backingWidth;
          overlay.height = backingHeight;
        }
      };

      const resizeCanvasHeight = (height: number) => {
        const minHeight = 180;
        const maxHeight = 4000;
        logicalHeight = Math.min(maxHeight, Math.max(minHeight, Math.round(height)));
        redraw();
      };

      const applyBoardBackground = () => {
        const zoom = view.zoom;
        const style = (['dots', 'smallGrid', 'largeGrid'] as string[]).includes(currentPageStyle)
          ? currentPageStyle
          : 'blank';
        const cell = style === 'dots' ? 24 : style === 'smallGrid' ? 18 : 36;
        canvasArea.style.backgroundColor = '#ffffff';
        canvasArea.style.backgroundPosition = `${-view.x * zoom}px ${-view.y * zoom}px`;
        if (style === 'blank' || cell * zoom < 6) {
          canvasArea.style.backgroundImage = 'none';
          return;
        }
        canvasArea.style.backgroundSize = `${cell * zoom}px ${cell * zoom}px`;
        canvasArea.style.backgroundImage =
          style === 'dots'
            ? `radial-gradient(circle, rgba(100, 116, 139, 0.5) ${Math.max(0.8, 1.2 * zoom)}px, transparent ${Math.max(1.2, 1.7 * zoom)}px)`
            : 'linear-gradient(to right, rgba(37, 99, 235, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(37, 99, 235, 0.2) 1px, transparent 1px)';
      };

      const applyPageStyle = () => {
        if (board) {
          applyBoardBackground();
          return;
        }
        canvasArea.style.backgroundColor = '#ffffff';
        canvasArea.style.backgroundImage = 'none';
        canvasArea.style.backgroundSize = 'auto';
        canvasArea.style.backgroundPosition = '0 0';

        switch (currentPageStyle) {
          case 'seyes':
            canvasArea.style.backgroundColor = '#fffdf8';
            canvasArea.style.backgroundImage = [
              'linear-gradient(to bottom, rgba(37, 99, 235, 0.18) 1px, transparent 1px)',
              'linear-gradient(to bottom, rgba(37, 99, 235, 0.42) 1px, transparent 1px)',
            ].join(', ');
            canvasArea.style.backgroundSize = '18px 18px, 72px 72px';
            canvasArea.style.backgroundPosition = '0 0, 0 0';
            break;
          case 'seyesMargin':
            canvasArea.style.backgroundColor = '#fffdf8';
            canvasArea.style.backgroundImage = [
              'linear-gradient(to right, transparent 53px, rgba(239, 68, 68, 0.42) 54px, transparent 55px)',
              'linear-gradient(to bottom, rgba(37, 99, 235, 0.18) 1px, transparent 1px)',
              'linear-gradient(to bottom, rgba(37, 99, 235, 0.42) 1px, transparent 1px)',
            ].join(', ');
            canvasArea.style.backgroundSize = '100% 100%, 18px 18px, 72px 72px';
            canvasArea.style.backgroundPosition = '0 0, 0 0, 0 0';
            break;
          case 'smallGrid':
            canvasArea.style.backgroundColor = '#ffffff';
            canvasArea.style.backgroundImage =
              'linear-gradient(to right, rgba(37, 99, 235, 0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(37, 99, 235, 0.18) 1px, transparent 1px)';
            canvasArea.style.backgroundSize = '18px 18px';
            break;
          case 'largeGrid':
            canvasArea.style.backgroundColor = '#ffffff';
            canvasArea.style.backgroundImage =
              'linear-gradient(to right, rgba(37, 99, 235, 0.24) 1px, transparent 1px), linear-gradient(to bottom, rgba(37, 99, 235, 0.24) 1px, transparent 1px)';
            canvasArea.style.backgroundSize = '36px 36px';
            break;
          case 'ruled':
            canvasArea.style.backgroundColor = '#fffdf8';
            canvasArea.style.backgroundImage =
              'linear-gradient(to bottom, transparent 31px, rgba(37, 99, 235, 0.36) 32px)';
            canvasArea.style.backgroundSize = '100% 32px';
            break;
          case 'largeRuled':
            canvasArea.style.backgroundColor = '#fffdf8';
            canvasArea.style.backgroundImage =
              'linear-gradient(to bottom, transparent 47px, rgba(37, 99, 235, 0.38) 48px)';
            canvasArea.style.backgroundSize = '100% 48px';
            break;
          case 'dots':
            canvasArea.style.backgroundColor = '#ffffff';
            canvasArea.style.backgroundImage =
              'radial-gradient(circle, rgba(100, 116, 139, 0.5) 1.2px, transparent 1.7px)';
            canvasArea.style.backgroundSize = '24px 24px';
            break;
          case 'blank':
          default:
            break;
        }
      };

      const updateEraserCursor = (event: PointerEvent | null = lastPointerEvent) => {
        if (
          !event ||
          !editor.isEditable ||
          (currentTool !== 'eraser' && currentTool !== 'strokeEraser') ||
          event.pointerType === 'touch'
        ) {
          eraserCursor.style.opacity = '0';
          return;
        }

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const isInside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;

        if (!isInside) {
          eraserCursor.style.opacity = '0';
          return;
        }

        const displaySize = currentEraserSize * pxPerUnit();
        eraserCursor.style.width = `${displaySize}px`;
        eraserCursor.style.height = `${displaySize}px`;
        eraserCursor.style.opacity = '1';
        eraserCursor.style.left = `${x}px`;
        eraserCursor.style.top = `${y}px`;
      };

      const updateToolbarState = () => {
        const disabled = !editor.isEditable;
        updateToolButtons();
        selectionActions.style.display = selection.length > 0 ? 'flex' : 'none';
        pageStyleButton.disabled = disabled;
        eraserButton.disabled = disabled;
        eraserSizeInput.disabled = disabled;
        undoButton.disabled = disabled || history.length === 0;
        redoButton.disabled = disabled || future.length === 0;
        redoButton.style.opacity = redoButton.disabled ? '0.45' : '1';
        fingerButton.disabled = disabled;
        fingerButton.style.opacity = disabled ? '0.45' : '1';
        fingerButton.style.background = allowFinger
          ? 'var(--ate-primary-light, #dbeafe)'
          : 'var(--ate-surface, #ffffff)';
        fingerButton.style.borderColor = allowFinger
          ? 'var(--ate-primary, #2563eb)'
          : 'var(--ate-border, #e2e8f0)';
        canvas.style.touchAction = board || allowFinger ? 'none' : 'pan-y pinch-zoom';
        clearButton.disabled = disabled || strokes.length === 0;
        pageStyleButton.style.opacity = pageStyleButton.disabled ? '0.45' : '1';
        eraserButton.style.opacity = eraserButton.disabled ? '0.45' : '1';
        eraserSizeControl.style.opacity = eraserSizeInput.disabled ? '0.45' : '1';
        undoButton.style.opacity = undoButton.disabled ? '0.45' : '1';
        clearButton.style.opacity = clearButton.disabled ? '0.45' : '1';
        eraserButton.style.background =
          currentTool === 'eraser'
            ? 'var(--ate-primary-light, #dbeafe)'
            : 'var(--ate-surface, #ffffff)';
        eraserButton.style.borderColor =
          currentTool === 'eraser' ? 'var(--ate-primary, #2563eb)' : 'var(--ate-border, #e2e8f0)';
        currentColorPreview.style.background = currentColor;
        pageStyleIcon.textContent =
          PAGE_STYLE_OPTIONS.find((option) => option.value === currentPageStyle)?.icon ?? 'article';
        pageStyleButton.style.background = isPageStyleMenuOpen
          ? 'var(--ate-primary-light, #dbeafe)'
          : 'var(--ate-surface, #ffffff)';
        pageStyleButton.style.borderColor = isPageStyleMenuOpen
          ? 'var(--ate-primary, #2563eb)'
          : 'var(--ate-border, #e2e8f0)';
        pageStyleButtons.forEach(({ button, option }) => {
          const isSelected = option.value === currentPageStyle;
          button.disabled = disabled;
          button.style.opacity = disabled ? '0.45' : '1';
          button.style.background = isSelected
            ? 'var(--ate-primary-light, #dbeafe)'
            : 'var(--ate-surface, #ffffff)';
          button.style.borderColor = isSelected
            ? 'var(--ate-primary, #2563eb)'
            : 'var(--ate-border, #e2e8f0)';
        });
        colorButtons.forEach(({ button, color: paletteColor }) => {
          button.style.boxShadow =
            currentTool !== 'eraser' && paletteColor === currentColor
              ? '0 0 0 2px var(--ate-primary, #2563eb)'
              : 'none';
          button.style.opacity = disabled ? '0.45' : '1';
          button.disabled = disabled;
        });
        colorPicker.disabled = disabled;
        colorPickerLabel.style.opacity = disabled ? '0.45' : '1';
        canvas.style.cursor = editor.isEditable
          ? currentTool === 'eraser' || currentTool === 'strokeEraser'
            ? 'none'
            : 'crosshair'
          : 'default';
        updateEraserCursor();
      };

      const strokeWidth = (stroke: DrawingStroke, pressure?: number) => {
        if (stroke.tool === 'eraser') {
          return stroke.size;
        }
        const p = pressure ?? 0.5;
        if (stroke.pen === 'ballpoint') {
          return stroke.size;
        }
        if (stroke.pen === 'fountain') {
          return stroke.size * (0.15 + p * 2.1);
        }
        if (stroke.pen === 'pencil') {
          return stroke.size * 0.7 * (0.6 + p * 0.8);
        }
        return stroke.size * (0.35 + p * 1.3);
      };

      const isIncremental = (stroke: DrawingStroke) =>
        stroke.tool === undefined || stroke.tool === 'pen' || stroke.tool === 'eraser';

      const traceShape = (
        ctx: CanvasRenderingContext2D,
        kind: ShapeKind,
        a: DrawingPoint,
        b: DrawingPoint,
        size: number,
      ) => {
        const w = b.x - a.x;
        const h = b.y - a.y;
        ctx.beginPath();
        switch (kind) {
          case 'arrow': {
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            const angle = Math.atan2(h, w);
            const head = Math.min(28, Math.max(10, size * 4, Math.hypot(w, h) * 0.2));
            for (const delta of [-Math.PI / 7, Math.PI / 7]) {
              ctx.moveTo(b.x, b.y);
              ctx.lineTo(
                b.x - head * Math.cos(angle + delta),
                b.y - head * Math.sin(angle + delta),
              );
            }
            break;
          }
          case 'rect':
            ctx.rect(a.x, a.y, w, h);
            break;
          case 'ellipse':
            ctx.ellipse(
              a.x + w / 2,
              a.y + h / 2,
              Math.abs(w / 2),
              Math.abs(h / 2),
              0,
              0,
              Math.PI * 2,
            );
            break;
          case 'triangle':
            ctx.moveTo(a.x + w / 2, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.lineTo(a.x, b.y);
            ctx.closePath();
            break;
          case 'diamond':
            ctx.moveTo(a.x + w / 2, a.y);
            ctx.lineTo(b.x, a.y + h / 2);
            ctx.lineTo(a.x + w / 2, b.y);
            ctx.lineTo(a.x, a.y + h / 2);
            ctx.closePath();
            break;
          case 'line':
          default:
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            break;
        }
      };

      /**
       * Peint un trait. Pour le stylo / la gomme, les segments `from..to` sont
       * des courbes quadratiques de mid(i-1, i) à mid(i, i+1) (point i en
       * contrôle) : tracé lissé et rendu incrémental. Surligneur et formes sont
       * peints d'un seul chemin pour éviter l'accumulation de transparence.
       */
      const imageCache = new Map<string, HTMLImageElement>();
      const getImage = (src: string) => {
        let img = imageCache.get(src);
        if (!img) {
          img = new Image();
          img.onload = () => redraw();
          img.src = src;
          imageCache.set(src, img);
        }
        return img.complete && img.naturalWidth > 0 ? img : null;
      };

      const drawStroke = (
        stroke: DrawingStroke,
        from = 0,
        to = stroke.points.length - 1,
        ctx: CanvasRenderingContext2D | null = context,
      ) => {
        const pts = stroke.points;
        if (!ctx || pts.length === 0) {
          return;
        }

        ctx.save();
        setWorldTransform(ctx);
        ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.fillStyle = stroke.color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.tool === 'text') {
          if (pts.length >= 2 && stroke.src) {
            ctx.font = `${stroke.size}px ${TEXT_FONT}`;
            ctx.textBaseline = 'top';
            const left = Math.min(pts[0].x, pts[1].x);
            const top = Math.min(pts[0].y, pts[1].y);
            stroke.src.split('\n').forEach((line, index) => {
              ctx.fillText(line, left, top + index * stroke.size * TEXT_LINE_HEIGHT);
            });
          }
          ctx.restore();
          return;
        }

        if (stroke.tool === 'image') {
          const img = stroke.src ? getImage(stroke.src) : null;
          if (img && pts.length >= 2) {
            ctx.drawImage(
              img,
              Math.min(pts[0].x, pts[1].x),
              Math.min(pts[0].y, pts[1].y),
              Math.abs(pts[1].x - pts[0].x),
              Math.abs(pts[1].y - pts[0].y),
            );
          }
          ctx.restore();
          return;
        }

        if (stroke.tool === 'shape') {
          if (pts.length >= 2) {
            ctx.lineWidth = stroke.size;
            const tracePath = () => {
              if (stroke.shape === 'polygon') {
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                pts.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
                ctx.closePath();
              } else {
                traceShape(ctx, stroke.shape ?? 'line', pts[0], pts[1], stroke.size);
              }
            };
            tracePath();
            const fillColor =
              typeof stroke.fill === 'string' ? stroke.fill : stroke.fill ? stroke.color : null;
            if (fillColor && stroke.shape !== 'line' && stroke.shape !== 'arrow') {
              ctx.globalAlpha = stroke.fillAlpha ?? 0.25;
              ctx.fillStyle = fillColor;
              if (!stroke.fillPattern || stroke.fillPattern === 'solid') {
                ctx.fill();
              } else {
                const xs = pts.map((point) => point.x);
                const ys = pts.map((point) => point.y);
                ctx.save();
                ctx.clip();
                ctx.strokeStyle = fillColor;
                ctx.lineWidth = 1.4;
                ctx.lineCap = 'butt';
                paintPattern(
                  ctx,
                  stroke.fillPattern,
                  {
                    x0: Math.min(...xs),
                    y0: Math.min(...ys),
                    x1: Math.max(...xs),
                    y1: Math.max(...ys),
                  },
                  stroke.fillGap ?? 8,
                );
                ctx.restore();
                // La trame a remplacé le chemin courant : on retrace le contour avant de le peindre.
                tracePath();
              }
              ctx.globalAlpha = 1;
            }
            if (stroke.dash === 'dashed') {
              ctx.setLineDash([stroke.size * 3, stroke.size * 2]);
            } else if (stroke.dash === 'dotted') {
              ctx.setLineDash([0.1, stroke.size * 2]);
            }
            ctx.stroke();
          }
          ctx.restore();
          return;
        }

        if (stroke.tool === 'highlighter') {
          ctx.globalAlpha = HIGHLIGHTER_ALPHA;
          ctx.lineWidth = stroke.size;
          ctx.beginPath();
          if (pts.length === 1) {
            ctx.arc(pts[0].x, pts[0].y, stroke.size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length - 1; i++) {
              ctx.quadraticCurveTo(
                pts[i].x,
                pts[i].y,
                (pts[i].x + pts[i + 1].x) / 2,
                (pts[i].y + pts[i + 1].y) / 2,
              );
            }
            ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
            ctx.stroke();
          }
          ctx.restore();
          return;
        }

        if (stroke.pen === 'pencil') {
          ctx.globalAlpha = 0.7;
          ctx.lineCap = 'butt';
        }

        if (pts.length === 1) {
          ctx.beginPath();
          ctx.arc(pts[0].x, pts[0].y, strokeWidth(stroke, pts[0].p) / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          return;
        }

        const last = pts.length - 1;
        for (let i = Math.max(0, from); i <= Math.min(to, last); i++) {
          const current = pts[i];
          const startX = i === 0 ? current.x : (pts[i - 1].x + current.x) / 2;
          const startY = i === 0 ? current.y : (pts[i - 1].y + current.y) / 2;
          const endX = i === last ? current.x : (current.x + pts[i + 1].x) / 2;
          const endY = i === last ? current.y : (current.y + pts[i + 1].y) / 2;
          ctx.lineWidth = strokeWidth(stroke, current.p);
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.quadraticCurveTo(current.x, current.y, endX, endY);
          ctx.stroke();
        }
        ctx.restore();
      };

      const clearOverlay = () => {
        if (!overlayContext) {
          return;
        }
        overlayContext.setTransform(1, 0, 0, 1, 0, 0);
        overlayContext.clearRect(0, 0, overlay.width, overlay.height);
      };

      const rulerToLocal = (p: DrawingPoint) => {
        const c = Math.cos(ruler.angle);
        const s = Math.sin(ruler.angle);
        const dx = p.x - ruler.cx;
        const dy = p.y - ruler.cy;
        return { lx: dx * c + dy * s, ly: -dx * s + dy * c };
      };

      const rulerFromLocal = (lx: number, ly: number): DrawingPoint => {
        const c = Math.cos(ruler.angle);
        const s = Math.sin(ruler.angle);
        return {
          x: Math.round((ruler.cx + lx * c - ly * s) * 10) / 10,
          y: Math.round((ruler.cy + lx * s + ly * c) * 10) / 10,
        };
      };

      const rulerHit = (p: DrawingPoint): 'rotate' | 'move' | 'edge' | null => {
        if (!ruler.active) {
          return null;
        }
        const { lx, ly } = rulerToLocal(p);
        const half = ruler.length / 2;
        const t = RULER_THICKNESS / 2;
        if (Math.hypot(lx - half, ly) <= 18) {
          return 'rotate';
        }
        if (Math.abs(lx) > half) {
          return null;
        }
        const a = Math.abs(ly);
        if (a < t - 10) {
          return 'move';
        }
        return a <= t + 14 ? 'edge' : null;
      };

      // Plaque le point sur le bord de la règle si le trait a démarré contre elle.
      const constrainToRuler = (p: DrawingPoint): DrawingPoint => {
        if (rulerSide === null) {
          return p;
        }
        const { lx } = rulerToLocal(p);
        return { ...rulerFromLocal(lx, (rulerSide * RULER_THICKNESS) / 2), p: p.p };
      };

      const drawRuler = () => {
        if (!overlayContext || !ruler.active) {
          return;
        }
        const ctx = overlayContext;
        const half = ruler.length / 2;
        const t = RULER_THICKNESS / 2;
        ctx.save();
        setWorldTransform(ctx);
        ctx.translate(ruler.cx, ruler.cy);
        ctx.rotate(ruler.angle);
        ctx.fillStyle = 'rgba(37, 99, 235, 0.10)';
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.6)';
        ctx.lineWidth = 1;
        ctx.fillRect(-half, -t, ruler.length, RULER_THICKNESS);
        ctx.strokeRect(-half, -t, ruler.length, RULER_THICKNESS);
        ctx.beginPath();
        for (let i = 0; i <= ruler.length; i += 10) {
          const x = -half + i;
          ctx.moveTo(x, -t);
          ctx.lineTo(x, -t + (i % 50 === 0 ? 12 : 6));
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(half, 0, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      };

      const drawLaser = () => {
        if (!overlayContext || laserTrail.length === 0) {
          return;
        }
        const now = performance.now();
        laserTrail = laserTrail.filter((point) => now - point.t < LASER_LIFETIME);
        const ctx = overlayContext;
        ctx.save();
        setWorldTransform(ctx);
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(239, 68, 68, 0.9)';
        ctx.shadowBlur = 10;
        for (let i = 1; i < laserTrail.length; i++) {
          const alpha = 1 - (now - laserTrail[i].t) / LASER_LIFETIME;
          ctx.strokeStyle = `rgba(239, 68, 68, ${Math.max(0, alpha)})`;
          ctx.lineWidth = 2 + 5 * Math.max(0, alpha);
          ctx.beginPath();
          ctx.moveTo(laserTrail[i - 1].x, laserTrail[i - 1].y);
          ctx.lineTo(laserTrail[i].x, laserTrail[i].y);
          ctx.stroke();
        }
        if (gesture?.mode === 'laser' && laserTrail.length > 0) {
          const head = laserTrail[laserTrail.length - 1];
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(head.x, head.y, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      };

      const tickLaser = () => {
        laserFrame = null;
        renderOverlay();
        if (laserTrail.length > 0) {
          laserFrame = requestAnimationFrame(tickLaser);
        }
      };

      const pushLaser = (p: DrawingPoint) => {
        laserTrail.push({ x: p.x, y: p.y, t: performance.now() });
        if (laserFrame === null) {
          laserFrame = requestAnimationFrame(tickLaser);
        }
      };

      const renderOverlay = () => {
        clearOverlay();
        if (currentStroke && !isIncremental(currentStroke)) {
          drawStroke(currentStroke, 0, currentStroke.points.length - 1, overlayContext);
        }
        drawSelectionUi();
        drawRuler();
        drawLaser();
      };

      const computeFitView = () => {
        const rect = canvasArea.getBoundingClientRect();
        const box = strokeBounds(strokes.filter((stroke) => stroke.tool !== 'eraser'));
        if (!box || box.w <= 0 || box.h <= 0) {
          view.zoom = 1;
          view.x = -rect.width / 2;
          view.y = -rect.height / 2;
          return;
        }
        const margin = 60;
        view.zoom = clampZoom(
          Math.min(2, (rect.width - 2 * margin) / box.w, (rect.height - 2 * margin) / box.h),
        );
        view.x = box.x + box.w / 2 - rect.width / 2 / view.zoom;
        view.y = box.y + box.h / 2 - rect.height / 2 / view.zoom;
      };

      const isVisible = (stroke: DrawingStroke) => {
        if (!board || stroke.tool === 'eraser') {
          return true;
        }
        let box = boundsCache.get(stroke);
        if (!box) {
          box = strokeBounds([stroke]) ?? { x: 0, y: 0, w: 0, h: 0 };
          boundsCache.set(stroke, box);
        }
        const x1 = view.x + canvas.clientWidth / view.zoom;
        const y1 = view.y + canvas.clientHeight / view.zoom;
        return box.x <= x1 && box.x + box.w >= view.x && box.y <= y1 && box.y + box.h >= view.y;
      };

      const MINI_W = 160;
      const MINI_H = 104;
      const minimap = document.createElement('canvas');
      minimap.width = MINI_W * 2;
      minimap.height = MINI_H * 2;
      Object.assign(minimap.style, {
        position: 'absolute',
        right: '8px',
        bottom: '8px',
        width: `${MINI_W}px`,
        height: `${MINI_H}px`,
        border: '1px solid var(--ate-border, #e2e8f0)',
        borderRadius: '6px',
        background: 'rgba(255, 255, 255, 0.88)',
        touchAction: 'none',
        cursor: 'pointer',
        display: board ? 'block' : 'none',
      });
      const miniMap = { x: 0, y: 0, scale: 1 };
      let miniDragging = false;

      const renderMinimap = () => {
        const mctx = minimap.getContext('2d');
        if (!mctx) {
          return;
        }
        const viewW = canvas.clientWidth / view.zoom;
        const viewH = canvas.clientHeight / view.zoom;
        if (!miniDragging) {
          const content = strokeBounds(strokes.filter((stroke) => stroke.tool !== 'eraser'));
          let minX = view.x;
          let minY = view.y;
          let maxX = view.x + viewW;
          let maxY = view.y + viewH;
          if (content) {
            minX = Math.min(minX, content.x);
            minY = Math.min(minY, content.y);
            maxX = Math.max(maxX, content.x + content.w);
            maxY = Math.max(maxY, content.y + content.h);
          }
          const pad = 20;
          const spanX = Math.max(1, maxX - minX + 2 * pad);
          const spanY = Math.max(1, maxY - minY + 2 * pad);
          miniMap.scale = Math.min(MINI_W / spanX, MINI_H / spanY);
          miniMap.x = minX - pad - (MINI_W / miniMap.scale - spanX) / 2;
          miniMap.y = minY - pad - (MINI_H / miniMap.scale - spanY) / 2;
        }
        mctx.setTransform(2, 0, 0, 2, 0, 0);
        mctx.clearRect(0, 0, MINI_W, MINI_H);
        for (const stroke of strokes) {
          if (stroke.tool === 'eraser') {
            continue;
          }
          let box = boundsCache.get(stroke);
          if (!box) {
            box = strokeBounds([stroke]) ?? { x: 0, y: 0, w: 0, h: 0 };
            boundsCache.set(stroke, box);
          }
          mctx.fillStyle = stroke.tool === 'image' ? '#94a3b8' : stroke.color;
          mctx.globalAlpha = 0.55;
          mctx.fillRect(
            (box.x - miniMap.x) * miniMap.scale,
            (box.y - miniMap.y) * miniMap.scale,
            Math.max(1.5, box.w * miniMap.scale),
            Math.max(1.5, box.h * miniMap.scale),
          );
        }
        mctx.globalAlpha = 1;
        mctx.strokeStyle = '#2563eb';
        mctx.lineWidth = 1.5;
        mctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
        const rx = (view.x - miniMap.x) * miniMap.scale;
        const ry = (view.y - miniMap.y) * miniMap.scale;
        mctx.fillRect(rx, ry, viewW * miniMap.scale, viewH * miniMap.scale);
        mctx.strokeRect(rx, ry, viewW * miniMap.scale, viewH * miniMap.scale);
      };

      const moveViewFromMinimap = (event: PointerEvent) => {
        const rect = minimap.getBoundingClientRect();
        const wx = (event.clientX - rect.left) / miniMap.scale + miniMap.x;
        const wy = (event.clientY - rect.top) / miniMap.scale + miniMap.y;
        view.x = wx - canvas.clientWidth / view.zoom / 2;
        view.y = wy - canvas.clientHeight / view.zoom / 2;
        redraw(true);
      };
      minimap.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        miniDragging = true;
        try {
          minimap.setPointerCapture(event.pointerId);
        } catch {
          // ignoré
        }
        moveViewFromMinimap(event);
      });
      minimap.addEventListener('pointermove', (event) => {
        if (miniDragging) {
          event.preventDefault();
          moveViewFromMinimap(event);
        }
      });
      const endMinimapDrag = () => {
        miniDragging = false;
        redraw(true);
      };
      minimap.addEventListener('pointerup', endMinimapDrag);
      minimap.addEventListener('pointercancel', endMinimapDrag);
      canvasArea.append(minimap);

      const redraw = (light = false) => {
        if (!context) {
          return;
        }

        layoutBoard();
        if (needsInitialFit && canvasArea.getBoundingClientRect().width > 0) {
          needsInitialFit = false;
          computeFitView();
        }
        fitCanvas();
        if (board) {
          zoomLabel.iconEl.textContent = `${Math.round(view.zoom * 100)}%`;
        }
        applyPageStyle();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        applyGesture(strokes).forEach((stroke, index) => {
          if (
            (gesture?.mode === 'erase' && gesture.erased.includes(index)) ||
            editingIndex === index ||
            !isVisible(stroke)
          ) {
            return;
          }
          drawStroke(stroke);
        });
        if (currentStroke && isIncremental(currentStroke)) {
          drawStroke(currentStroke);
          liveIndex = Math.max(0, currentStroke.points.length - 1);
        }
        renderOverlay();
        if (board) {
          renderMinimap();
          if (lastSavedView === null) {
            lastSavedView = viewKey();
          } else if (editor.isEditable && viewKey() !== lastSavedView) {
            if (viewTimer !== null) {
              clearTimeout(viewTimer);
            }
            viewTimer = setTimeout(() => {
              viewTimer = null;
              persist();
            }, 800);
          }
        }
        if (!light) {
          updateToolbarState();
        }
      };

      /** Remplace les traits en conservant l'historique annuler / rétablir. */
      const commitStrokes = (next: DrawingStroke[], keepSelection = false) => {
        history = [...history.slice(-99), strokes];
        future = [];
        strokes = next;
        if (!keepSelection) {
          selection = [];
        }
        persist();
        redraw();
      };

      const strokeBounds = (list: DrawingStroke[]): Bounds | null => {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const stroke of list) {
          const pad = stroke.tool === 'eraser' ? 0 : stroke.size / 2;
          for (const point of stroke.points) {
            minX = Math.min(minX, point.x - pad);
            minY = Math.min(minY, point.y - pad);
            maxX = Math.max(maxX, point.x + pad);
            maxY = Math.max(maxY, point.y + pad);
          }
        }
        return Number.isFinite(minX) ? { x: minX, y: minY, w: maxX - minX, h: maxY - minY } : null;
      };

      // Redimensionnement par axe. L'épaisseur des formes est conservée ; celle des autres
      // objets suit l'échelle moyenne.
      const transformStrokeXY = (
        stroke: DrawingStroke,
        dx: number,
        dy: number,
        sx: number,
        sy: number,
        anchor: { x: number; y: number },
      ): DrawingStroke => ({
        ...stroke,
        size: stroke.tool === 'shape' ? stroke.size : stroke.size * Math.sqrt(sx * sy),
        points: stroke.points.map((point) => ({
          ...point,
          x: Math.round((anchor.x + (point.x - anchor.x) * sx + dx) * 10) / 10,
          y: Math.round((anchor.y + (point.y - anchor.y) * sy + dy) * 10) / 10,
        })),
      });

      const transformStroke = (
        stroke: DrawingStroke,
        dx: number,
        dy: number,
        factor: number,
        anchor: { x: number; y: number },
      ) => transformStrokeXY(stroke, dx, dy, factor, factor, anchor);

      const applyGesture = (list: DrawingStroke[]) => {
        if (!gesture || gesture.mode === 'lasso' || !gesture.bounds) {
          return list;
        }
        const active = gesture;
        const anchor = active.anchor ?? { x: active.bounds!.x, y: active.bounds!.y };
        const sx = active.sx ?? active.s;
        const sy = active.sy ?? active.s;
        return list.map((stroke, index) =>
          selection.includes(index)
            ? transformStrokeXY(stroke, active.dx, active.dy, sx, sy, anchor)
            : stroke,
        );
      };

      const pointInPolygon = (point: DrawingPoint, polygon: DrawingPoint[]) => {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          const a = polygon[i];
          const b = polygon[j];
          if (
            a.y > point.y !== b.y > point.y &&
            point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
          ) {
            inside = !inside;
          }
        }
        return inside;
      };

      const selectInside = (polygon: DrawingPoint[]) => {
        const picked: number[] = [];
        strokes.forEach((stroke, index) => {
          if (stroke.tool === 'eraser' || stroke.points.length === 0) {
            return;
          }
          const samples =
            stroke.points.length === 2
              ? [
                  ...stroke.points,
                  {
                    x: (stroke.points[0].x + stroke.points[1].x) / 2,
                    y: (stroke.points[0].y + stroke.points[1].y) / 2,
                  },
                ]
              : stroke.points;
          const inside = samples.filter((point) => pointInPolygon(point, polygon)).length;
          if (inside / samples.length >= 0.5) {
            picked.push(index);
          }
        });
        return picked;
      };

      const strokeSegments = (stroke: DrawingStroke): [DrawingPoint, DrawingPoint][] => {
        const pts = stroke.points;
        const segments: [DrawingPoint, DrawingPoint][] = [];
        if (stroke.tool === 'shape' && stroke.shape === 'polygon' && pts.length >= 3) {
          pts.forEach((point, index) => segments.push([point, pts[(index + 1) % pts.length]]));
          return segments;
        }
        if (
          (stroke.tool === 'shape' || stroke.tool === 'image' || stroke.tool === 'text') &&
          pts.length >= 2
        ) {
          const [a, b] = pts;
          const cx = (a.x + b.x) / 2;
          const cy = (a.y + b.y) / 2;
          let outline: DrawingPoint[];
          switch (stroke.tool === 'image' || stroke.tool === 'text' ? 'rect' : stroke.shape) {
            case 'rect':
              outline = [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }, a];
              break;
            case 'triangle':
              outline = [{ x: cx, y: a.y }, b, { x: a.x, y: b.y }, { x: cx, y: a.y }];
              break;
            case 'diamond':
              outline = [
                { x: cx, y: a.y },
                { x: b.x, y: cy },
                { x: cx, y: b.y },
                { x: a.x, y: cy },
                { x: cx, y: a.y },
              ];
              break;
            case 'ellipse':
              outline = Array.from({ length: 33 }, (_, i) => ({
                x: cx + (Math.abs(b.x - a.x) / 2) * Math.cos((i / 32) * Math.PI * 2),
                y: cy + (Math.abs(b.y - a.y) / 2) * Math.sin((i / 32) * Math.PI * 2),
              }));
              break;
            default:
              outline = [a, b];
          }
          for (let i = 0; i < outline.length - 1; i++) {
            segments.push([outline[i], outline[i + 1]]);
          }
          return segments;
        }
        if (pts.length === 1) {
          return [[pts[0], pts[0]]];
        }
        for (let i = 0; i < pts.length - 1; i++) {
          segments.push([pts[i], pts[i + 1]]);
        }
        return segments;
      };

      const distanceToSegment = (p: DrawingPoint, a: DrawingPoint, b: DrawingPoint) => {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lengthSquared = dx * dx + dy * dy;
        const t =
          lengthSquared === 0
            ? 0
            : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
        return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
      };

      const strokeHit = (stroke: DrawingStroke, point: DrawingPoint, radius: number) => {
        if (stroke.tool === 'eraser') {
          return false;
        }
        if ((stroke.tool === 'image' || stroke.tool === 'text') && stroke.points.length >= 2) {
          const [a, b] = stroke.points;
          return (
            point.x >= Math.min(a.x, b.x) - radius &&
            point.x <= Math.max(a.x, b.x) + radius &&
            point.y >= Math.min(a.y, b.y) - radius &&
            point.y <= Math.max(a.y, b.y) + radius
          );
        }
        const reach = radius + stroke.size / 2;
        return strokeSegments(stroke).some(([a, b]) => distanceToSegment(point, a, b) <= reach);
      };

      const eraseStrokesAt = (point: DrawingPoint) => {
        if (!gesture) {
          return;
        }
        const radius = currentEraserSize / 2;
        let changed = false;
        strokes.forEach((stroke, index) => {
          if (!gesture!.erased.includes(index) && strokeHit(stroke, point, radius)) {
            gesture!.erased.push(index);
            changed = true;
          }
        });
        if (changed) {
          redraw();
        }
      };

      // Gomme « zone » vectorielle : retire réellement les parties de trait touchées
      // (le trait est coupé en morceaux). Formes, images et textes sont supprimés entiers.
      const splitStroke = (stroke: DrawingStroke, point: DrawingPoint, radius: number) => {
        const reach = radius + (stroke.tool === 'highlighter' ? stroke.size / 4 : stroke.size / 2);
        const step = Math.max(1, radius / 2);
        const dense: DrawingPoint[] = [];
        stroke.points.forEach((current, index) => {
          if (index === 0) {
            dense.push(current);
            return;
          }
          const previous = stroke.points[index - 1];
          const count = Math.max(
            1,
            Math.ceil(Math.hypot(current.x - previous.x, current.y - previous.y) / step),
          );
          for (let k = 1; k <= count; k++) {
            const t = k / count;
            const sample: DrawingPoint = {
              x: Math.round((previous.x + (current.x - previous.x) * t) * 10) / 10,
              y: Math.round((previous.y + (current.y - previous.y) * t) * 10) / 10,
            };
            if (previous.p !== undefined && current.p !== undefined) {
              sample.p = Math.round((previous.p + (current.p - previous.p) * t) * 100) / 100;
            }
            dense.push(sample);
          }
        });
        const pieces: DrawingStroke[] = [];
        let run: DrawingPoint[] = [];
        const flush = () => {
          if (run.length >= 2) {
            pieces.push({ ...stroke, points: run });
          }
          run = [];
        };
        for (const sample of dense) {
          if (Math.hypot(sample.x - point.x, sample.y - point.y) <= reach) {
            flush();
          } else {
            run.push(sample);
          }
        }
        flush();
        return pieces;
      };

      const areaEraseAt = (point: DrawingPoint) => {
        const radius = currentEraserSize / 2;
        let changed = false;
        const next: DrawingStroke[] = [];
        for (const stroke of strokes) {
          if (!strokeHit(stroke, point, radius)) {
            next.push(stroke);
            continue;
          }
          changed = true;
          if (stroke.tool === 'pen' || stroke.tool === 'highlighter' || stroke.tool === undefined) {
            next.push(...splitStroke(stroke, point, radius));
          }
        }
        if (changed) {
          strokes = next;
          redraw();
        }
      };

      const drawSelectionUi = () => {
        if (!overlayContext || currentTool !== 'lasso') {
          return;
        }
        const ctx = overlayContext;
        ctx.save();
        setWorldTransform(ctx);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);

        if (gesture?.mode === 'lasso' && gesture.path.length > 1) {
          ctx.beginPath();
          ctx.moveTo(gesture.path[0].x, gesture.path[0].y);
          gesture.path.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
          ctx.stroke();
        }

        if (selection.length > 0) {
          const displayed = applyGesture(strokes).filter((_, index) => selection.includes(index));
          const box = strokeBounds(displayed);
          if (box) {
            ctx.fillStyle = 'rgba(37, 99, 235, 0.06)';
            ctx.fillRect(box.x - 4, box.y - 4, box.w + 8, box.h + 8);
            ctx.strokeRect(box.x - 4, box.y - 4, box.w + 8, box.h + 8);
            ctx.setLineDash([]);
            ctx.fillStyle = '#ffffff';
            const unit = 1 / Math.max(0.2, board ? view.zoom : pxPerUnit());
            const hasText = selection.some((index) => strokes[index]?.tool === 'text');
            for (const handle of HANDLE_DEFS) {
              if (
                hasText &&
                handle.fx !== 0 &&
                handle.fx !== 1 &&
                handle.fy !== 0 &&
                handle.fy !== 1
              ) {
                continue;
              }
              const hx = box.x - 4 + handle.fx * (box.w + 8);
              const hy = box.y - 4 + handle.fy * (box.h + 8);
              ctx.beginPath();
              if (handle.fx === 0.5 || handle.fy === 0.5) {
                ctx.rect(hx - 4 * unit, hy - 4 * unit, 8 * unit, 8 * unit);
              } else {
                ctx.arc(hx, hy, 6 * unit, 0, Math.PI * 2);
              }
              ctx.fill();
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      };

      const deleteSelection = () => {
        if (selection.length === 0) {
          return;
        }
        commitStrokes(strokes.filter((_, index) => !selection.includes(index)));
      };

      const resolveFill = () =>
        shapeFill === null ? undefined : shapeFill === 'auto' ? currentColor : shapeFill;

      const convertSelectionToShapes = () => {
        let converted = 0;
        const next = strokes.map((stroke, index) => {
          if (!selection.includes(index) || (stroke.tool !== 'pen' && stroke.tool !== undefined)) {
            return stroke;
          }
          const recognized = recognizeShape(stroke.points);
          if (!recognized) {
            return stroke;
          }
          converted++;
          return {
            color: stroke.color,
            size: stroke.size,
            tool: 'shape' as const,
            shape: recognized.shape,
            fill: recognized.shape === 'line' ? undefined : resolveFill(),
            fillAlpha: shapeFill !== null ? shapeFillAlpha : undefined,
            fillPattern: shapeFill !== null ? shapeFillPattern : undefined,
            fillGap: shapeFill !== null ? shapeFillGap : undefined,
            points: recognized.points,
          };
        });
        if (converted > 0) {
          commitStrokes(next, true);
        }
      };

      const applyFillToSelection = () => {
        commitStrokes(
          strokes.map((stroke, index) =>
            selection.includes(index) && stroke.tool === 'shape'
              ? {
                  ...stroke,
                  fill: resolveFill(),
                  fillAlpha: shapeFill !== null ? shapeFillAlpha : undefined,
                  fillPattern: shapeFill !== null ? shapeFillPattern : undefined,
                  fillGap: shapeFill !== null ? shapeFillGap : undefined,
                }
              : stroke,
          ),
          true,
        );
      };

      const applyColorToSelection = () => {
        commitStrokes(
          strokes.map((stroke, index) =>
            selection.includes(index) && stroke.tool !== 'image'
              ? { ...stroke, color: currentColor }
              : stroke,
          ),
          true,
        );
      };

      // Une forme remplie est « touchée » aussi à l'intérieur, pas seulement sur son contour.
      const shapeContains = (stroke: DrawingStroke, p: DrawingPoint) => {
        const pts = stroke.points;
        if (stroke.tool !== 'shape' || !stroke.fill || pts.length < 2) {
          return false;
        }
        if (stroke.shape === 'line' || stroke.shape === 'arrow') {
          return false;
        }
        if (stroke.shape === 'polygon') {
          return pointInPolygon(p, pts);
        }
        const [a, b] = pts;
        const x0 = Math.min(a.x, b.x);
        const x1 = Math.max(a.x, b.x);
        const y0 = Math.min(a.y, b.y);
        const y1 = Math.max(a.y, b.y);
        const cx = (x0 + x1) / 2;
        const cy = (y0 + y1) / 2;
        switch (stroke.shape) {
          case 'ellipse': {
            const rx = Math.max(1, (x1 - x0) / 2);
            const ry = Math.max(1, (y1 - y0) / 2);
            return ((p.x - cx) / rx) ** 2 + ((p.y - cy) / ry) ** 2 <= 1;
          }
          case 'triangle':
            return pointInPolygon(p, [
              { x: cx, y: y0 },
              { x: x1, y: y1 },
              { x: x0, y: y1 },
            ]);
          case 'diamond':
            return pointInPolygon(p, [
              { x: cx, y: y0 },
              { x: x1, y: cy },
              { x: cx, y: y1 },
              { x: x0, y: cy },
            ]);
          default:
            return p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1;
        }
      };

      /** Objet le plus haut situé sous le point (contour, intérieur d'une forme remplie, image, texte). */
      const findObjectAt = (point: DrawingPoint) => {
        const radius = 8 / Math.max(0.05, pxPerUnit());
        for (let i = strokes.length - 1; i >= 0; i--) {
          const stroke = strokes[i];
          if (stroke.tool === 'eraser') {
            continue;
          }
          if (strokeHit(stroke, point, radius) || shapeContains(stroke, point)) {
            return i;
          }
        }
        return -1;
      };

      const duplicateSelection = () => {
        if (selection.length === 0) {
          return;
        }
        const copies = strokes
          .filter((_, index) => selection.includes(index))
          .map((stroke) => transformStroke(stroke, 24, 24, 1, { x: 0, y: 0 }));
        const firstIndex = strokes.length;
        commitStrokes([...strokes, ...copies], true);
        selection = copies.map((_, index) => firstIndex + index);
        redraw();
      };

      const reorderSelection = (toFront: boolean) => {
        if (selection.length === 0) {
          return;
        }
        const chosen = strokes.filter((_, index) => selection.includes(index));
        const others = strokes.filter((_, index) => !selection.includes(index));
        const next = toFront ? [...others, ...chosen] : [...chosen, ...others];
        commitStrokes(next, true);
        selection = chosen.map((_, index) => (toFront ? others.length + index : index));
        redraw();
      };

      const copySelection = (cut: boolean) => {
        if (!editor.isEditable || selection.length === 0) {
          return false;
        }
        drawingClipboard = JSON.parse(
          JSON.stringify(strokes.filter((_, index) => selection.includes(index))),
        ) as DrawingStroke[];
        if (cut) {
          deleteSelection();
        }
        updateToolbarState();
        return true;
      };

      const pasteClipboard = () => {
        if (!editor.isEditable || drawingClipboard.length === 0) {
          return false;
        }
        const box = strokeBounds(drawingClipboard);
        if (!box) {
          return false;
        }
        const targetX = board ? view.x + canvas.clientWidth / view.zoom / 2 : logicalWidth / 2;
        const targetY = board ? view.y + canvas.clientHeight / view.zoom / 2 : logicalHeight / 2;
        const dx = targetX - (box.x + box.w / 2) + (Math.random() - 0.5) * 20;
        const dy = targetY - (box.y + box.h / 2) + (Math.random() - 0.5) * 20;
        const copies = JSON.parse(JSON.stringify(drawingClipboard)).map((stroke: DrawingStroke) =>
          transformStroke(stroke, dx, dy, 1, { x: 0, y: 0 }),
        ) as DrawingStroke[];
        const firstIndex = strokes.length;
        selectTool('lasso');
        commitStrokes([...strokes, ...copies], true);
        selection = copies.map((_, index) => firstIndex + index);
        redraw();
        return true;
      };

      const cycleDash = () => {
        currentDash =
          currentDash === 'solid' ? 'dashed' : currentDash === 'dashed' ? 'dotted' : 'solid';
        if (selection.some((index) => strokes[index]?.tool === 'shape')) {
          commitStrokes(
            strokes.map((stroke, index) =>
              selection.includes(index) && stroke.tool === 'shape'
                ? { ...stroke, dash: currentDash === 'solid' ? undefined : currentDash }
                : stroke,
            ),
            true,
          );
        }
        updateToolbarState();
      };

      const exportPng = () => {
        const out = document.createElement('canvas');
        out.width = canvas.width;
        out.height = canvas.height;
        const octx = out.getContext('2d');
        if (!octx) {
          return;
        }
        octx.fillStyle = '#ffffff';
        octx.fillRect(0, 0, out.width, out.height);
        octx.drawImage(canvas, 0, 0);
        out.toBlob((blob) => {
          if (!blob) {
            return;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `dessin-${new Date().toISOString().slice(0, 10)}.png`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, 'image/png');
      };

      const persist = () => {
        const pos = getPos();
        if (typeof pos !== 'number') {
          return;
        }

        editor.commands.command(({ tr, dispatch }) => {
          if (dispatch) {
            tr.setNodeMarkup(pos, undefined, {
              ...currentNode.attrs,
              strokes,
              pageStyle: currentPageStyle,
              width: logicalWidth,
              height: logicalHeight,
              view: board ? JSON.parse(viewKey()) : null,
            });
            lastSavedView = viewKey();
            // L'annulation du dessin est gérée par l'historique du dessin lui-même.
            tr.setMeta('addToHistory', false);
            tr.setMeta('drawing', true);
          }
          return true;
        });
      };

      const pointFromEvent = (event: PointerEvent): DrawingPoint => {
        const rect = canvas.getBoundingClientRect();
        const point: DrawingPoint = {
          x:
            Math.round(
              (board
                ? view.x + (event.clientX - rect.left) / view.zoom
                : ((event.clientX - rect.left) / rect.width) * logicalWidth) * 10,
            ) / 10,
          y:
            Math.round(
              (board
                ? view.y + (event.clientY - rect.top) / view.zoom
                : ((event.clientY - rect.top) / rect.height) * logicalHeight) * 10,
            ) / 10,
        };
        if (event.pointerType === 'pen' && event.pressure > 0) {
          point.p = Math.round(event.pressure * 100) / 100;
        }
        return point;
      };

      const clearHoldTimer = () => {
        if (holdTimer !== null) {
          clearTimeout(holdTimer);
          holdTimer = null;
        }
        holdAnchor = null;
      };

      // Maintenir le stylet immobile après un trait redresse celui-ci en ligne droite.
      // Maintenir le stylet immobile après un tracé le transforme en forme propre
      // (ligne, ellipse, rectangle, triangle, losange) si elle est reconnue.
      const snapToLine = () => {
        holdTimer = null;
        if (!isDrawing || !currentStroke || currentStroke.tool !== 'pen') {
          return;
        }
        const recognized = recognizeShape(currentStroke.points);
        if (!recognized) {
          return;
        }
        currentStroke = {
          color: currentStroke.color,
          size: currentStroke.size,
          tool: 'shape',
          shape: recognized.shape,
          fill: recognized.shape === 'line' ? undefined : resolveFill(),
          fillAlpha: shapeFill !== null ? shapeFillAlpha : undefined,
          fillPattern: shapeFill !== null ? shapeFillPattern : undefined,
          fillGap: shapeFill !== null ? shapeFillGap : undefined,
          dash: currentDash !== 'solid' ? currentDash : undefined,
          points: recognized.points,
        };
        frozenShape = recognized.shape !== 'line';
        redraw();
      };

      const measureTextBox = (text: string, fontSize: number) => {
        const lines = text.split('\n');
        context!.save();
        context!.setTransform(1, 0, 0, 1, 0, 0);
        context!.font = `${fontSize}px ${TEXT_FONT}`;
        const width = Math.max(...lines.map((line) => context!.measureText(line).width));
        context!.restore();
        return { width, height: lines.length * fontSize * TEXT_LINE_HEIGHT };
      };

      let textEditor: HTMLTextAreaElement | null = null;

      const findTextAt = (point: DrawingPoint) => {
        for (let i = strokes.length - 1; i >= 0; i--) {
          const stroke = strokes[i];
          if (stroke.tool !== 'text' || stroke.points.length < 2) {
            continue;
          }
          const [a, b] = stroke.points;
          if (
            point.x >= Math.min(a.x, b.x) - 6 &&
            point.x <= Math.max(a.x, b.x) + 6 &&
            point.y >= Math.min(a.y, b.y) - 6 &&
            point.y <= Math.max(a.y, b.y) + 6
          ) {
            return i;
          }
        }
        return -1;
      };

      const editText = (index: number) => {
        const stroke = strokes[index];
        if (!stroke || stroke.points.length < 2) {
          return;
        }
        selection = [];
        openTextEditor(
          {
            x: Math.min(stroke.points[0].x, stroke.points[1].x),
            y: Math.min(stroke.points[0].y, stroke.points[1].y),
          },
          index,
        );
      };

      const openTextEditor = (origin: DrawingPoint, editIndex: number | null = null) => {
        if (!context) {
          return;
        }
        textEditor?.blur();

        const editing = editIndex !== null ? strokes[editIndex] : null;
        const fontSize = editing ? editing.size : TEXT_SIZES[currentSizeIndex];
        const color = editing ? editing.color : currentColor;
        const rect = canvas.getBoundingClientRect();
        const cssScale = pxPerUnit();
        const area = document.createElement('textarea');
        textEditor = area;
        Object.assign(area.style, {
          position: 'absolute',
          left: `${(origin.x - (board ? view.x : 0)) * cssScale}px`,
          top: `${(origin.y - (board ? view.y : 0)) * cssScale}px`,
          zIndex: '4',
          margin: '0',
          padding: '0',
          border: '1px dashed var(--ate-primary, #2563eb)',
          outline: 'none',
          background: 'rgba(255, 255, 255, 0.6)',
          color,
          resize: 'none',
          overflow: 'hidden',
          whiteSpace: 'pre',
          font: `${fontSize * cssScale}px ${TEXT_FONT}`,
          lineHeight: String(TEXT_LINE_HEIGHT),
          minWidth: '80px',
        });
        area.rows = 1;
        if (editing) {
          area.value = editing.src ?? '';
          editingIndex = editIndex;
          redraw();
        }

        const fit = () => {
          const box = measureTextBox(area.value || ' ', fontSize * cssScale);
          area.style.width = `${Math.ceil(box.width) + 12}px`;
          area.style.height = `${Math.ceil(box.height) + 2}px`;
        };

        let finished = false;
        const close = (commit: boolean) => {
          if (finished) {
            return;
          }
          finished = true;
          const text = area.value.replace(/\s+$/, '');
          area.remove();
          textEditor = null;
          editingIndex = null;
          if (editIndex !== null) {
            const original = strokes[editIndex];
            if (!commit || !original || text === original.src) {
              redraw();
            } else if (!text.trim()) {
              commitStrokes(strokes.filter((_, index) => index !== editIndex));
            } else {
              const box = measureTextBox(text, fontSize);
              commitStrokes(
                strokes.map((stroke, index) =>
                  index === editIndex
                    ? {
                        ...stroke,
                        src: text,
                        points: [origin, { x: origin.x + box.width, y: origin.y + box.height }],
                      }
                    : stroke,
                ),
              );
            }
            return;
          }
          if (commit && text.trim()) {
            const box = measureTextBox(text, fontSize);
            commitStrokes([
              ...strokes,
              {
                color,
                size: fontSize,
                tool: 'text',
                src: text,
                points: [origin, { x: origin.x + box.width, y: origin.y + box.height }],
              },
            ]);
          }
        };

        area.addEventListener('input', fit);
        area.addEventListener('blur', () => close(true));
        area.addEventListener('keydown', (event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            close(false);
          }
        });
        canvasArea.appendChild(area);
        fit();
        setTimeout(() => area.focus(), 0);
      };

      const startLasso = (event: PointerEvent) => {
        const point = pointFromEvent(event);
        const tapTime = Date.now();
        const tappedText = findTextAt(point);
        if (
          tappedText >= 0 &&
          lastTap &&
          tapTime - lastTap.time < 400 &&
          Math.hypot(point.x - lastTap.x, point.y - lastTap.y) < 20
        ) {
          lastTap = null;
          editText(tappedText);
          return;
        }
        lastTap = { time: tapTime, x: point.x, y: point.y };
        const bounds =
          selection.length > 0
            ? strokeBounds(strokes.filter((_, i) => selection.includes(i)))
            : null;
        let mode: LassoGesture['mode'] = 'lasso';
        let pickedHandle: string | undefined;
        if (bounds) {
          const box = { x: bounds.x - 4, y: bounds.y - 4, w: bounds.w + 8, h: bounds.h + 8 };
          const hasText = selection.some((index) => strokes[index]?.tool === 'text');
          const reach = 18 / Math.max(0.2, board ? view.zoom : pxPerUnit());
          for (const handle of HANDLE_DEFS) {
            if (
              hasText &&
              handle.fx !== 0 &&
              handle.fx !== 1 &&
              handle.fy !== 0 &&
              handle.fy !== 1
            ) {
              continue;
            }
            const hx = box.x + handle.fx * box.w;
            const hy = box.y + handle.fy * box.h;
            if (Math.hypot(point.x - hx, point.y - hy) <= reach) {
              mode = 'scale';
              pickedHandle = handle.id;
              break;
            }
          }
          if (mode === 'scale') {
            // poignée trouvée
          } else if (
            point.x >= bounds.x - 4 &&
            point.x <= bounds.x + bounds.w + 4 &&
            point.y >= bounds.y - 4 &&
            point.y <= bounds.y + bounds.h + 4
          ) {
            mode = 'move';
          }
        }
        if (mode === 'lasso') {
          selection = [];
        }
        let anchor: { x: number; y: number } | undefined;
        if (mode === 'scale' && bounds) {
          const def = HANDLE_DEFS.find((handle) => handle.id === pickedHandle)!;
          // Point fixe : le côté / coin opposé à la poignée.
          anchor = {
            x: bounds.x - 4 + (1 - def.fx) * (bounds.w + 8),
            y: bounds.y - 4 + (1 - def.fy) * (bounds.h + 8),
          };
        }
        gesture = {
          mode,
          start: point,
          path: [point],
          bounds,
          dx: 0,
          dy: 0,
          s: 1,
          erased: [],
          handle: pickedHandle,
          anchor,
          sx: 1,
          sy: 1,
        };
        activePointerId = event.pointerId;
        isDrawing = true;
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch {
          // ignoré
        }
        redraw();
      };

      const continueLasso = (event: PointerEvent) => {
        if (!gesture) {
          return;
        }
        if (gesture.mode === 'pan') {
          view.x = gesture.dx - (event.clientX - gesture.start.x) / view.zoom;
          view.y = gesture.dy - (event.clientY - gesture.start.y) / view.zoom;
          redraw(true);
          return;
        }
        const point = pointFromEvent(event);
        if (gesture.mode === 'laser') {
          pushLaser(point);
        } else if (gesture.mode === 'rulerMove') {
          ruler.cx = point.x + gesture.dx;
          ruler.cy = point.y + gesture.dy;
          renderOverlay();
        } else if (gesture.mode === 'rulerRotate') {
          let angle = Math.atan2(point.y - ruler.cy, point.x - ruler.cx);
          const step = Math.PI / 12;
          const nearest = Math.round(angle / step) * step;
          if (Math.abs(angle - nearest) < (2.5 * Math.PI) / 180) {
            angle = nearest;
          }
          ruler.angle = angle;
          renderOverlay();
        } else if (gesture.mode === 'areaErase') {
          areaEraseAt(point);
        } else if (gesture.mode === 'erase') {
          eraseStrokesAt(point);
        } else if (gesture.mode === 'lasso') {
          gesture.path.push(point);
          renderOverlay();
        } else if (gesture.mode === 'move') {
          gesture.dx = point.x - gesture.start.x;
          gesture.dy = point.y - gesture.start.y;
          redraw();
        } else if (gesture.bounds && gesture.anchor) {
          const def = HANDLE_DEFS.find((handle) => handle.id === gesture!.handle);
          if (!def) {
            return;
          }
          const { x, y, w, h } = gesture.bounds;
          const handleX = x - 4 + def.fx * (w + 8);
          const handleY = y - 4 + def.fy * (h + 8);
          const clamp = (value: number) => Math.min(20, Math.max(0.05, value));
          let sx =
            def.fx === 0.5 ? 1 : clamp((point.x - gesture.anchor.x) / (handleX - gesture.anchor.x));
          let sy =
            def.fy === 0.5 ? 1 : clamp((point.y - gesture.anchor.y) / (handleY - gesture.anchor.y));
          const hasText = selection.some((index) => strokes[index]?.tool === 'text');
          const isCorner = def.fx !== 0.5 && def.fy !== 0.5;
          if (isCorner && (lockRatio || hasText)) {
            sx = (sx + sy) / 2;
            sy = sx;
          }
          gesture.sx = sx;
          gesture.sy = sy;
          redraw();
        }
      };

      const finishLasso = () => {
        const ended = gesture;
        gesture = null;
        isDrawing = false;
        activePointerId = null;
        if (!ended) {
          return;
        }
        if (ended.mode === 'areaErase') {
          if (ended.base && strokes !== ended.base) {
            history = [...history.slice(-99), ended.base];
            future = [];
            selection = [];
            persist();
          }
          redraw();
          return;
        }
        if (
          ended.mode === 'pan' ||
          ended.mode === 'laser' ||
          ended.mode === 'rulerMove' ||
          ended.mode === 'rulerRotate'
        ) {
          renderOverlay();
          return;
        }
        if (ended.mode === 'erase') {
          if (ended.erased.length > 0) {
            commitStrokes(strokes.filter((_, index) => !ended.erased.includes(index)));
          } else {
            redraw();
          }
        } else if (ended.mode === 'lasso') {
          const spread = Math.max(
            0,
            ...ended.path.map((p) => Math.hypot(p.x - ended.start.x, p.y - ended.start.y)),
          );
          if (ended.path.length < 3 || spread < 6 / Math.max(0.05, pxPerUnit())) {
            // Simple toucher : sélectionne l'objet touché.
            const hit = findObjectAt(ended.start);
            selection = hit >= 0 ? [hit] : [];
          } else {
            selection = selectInside(ended.path);
          }
          redraw();
        } else if (
          ended.bounds &&
          (ended.dx !== 0 || ended.dy !== 0 || (ended.sx ?? 1) !== 1 || (ended.sy ?? 1) !== 1)
        ) {
          const anchor = ended.anchor ?? { x: ended.bounds.x, y: ended.bounds.y };
          commitStrokes(
            strokes.map((stroke, index) =>
              selection.includes(index)
                ? transformStrokeXY(
                    stroke,
                    ended.dx,
                    ended.dy,
                    ended.sx ?? 1,
                    ended.sy ?? 1,
                    anchor,
                  )
                : stroke,
            ),
            true,
          );
        } else {
          redraw();
        }
      };

      const zoomAt = (sx: number, sy: number, factor: number) => {
        const next = clampZoom(view.zoom * factor);
        const wx = view.x + sx / view.zoom;
        const wy = view.y + sy / view.zoom;
        view.zoom = next;
        view.x = wx - sx / next;
        view.y = wy - sy / next;
      };

      const measurePinch = () => {
        const [a, b] = [...touches.values()];
        return {
          dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
          cx: (a.x + b.x) / 2,
          cy: (a.y + b.y) / 2,
        };
      };

      // Tableau blanc : un doigt déplace, deux doigts déplacent + zooment
      // (un doigt dessine seulement si « dessiner au doigt » est activé).
      const boardTouchDown = (event: PointerEvent) => {
        touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (touches.size >= 2) {
          if (isDrawing) {
            clearHoldTimer();
            currentStroke = null;
            gesture = null;
            isDrawing = false;
            activePointerId = null;
            rulerSide = null;
          }
          touches.forEach((_, id) => consumedTouches.add(id));
          pinch = measurePinch();
          panAnchor = null;
          event.preventDefault();
          redraw(true);
          return true;
        }
        if (!allowFinger) {
          consumedTouches.add(event.pointerId);
          panAnchor = { x: event.clientX, y: event.clientY };
          event.preventDefault();
          return true;
        }
        return false;
      };

      const boardTouchMove = (event: PointerEvent) => {
        if (!touches.has(event.pointerId)) {
          return false;
        }
        touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (!consumedTouches.has(event.pointerId)) {
          return false;
        }
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        if (touches.size >= 2 && pinch) {
          const next = measurePinch();
          zoomAt(next.cx - rect.left, next.cy - rect.top, next.dist / pinch.dist);
          view.x -= (next.cx - pinch.cx) / view.zoom;
          view.y -= (next.cy - pinch.cy) / view.zoom;
          pinch = next;
          redraw(true);
        } else if (panAnchor) {
          view.x -= (event.clientX - panAnchor.x) / view.zoom;
          view.y -= (event.clientY - panAnchor.y) / view.zoom;
          panAnchor = { x: event.clientX, y: event.clientY };
          redraw(true);
        }
        return true;
      };

      const boardTouchUp = (event: PointerEvent) => {
        const wasConsumed = consumedTouches.delete(event.pointerId);
        touches.delete(event.pointerId);
        if (touches.size < 2) {
          pinch = null;
        }
        if (touches.size === 0) {
          panAnchor = null;
        } else if (touches.size === 1) {
          const [[id, position]] = [...touches.entries()];
          panAnchor = consumedTouches.has(id) ? { ...position } : null;
        }
        if (wasConsumed) {
          redraw();
        }
        return wasConsumed;
      };

      const startDrawing = (event: PointerEvent) => {
        if (board && event.pointerType === 'touch' && boardTouchDown(event)) {
          return;
        }
        if (!editor.isEditable || activePointerId !== null) {
          return;
        }
        if (ruler.active) {
          const rulerPoint = pointFromEvent(event);
          const hit = rulerHit(rulerPoint);
          if (hit === 'move' || hit === 'rotate') {
            event.preventDefault();
            event.stopPropagation();
            gesture = {
              mode: hit === 'move' ? 'rulerMove' : 'rulerRotate',
              start: rulerPoint,
              path: [],
              bounds: null,
              dx: ruler.cx - rulerPoint.x,
              dy: ruler.cy - rulerPoint.y,
              s: 1,
              erased: [],
            };
            activePointerId = event.pointerId;
            isDrawing = true;
            try {
              canvas.setPointerCapture(event.pointerId);
            } catch {
              // ignoré
            }
            return;
          }
        }
        // Rejet de paume : par défaut seul le stylet (et la souris) dessine,
        // le doigt reste libre pour faire défiler la page.
        if (event.pointerType === 'touch' && !allowFinger) {
          return;
        }
        if (event.pointerType === 'mouse' && event.button !== 0) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        setEraserSizePopupOpen(false);
        setPageStyleMenuOpen(false);
        setShapeMenuOpen(false);
        setFillMenuOpen(false);

        if (currentTool === 'pan') {
          gesture = {
            mode: 'pan',
            start: { x: event.clientX, y: event.clientY },
            path: [],
            bounds: null,
            dx: view.x,
            dy: view.y,
            s: 1,
            erased: [],
          };
          activePointerId = event.pointerId;
          isDrawing = true;
          try {
            canvas.setPointerCapture(event.pointerId);
          } catch {
            // ignoré
          }
          return;
        }

        if (currentTool === 'pipette') {
          const hit = findObjectAt(pointFromEvent(event));
          if (hit >= 0 && strokes[hit].tool !== 'image') {
            const picked = strokes[hit];
            currentColor =
              picked.tool === 'shape' && typeof picked.fill === 'string' && !picked.color
                ? picked.fill
                : picked.color;
            colorPicker.value = /^#[0-9a-f]{6}$/i.test(currentColor) ? currentColor : '#000000';
          }
          currentTool = lastDrawTool;
          updateToolbarState();
          return;
        }

        if (currentTool === 'lasso') {
          startLasso(event);
          return;
        }

        if (currentTool === 'text') {
          const textPoint = pointFromEvent(event);
          const textIndex = findTextAt(textPoint);
          if (textIndex >= 0) {
            editText(textIndex);
          } else {
            openTextEditor(textPoint);
          }
          return;
        }

        if (currentTool === 'laser') {
          const laserPoint = pointFromEvent(event);
          gesture = {
            mode: 'laser',
            start: laserPoint,
            path: [],
            bounds: null,
            dx: 0,
            dy: 0,
            s: 1,
            erased: [],
          };
          activePointerId = event.pointerId;
          isDrawing = true;
          try {
            canvas.setPointerCapture(event.pointerId);
          } catch {
            // ignoré
          }
          pushLaser(laserPoint);
          return;
        }

        if (
          currentTool === 'strokeEraser' ||
          (currentTool === 'eraser' && eraserMode === 'stroke')
        ) {
          const point = pointFromEvent(event);
          gesture = {
            mode: 'erase',
            start: point,
            path: [],
            bounds: null,
            dx: 0,
            dy: 0,
            s: 1,
            erased: [],
          };
          activePointerId = event.pointerId;
          isDrawing = true;
          try {
            canvas.setPointerCapture(event.pointerId);
          } catch {
            // ignoré
          }
          eraseStrokesAt(point);
          return;
        }

        // Bouton gomme de certains stylets (barrel / extrémité gomme).
        if (
          currentTool === 'eraser' ||
          (event.pointerType === 'pen' && (event.buttons & 32) !== 0)
        ) {
          const eraserPoint = pointFromEvent(event);
          gesture = {
            mode: 'areaErase',
            start: eraserPoint,
            path: [],
            bounds: null,
            dx: 0,
            dy: 0,
            s: 1,
            erased: [],
            base: strokes,
          };
          activePointerId = event.pointerId;
          isDrawing = true;
          try {
            canvas.setPointerCapture(event.pointerId);
          } catch {
            // ignoré
          }
          areaEraseAt(eraserPoint);
          return;
        }

        const tool: DrawingTool = currentTool;
        const baseSize = PEN_SIZES[currentSizeIndex].value;

        rulerSide = null;
        if (ruler.active && (tool === 'pen' || tool === 'highlighter' || tool === 'shape')) {
          const first = pointFromEvent(event);
          if (rulerHit(first) === 'edge') {
            rulerSide = rulerToLocal(first).ly < 0 ? -1 : 1;
          }
        }

        activePointerId = event.pointerId;
        isDrawing = true;
        liveIndex = 0;
        frozenShape = false;
        currentStroke = {
          color: currentColor,
          size: tool === 'highlighter' ? baseSize * HIGHLIGHTER_FACTOR : baseSize,
          tool,
          shape: tool === 'shape' ? currentShape : undefined,
          fill: tool === 'shape' ? resolveFill() : undefined,
          fillAlpha: tool === 'shape' && shapeFill !== null ? shapeFillAlpha : undefined,
          fillPattern: tool === 'shape' && shapeFill !== null ? shapeFillPattern : undefined,
          fillGap: tool === 'shape' && shapeFill !== null ? shapeFillGap : undefined,
          pen: tool === 'pen' ? PEN_KINDS[penIndex].kind : undefined,
          dash: tool === 'shape' && currentDash !== 'solid' ? currentDash : undefined,
          points: [constrainToRuler(pointFromEvent(event))],
        };
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch {
          // ignoré
        }
      };

      const continueDrawing = (event: PointerEvent) => {
        if (board && event.pointerType === 'touch' && boardTouchMove(event)) {
          return;
        }
        if (gesture && event.pointerId === activePointerId) {
          event.preventDefault();
          continueLasso(event);
          return;
        }
        if (!isDrawing || !currentStroke || event.pointerId !== activePointerId) {
          return;
        }

        event.preventDefault();
        const coalesced =
          typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
        const events = coalesced.length > 0 ? coalesced : [event];
        const points = currentStroke.points;

        if (currentStroke.tool === 'shape' && (frozenShape || currentStroke.shape === 'polygon')) {
          return;
        }

        if (currentStroke.tool === 'shape') {
          points[1] = constrainToRuler(pointFromEvent(events[events.length - 1]));
          renderOverlay();
          return;
        }

        for (const item of events) {
          const point = constrainToRuler(pointFromEvent(item));
          const previous = points[points.length - 1];
          if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 0.4) {
            continue;
          }
          points.push(point);
        }

        if (currentStroke.tool === 'highlighter') {
          renderOverlay();
          return;
        }

        // Dessin incrémental : seuls les nouveaux segments sont peints.
        if (points.length - 2 >= liveIndex) {
          drawStroke(currentStroke, liveIndex, points.length - 2);
          liveIndex = points.length - 1;
        }

        if (currentStroke.tool === 'pen') {
          const tip = points[points.length - 1];
          if (
            !holdAnchor ||
            Math.hypot(tip.x - holdAnchor.x, tip.y - holdAnchor.y) > 5 / (board ? view.zoom : 1)
          ) {
            clearHoldTimer();
            holdAnchor = tip;
            holdTimer = setTimeout(snapToLine, 600);
          }
        }
      };

      const finishDrawing = (event: PointerEvent, discardShort: boolean) => {
        if (board && event.pointerType === 'touch' && boardTouchUp(event)) {
          return;
        }
        if (gesture && event.pointerId === activePointerId) {
          event.preventDefault();
          if (discardShort) {
            if (gesture.mode === 'areaErase' && gesture.base) {
              strokes = gesture.base;
            }
            gesture = null;
            isDrawing = false;
            activePointerId = null;
            redraw();
          } else {
            finishLasso();
          }
          return;
        }
        if (!isDrawing || !currentStroke || event.pointerId !== activePointerId) {
          return;
        }

        event.preventDefault();
        clearHoldTimer();
        rulerSide = null;
        isDrawing = false;
        activePointerId = null;
        const finished = currentStroke;
        currentStroke = null;

        let keep: boolean;
        if (finished.tool === 'shape') {
          keep =
            finished.points.length >= 2 &&
            Math.hypot(
              finished.points[1].x - finished.points[0].x,
              finished.points[1].y - finished.points[0].y,
            ) >= 3;
        } else {
          keep = finished.points.length > 1 || (!discardShort && finished.points.length === 1);
        }

        // Un simple toucher avec l'outil Formes sur une forme existante la sélectionne.
        if (!keep && finished.tool === 'shape' && !discardShort) {
          const hit = findObjectAt(finished.points[0]);
          if (hit >= 0) {
            selectTool('lasso');
            selection = [hit];
            redraw();
            return;
          }
        }
        if (keep) {
          commitStrokes([...strokes, finished]);
        }
        redraw();
      };

      const stopDrawing = (event: PointerEvent) => finishDrawing(event, false);
      const cancelDrawing = (event: PointerEvent) => finishDrawing(event, true);

      const startResize = (event: PointerEvent) => {
        if (!editor.isEditable || event.button !== 0) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        isResizing = true;
        resizeStartY = event.clientY;
        resizeStartHeight = logicalHeight;
        resizeHandle.setPointerCapture(event.pointerId);
        setEraserSizePopupOpen(false);
        setPageStyleMenuOpen(false);
      };

      const continueResize = (event: PointerEvent) => {
        if (!isResizing) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        const rect = canvas.getBoundingClientRect();
        const ratio = logicalWidth / rect.width;
        resizeCanvasHeight(resizeStartHeight + (event.clientY - resizeStartY) * ratio);
      };

      const stopResize = (event: PointerEvent) => {
        if (!isResizing) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        isResizing = false;
        persist();
      };

      canvas.addEventListener('pointerdown', startDrawing);
      canvas.addEventListener('pointermove', continueDrawing);
      canvas.addEventListener('pointerup', stopDrawing);
      canvas.addEventListener('pointercancel', cancelDrawing);
      canvas.addEventListener('pointerenter', (event) => {
        lastPointerEvent = event;
        updateEraserCursor(event);
      });
      canvas.addEventListener('pointermove', (event) => {
        lastPointerEvent = event;
        updateEraserCursor(event);
      });
      canvas.addEventListener('pointerleave', () => {
        lastPointerEvent = null;
        eraserCursor.style.opacity = '0';
      });
      // Empêche le scroll / zoom du navigateur pendant qu'un trait est en cours.
      canvas.addEventListener(
        'touchmove',
        (event) => {
          if (isDrawing && event.cancelable) {
            event.preventDefault();
          }
        },
        { passive: false },
      );
      canvas.addEventListener('contextmenu', (event) => event.preventDefault());
      canvas.addEventListener(
        'wheel',
        (event) => {
          if (!board) {
            return;
          }
          event.preventDefault();
          const rect = canvas.getBoundingClientRect();
          if (event.ctrlKey || event.metaKey) {
            zoomAt(
              event.clientX - rect.left,
              event.clientY - rect.top,
              Math.exp(-event.deltaY * 0.01),
            );
          } else {
            view.x += event.deltaX / view.zoom;
            view.y += event.deltaY / view.zoom;
          }
          redraw(true);
        },
        { passive: false },
      );
      resizeHandle.addEventListener('pointerdown', startResize);
      resizeHandle.addEventListener('pointermove', continueResize);
      resizeHandle.addEventListener('pointerup', stopResize);
      resizeHandle.addEventListener('pointercancel', stopResize);

      colorPicker.addEventListener('input', (event) => {
        const input = event.target as HTMLInputElement;
        currentColor = input.value;
        if (currentTool === 'eraser') {
          currentTool = lastDrawTool;
        }
        setPageStyleMenuOpen(false);
        updateToolbarState();
      });

      pageStyleButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!editor.isEditable) {
          return;
        }
        setEraserSizePopupOpen(false);
        setShapeMenuOpen(false);
        setPageStyleMenuOpen(!isPageStyleMenuOpen);
        updateToolbarState();
      });

      pageStyleButtons.forEach(({ button, option }) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!editor.isEditable) {
            return;
          }
          currentPageStyle = option.value;
          setPageStyleMenuOpen(false);
          persist();
          redraw();
        });
      });

      eraserButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!editor.isEditable) {
          return;
        }
        setPageStyleMenuOpen(false);
        setShapeMenuOpen(false);
        setFillMenuOpen(false);
        if (currentTool !== 'eraser') {
          selectTool('eraser');
          setEraserSizePopupOpen(false);
        } else {
          // Déjà sélectionnée : ouvre / ferme les réglages (mode et taille).
          setEraserSizePopupOpen(!isEraserSizePopupOpen);
        }
        updateToolbarState();
      });

      areaModeButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        eraserMode = 'area';
        updateToolbarState();
      });

      strokeModeButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        eraserMode = 'stroke';
        updateToolbarState();
      });

      eraserButton.addEventListener('dblclick', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!editor.isEditable) {
          return;
        }
        currentTool = 'eraser';
        setPageStyleMenuOpen(false);
        setEraserSizePopupOpen(true);
        updateToolbarState();
      });

      eraserSizeInput.addEventListener('input', (event) => {
        const input = event.target as HTMLInputElement;
        currentEraserSize = Number(input.value);
        eraserSizeLabel.textContent = `${currentEraserSize}px`;
        updateToolbarState();
      });

      const undoAction = () => {
        if (!editor.isEditable || history.length === 0) {
          return;
        }
        future = [...future, strokes];
        strokes = history[history.length - 1];
        history = history.slice(0, -1);
        selection = [];
        persist();
        redraw();
      };

      const redoAction = () => {
        if (!editor.isEditable || future.length === 0) {
          return;
        }
        history = [...history, strokes];
        strokes = future[future.length - 1];
        future = future.slice(0, -1);
        selection = [];
        persist();
        redraw();
      };

      undoButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        undoAction();
      });

      redoButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        redoAction();
      });

      const api: ActiveDrawing = {
        canUndo: () => editor.isEditable && history.length > 0,
        canRedo: () => editor.isEditable && future.length > 0,
        undo: undoAction,
        redo: redoAction,
        copy: (cut) => copySelection(cut),
        paste: () => pasteClipboard(),
      };
      wrapper.addEventListener(
        'pointerdown',
        (event) => {
          activeDrawing = api;
          // Ctrl+Z n'atteint l'éditeur que s'il a le focus clavier.
          const target = event.target as HTMLElement;
          const editorDom = editor.view.dom as HTMLElement;
          if (
            !editorDom.contains(document.activeElement) &&
            !(target instanceof HTMLInputElement) &&
            !(target instanceof HTMLTextAreaElement)
          ) {
            editorDom.focus({ preventScroll: true });
          }
        },
        true,
      );

      clearButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!editor.isEditable || strokes.length === 0) {
          return;
        }
        commitStrokes([]);
      });

      fingerButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        allowFinger = !allowFinger;
        updateToolbarState();
      });

      const readFile = (file: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });

      const loadImage = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Image illisible'));
          img.src = src;
        });

      // L'image est réduite (1024 px max, JPEG) pour garder un document léger.
      const insertImage = async (file: File) => {
        if (!editor.isEditable) {
          return;
        }
        try {
          const img = await loadImage(await readFile(file));
          const ratio = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight));
          const reduced = document.createElement('canvas');
          reduced.width = Math.max(1, Math.round(img.naturalWidth * ratio));
          reduced.height = Math.max(1, Math.round(img.naturalHeight * ratio));
          const reducedContext = reduced.getContext('2d');
          if (!reducedContext) {
            return;
          }
          reducedContext.fillStyle = '#ffffff';
          reducedContext.fillRect(0, 0, reduced.width, reduced.height);
          reducedContext.drawImage(img, 0, 0, reduced.width, reduced.height);
          const src = reduced.toDataURL('image/jpeg', 0.82);

          let width = Math.min(logicalWidth * 0.5, img.naturalWidth);
          let height = (width * img.naturalHeight) / img.naturalWidth;
          if (height > logicalHeight * 0.8) {
            height = logicalHeight * 0.8;
            width = (height * img.naturalWidth) / img.naturalHeight;
          }
          const x = Math.round((logicalWidth - width) / 2);
          const y = Math.round((logicalHeight - height) / 2);

          selectTool('lasso');
          commitStrokes(
            [
              ...strokes,
              {
                color: '#000000',
                size: 0,
                tool: 'image',
                src,
                points: [
                  { x, y },
                  { x: x + width, y: y + height },
                ],
              },
            ],
            true,
          );
          selection = [strokes.length - 1];
          redraw();
        } catch {
          // fichier illisible : on ignore
        }
      };

      imageTool.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setShapeMenuOpen(false);
        imageInput.click();
      });

      imageInput.addEventListener('change', () => {
        const file = imageInput.files?.[0];
        imageInput.value = '';
        if (file) {
          void insertImage(file);
        }
      });

      noFillButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        shapeFill = null;
        updateToolbarState();
        scheduleSelectionFill();
      });

      autoFillButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        shapeFill = 'auto';
        updateToolbarState();
        scheduleSelectionFill();
      });

      fillColorInput.addEventListener('input', () => {
        shapeFillColor = fillColorInput.value;
        shapeFill = shapeFillColor;
        updateToolbarState();
        scheduleSelectionFill();
      });

      patternButtons.forEach(({ button, pattern }) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          shapeFillPattern = pattern;
          if (shapeFill === null) {
            shapeFill = 'auto';
          }
          // Une trame est plus lisible avec un remplissage plus marqué que le plein translucide.
          if (pattern !== 'solid' && shapeFillAlpha < 0.5) {
            shapeFillAlpha = 0.8;
            alphaInput.value = '80';
            alphaLabel.textContent = '80%';
          }
          updateToolbarState();
          scheduleSelectionFill();
        });
      });

      swatchButtons.forEach(({ swatch, color: swatchColor }) => {
        swatch.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          shapeFill = swatchColor;
          shapeFillColor = swatchColor;
          fillColorInput.value = swatchColor;
          updateToolbarState();
          scheduleSelectionFill();
        });
      });

      fillTool.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setPageStyleMenuOpen(false);
        setEraserSizePopupOpen(false);
        setFillMenuOpen(!isFillMenuOpen);
        updateToolbarState();
      });

      gapInput.addEventListener('input', () => {
        shapeFillGap = Number(gapInput.value);
        gapLabel.textContent = `${gapInput.value}px`;
        if (shapeFill === null) {
          shapeFill = 'auto';
          updateToolbarState();
        }
        scheduleSelectionFill();
      });

      alphaInput.addEventListener('input', () => {
        shapeFillAlpha = Number(alphaInput.value) / 100;
        alphaLabel.textContent = `${alphaInput.value}%`;
        if (shapeFill === null) {
          shapeFill = 'auto';
          updateToolbarState();
        }
        scheduleSelectionFill();
      });

      laserTool.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectTool('laser');
        setShapeMenuOpen(false);
        updateToolbarState();
      });

      rulerTool.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        ruler.active = !ruler.active;
        if (ruler.active) {
          const frame = canvasArea.getBoundingClientRect();
          ruler.cx = board ? view.x + frame.width / 2 / view.zoom : logicalWidth / 2;
          ruler.cy = board ? view.y + frame.height / 2 / view.zoom : logicalHeight / 2;
        }
        renderOverlay();
        updateToolbarState();
      });

      newPageButton.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const pos = getPos();
        if (!editor.isEditable || typeof pos !== 'number') {
          return;
        }
        editor
          .chain()
          .insertContentAt(pos + currentNode.nodeSize, {
            type: this.name,
            attrs: {
              width: logicalWidth,
              height: logicalHeight,
              strokes: [],
              pageStyle: currentPageStyle,
            },
          })
          .run();
      });

      const onFullscreenKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && isFullscreen && !textEditor) {
          setFullscreen(false);
        }
      };

      const setFullscreen = (on: boolean) => {
        isFullscreen = on;
        if (on) {
          Object.assign(wrapper.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '1000',
            margin: '0',
            borderRadius: '0',
            maxWidth: 'none',
            overflow: board ? 'hidden' : 'auto',
          });
          Object.assign(toolbar.style, { position: 'sticky', top: '0', zIndex: '8' });
          document.addEventListener('keydown', onFullscreenKey);
          try {
            document.body.style.overflow = 'hidden';
          } catch {
            // ignoré
          }
          // La page prend au minimum toute la hauteur de l'écran.
          // (sans objet pour le tableau blanc, dont la hauteur suit l'écran)
          const cssScale = board ? Infinity : window.innerWidth / logicalWidth;
          const needed = Math.round((window.innerHeight - 120) / cssScale);
          if (needed > logicalHeight) {
            logicalHeight = Math.min(4000, needed);
            persist();
          }
        } else {
          Object.assign(wrapper.style, {
            position: '',
            inset: '',
            zIndex: '',
            margin: '12px 0',
            borderRadius: '8px',
            maxWidth: '100%',
            overflow: 'visible',
          });
          Object.assign(toolbar.style, { position: '', top: '', zIndex: '' });
          document.removeEventListener('keydown', onFullscreenKey);
          try {
            document.body.style.overflow = '';
          } catch {
            // ignoré
          }
        }
        fullscreenTool.iconEl.textContent = on ? 'fullscreen_exit' : 'fullscreen';
        redraw();
      };

      panTool.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectTool('pan');
        setShapeMenuOpen(false);
        updateToolbarState();
      });

      const zoomFromCenter = (factor: number) => {
        const rect = canvas.getBoundingClientRect();
        zoomAt(rect.width / 2, rect.height / 2, factor);
        redraw();
      };

      zoomOutButton.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        zoomFromCenter(1 / 1.25);
      });

      zoomInButton.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        zoomFromCenter(1.25);
      });

      zoomLabel.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        zoomFromCenter(1 / view.zoom);
      });

      fitButton.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        computeFitView();
        redraw();
      });

      fullscreenTool.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setFullscreen(!isFullscreen);
      });

      textTool.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectTool('text');
        setShapeMenuOpen(false);
        updateToolbarState();
      });

      lassoTool.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectTool('lasso');
        setShapeMenuOpen(false);
        updateToolbarState();
      });

      deleteSelectionButton.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        deleteSelection();
      });

      lockRatioButton.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        lockRatio = !lockRatio;
        updateToolbarState();
      });

      convertSelectionButton.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        convertSelectionToShapes();
      });

      fillSelectionButton.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        applyFillToSelection();
      });

      colorSelectionButton.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        applyColorToSelection();
      });

      copyButton.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        copySelection(false);
      });
      cutButton.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        copySelection(true);
      });
      pasteButton.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        pasteClipboard();
      });
      frontButton.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        reorderSelection(true);
      });
      backButton.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        reorderSelection(false);
      });
      dashButton.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        cycleDash();
      });
      exportButton.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        exportPng();
      });

      duplicateSelectionButton.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        duplicateSelection();
      });

      pipetteTool.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        currentTool = currentTool === 'pipette' ? lastDrawTool : 'pipette';
        selection = [];
        renderOverlay();
        updateToolbarState();
      });

      penTool.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (currentTool === 'pen') {
          penIndex = (penIndex + 1) % PEN_KINDS.length;
        }
        selectTool('pen');
        setShapeMenuOpen(false);
        updateToolbarState();
      });

      highlighterTool.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectTool('highlighter');
        setShapeMenuOpen(false);
        updateToolbarState();
      });

      shapeTool.button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectTool('shape');
        setShapeMenuOpen(!isShapeMenuOpen);
        updateToolbarState();
      });

      shapeButtons.forEach(({ button, option }) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          currentShape = option.value;
          selectTool('shape');
          setShapeMenuOpen(false);
          updateToolbarState();
        });
      });

      sizeButtons.forEach((button, index) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          currentSizeIndex = index;
          updateToolbarState();
        });
      });

      const resizeObserver = new ResizeObserver(() => redraw());
      resizeObserver.observe(canvasArea);
      resizeObserver.observe(toolbar);
      const onWindowResize = () => redraw();
      window.addEventListener('resize', onWindowResize);

      redraw();

      return {
        dom: wrapper,
        ignoreMutation: () => true,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) {
            return false;
          }

          currentNode = updatedNode;
          const nextWidth = Number(updatedNode.attrs['width']) || this.options.width;
          const nextHeight = Number(updatedNode.attrs['height']) || this.options.height;
          const nextStyle = parsePageStyle(updatedNode.attrs['pageStyle']);
          const nextStrokes = parseStrokes(updatedNode.attrs['strokes']);

          // Mise à jour provoquée par notre propre persist() : rien à repeindre.
          if (
            nextStrokes === strokes &&
            nextWidth === logicalWidth &&
            nextHeight === logicalHeight &&
            nextStyle === currentPageStyle
          ) {
            return true;
          }

          strokes = nextStrokes;
          history = [];
          future = [];
          selection = [];
          logicalWidth = nextWidth;
          logicalHeight = nextHeight;
          currentPageStyle = nextStyle;
          redraw();
          return true;
        },
        stopEvent: (event) => wrapper.contains(event.target as globalThis.Node),
        destroy: () => {
          if (viewTimer !== null) {
            clearTimeout(viewTimer);
          }
          if (activeDrawing === api) {
            activeDrawing = null;
          }
          resizeObserver.disconnect();
          window.removeEventListener('resize', onWindowResize);
          if (isFullscreen) {
            setFullscreen(false);
          }
          if (laserFrame !== null) {
            cancelAnimationFrame(laserFrame);
          }
        },
      };
    };
  },
});
