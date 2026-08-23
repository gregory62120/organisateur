import { mergeAttributes, Node } from '@tiptap/core';

interface DrawingPoint {
  x: number;
  y: number;
}

interface DrawingStroke {
  color: string;
  size: number;
  tool?: 'pen' | 'eraser';
  points: DrawingPoint[];
}

type DrawingPageStyle =
  | 'blank'
  | 'seyes'
  | 'seyesMargin'
  | 'smallGrid'
  | 'largeGrid'
  | 'ruled'
  | 'largeRuled';

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

export const Drawing = Node.create<DrawingOptions>({
  name: 'drawing',

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
      colors: ['#111827', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7'],
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
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let currentNode = node;
      let strokes = parseStrokes(currentNode.attrs['strokes']);
      let currentStroke: DrawingStroke | null = null;
      let isDrawing = false;
      let currentColor = this.options.color;
      let currentTool: 'pen' | 'eraser' = 'pen';
      let currentEraserSize = this.options.eraserSize;
      let currentPageStyle = parsePageStyle(currentNode.attrs['pageStyle']);
      let lastEraserClickAt = 0;
      let isEraserSizePopupOpen = false;
      let isPageStyleMenuOpen = false;
      let lastPointerEvent: PointerEvent | null = null;
      let isResizing = false;
      let resizeStartY = 0;
      let resizeStartHeight = 0;

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
          currentTool = 'pen';
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
      pageStyleMenu.style.boxShadow =
        'var(--ate-menu-shadow, 0 10px 15px -3px rgba(0, 0, 0, 0.1))';
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
      eraserSizeControl.style.gap = '6px';
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
      eraserSizeControl.style.boxShadow = 'var(--ate-menu-shadow, 0 10px 15px -3px rgba(0, 0, 0, 0.1))';
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

      eraserSizeControl.append(eraserSizeInput, eraserSizeLabel);
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

      [pageStyleButton, eraserButton, undoButton, clearButton].forEach((button) => {
        button.style.border = '1px solid var(--ate-border, #e2e8f0)';
        button.style.borderRadius = '6px';
        button.style.background = 'var(--ate-surface, #ffffff)';
        button.style.color = 'var(--ate-text, #2d3748)';
        button.style.padding = '4px 8px';
        button.style.fontSize = '12px';
        button.style.cursor = 'pointer';
      });
      pageStyleButton.style.display = 'inline-flex';
      pageStyleButton.style.alignItems = 'center';
      pageStyleButton.style.justifyContent = 'center';
      pageStyleButton.style.width = '30px';
      pageStyleButton.style.height = '30px';
      pageStyleButton.style.padding = '0';
      eraserButton.style.display = 'inline-flex';
      eraserButton.style.alignItems = 'center';
      eraserButton.style.justifyContent = 'center';
      eraserButton.style.width = '30px';
      eraserButton.style.height = '30px';
      eraserButton.style.padding = '0';

      controls.append(palette, pageStyleWrapper, eraserToolWrapper);
      actions.append(undoButton, clearButton);
      toolbar.append(label, controls, actions);

      const canvasArea = document.createElement('div');
      canvasArea.style.position = 'relative';
      canvasArea.style.overflow = 'hidden';

      const canvas = document.createElement('canvas');
      canvas.width = Number(currentNode.attrs['width']) || this.options.width;
      canvas.height = Number(currentNode.attrs['height']) || this.options.height;
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      canvas.style.touchAction = 'none';
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
      eraserCursor.style.background = 'color-mix(in srgb, var(--ate-primary, #2563eb), transparent 88%)';
      eraserCursor.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.85)';
      eraserCursor.style.pointerEvents = 'none';
      eraserCursor.style.opacity = '0';
      eraserCursor.style.transform = 'translate(-50%, -50%)';
      eraserCursor.style.zIndex = '2';

      canvasArea.append(canvas, eraserCursor);

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

      wrapper.append(toolbar, canvasArea, resizeHandle);

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

      const resizeCanvasHeight = (height: number) => {
        const minHeight = 180;
        const maxHeight = 1200;
        canvas.height = Math.min(maxHeight, Math.max(minHeight, Math.round(height)));
        redraw();
      };

      const applyPageStyle = () => {
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
          case 'blank':
          default:
            break;
        }
      };

      const updateEraserCursor = (event: PointerEvent | null = lastPointerEvent) => {
        if (!event || !editor.isEditable || currentTool !== 'eraser') {
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

        const displaySize = currentEraserSize * (rect.width / canvas.width);
        eraserCursor.style.width = `${displaySize}px`;
        eraserCursor.style.height = `${displaySize}px`;
        eraserCursor.style.opacity = '1';
        eraserCursor.style.left = `${x}px`;
        eraserCursor.style.top = `${y}px`;
      };

      const updateToolbarState = () => {
        const disabled = !editor.isEditable;
        pageStyleButton.disabled = disabled;
        eraserButton.disabled = disabled;
        eraserSizeInput.disabled = disabled;
        undoButton.disabled = disabled || strokes.length === 0;
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
          currentTool === 'eraser'
            ? 'var(--ate-primary, #2563eb)'
            : 'var(--ate-border, #e2e8f0)';
        currentColorPreview.style.background = currentColor;
        pageStyleIcon.textContent =
          PAGE_STYLE_OPTIONS.find((option) => option.value === currentPageStyle)?.icon ??
          'article';
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
            currentTool === 'pen' && paletteColor === currentColor
              ? '0 0 0 2px var(--ate-primary, #2563eb)'
              : 'none';
          button.style.opacity = disabled ? '0.45' : '1';
          button.disabled = disabled;
        });
        colorPicker.disabled = disabled;
        colorPickerLabel.style.opacity = disabled ? '0.45' : '1';
        canvas.style.cursor = editor.isEditable
          ? currentTool === 'eraser'
            ? 'none'
            : 'crosshair'
          : 'default';
        updateEraserCursor();
      };

      const drawStroke = (stroke: DrawingStroke) => {
        if (!context || stroke.points.length < 2) {
          return;
        }

        context.save();
        context.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
        context.strokeStyle = stroke.color;
        context.lineWidth = stroke.size;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.beginPath();
        context.moveTo(stroke.points[0].x, stroke.points[0].y);

        stroke.points.slice(1).forEach((point) => {
          context.lineTo(point.x, point.y);
        });

        context.stroke();
        context.restore();
      };

      const redraw = () => {
        if (!context) {
          return;
        }

        applyPageStyle();
        context.clearRect(0, 0, canvas.width, canvas.height);
        strokes.forEach(drawStroke);
        if (currentStroke) {
          drawStroke(currentStroke);
        }
        updateToolbarState();
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
              height: canvas.height,
            });
          }
          return true;
        });
      };

      const pointFromEvent = (event: PointerEvent): DrawingPoint => {
        const rect = canvas.getBoundingClientRect();
        return {
          x: ((event.clientX - rect.left) / rect.width) * canvas.width,
          y: ((event.clientY - rect.top) / rect.height) * canvas.height,
        };
      };

      const startDrawing = (event: PointerEvent) => {
        if (!editor.isEditable || event.button !== 0) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        const pos = getPos();
        if (typeof pos === 'number') {
          editor.commands.setNodeSelection(pos);
        }
        isDrawing = true;
        currentStroke = {
          color: currentTool === 'eraser' ? '#000000' : currentColor,
          size: currentTool === 'eraser' ? currentEraserSize : this.options.size,
          tool: currentTool,
          points: [pointFromEvent(event)],
        };
        canvas.setPointerCapture(event.pointerId);
        redraw();
      };

      const continueDrawing = (event: PointerEvent) => {
        if (!isDrawing || !currentStroke) {
          return;
        }

        event.preventDefault();
        currentStroke.points.push(pointFromEvent(event));
        redraw();
      };

      const stopDrawing = (event: PointerEvent) => {
        if (!isDrawing || !currentStroke) {
          return;
        }

        event.preventDefault();
        isDrawing = false;
        if (currentStroke.points.length > 1) {
          strokes = [...strokes, currentStroke];
          persist();
        }
        currentStroke = null;
        redraw();
      };

      const startResize = (event: PointerEvent) => {
        if (!editor.isEditable || event.button !== 0) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        isResizing = true;
        resizeStartY = event.clientY;
        resizeStartHeight = canvas.height;
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
        const scale = canvas.height / rect.height;
        resizeCanvasHeight(resizeStartHeight + (event.clientY - resizeStartY) * scale);
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
      canvas.addEventListener('pointercancel', stopDrawing);
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
      resizeHandle.addEventListener('pointerdown', startResize);
      resizeHandle.addEventListener('pointermove', continueResize);
      resizeHandle.addEventListener('pointerup', stopResize);
      resizeHandle.addEventListener('pointercancel', stopResize);

      colorPicker.addEventListener('input', (event) => {
        const input = event.target as HTMLInputElement;
        currentColor = input.value;
        currentTool = 'pen';
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
        const clickAt = Date.now();
        const isDoublePress = clickAt - lastEraserClickAt < 320;
        lastEraserClickAt = clickAt;

        if (isDoublePress) {
          currentTool = 'eraser';
          setPageStyleMenuOpen(false);
          setEraserSizePopupOpen(!isEraserSizePopupOpen);
          lastEraserClickAt = 0;
        } else {
          currentTool = currentTool === 'eraser' ? 'pen' : 'eraser';
          setEraserSizePopupOpen(false);
        }
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

      undoButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!editor.isEditable || strokes.length === 0) {
          return;
        }
        strokes = strokes.slice(0, -1);
        persist();
        redraw();
      });

      clearButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!editor.isEditable || strokes.length === 0) {
          return;
        }
        strokes = [];
        persist();
        redraw();
      });

      redraw();

      return {
        dom: wrapper,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) {
            return false;
          }

          currentNode = updatedNode;
          strokes = parseStrokes(currentNode.attrs['strokes']);
          currentPageStyle = parsePageStyle(currentNode.attrs['pageStyle']);
          canvas.width = Number(currentNode.attrs['width']) || this.options.width;
          canvas.height = Number(currentNode.attrs['height']) || this.options.height;
          redraw();
          return true;
        },
        stopEvent: (event) => wrapper.contains(event.target as globalThis.Node),
        destroy: () => {
          canvas.removeEventListener('pointerdown', startDrawing);
          canvas.removeEventListener('pointermove', continueDrawing);
          canvas.removeEventListener('pointerup', stopDrawing);
          canvas.removeEventListener('pointercancel', stopDrawing);
        },
      };
    };
  },
});
