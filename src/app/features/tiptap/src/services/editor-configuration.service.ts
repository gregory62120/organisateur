import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Editor } from '@tiptap/core';
import {
  ATE_DEFAULT_BUBBLE_MENU_CONFIG,
  ATE_DEFAULT_SLASH_COMMANDS_CONFIG,
  ATE_DEFAULT_TOOLBAR_CONFIG,
  ATE_INITIAL_EDITOR_STATE,
  AteBubbleMenuConfig,
  AteEditorRegistry,
  AteI18nService,
  AteSlashCommandKey,
  AteSlashCommandsConfig,
  AteToolbarConfig,
} from '../../../../../../projects/angular-tiptap-editor/src/public-api';
import { EditorState, MenuState } from '../types/editor-config.types';
import { AppI18nService } from './app-i18n.service';
import { DocumentService } from '../../../../core/services/document.service';

@Injectable({
  providedIn: 'root',
})
export class EditorConfigurationService {
  private ateI18nService = inject(AteI18nService);
  private appI18nService = inject(AppI18nService);
  private registry = inject(AteEditorRegistry);
  private readonly documentService = inject(DocumentService);
  // Editor state
  private _editorState = signal<EditorState>({
    showSidebar: true,
    showCodeMode: false,
    isTransitioning: false,
    showToolbar: true,
    showFooter: true,
    showBubbleMenu: true,
    showCharacterCount: true,
    showWordCount: true,
    showImageBubbleMenu: true,
    showTableBubbleMenu: true,
    showCellBubbleMenu: true,
    enableSlashCommands: true,
    placeholder: 'Start typing...',
    locale: undefined,
    // Height configuration
    minHeight: undefined,
    height: undefined,
    maxHeight: undefined,
    fillContainer: true,
    // Autofocus configuration
    autofocus: false,
    darkMode: false,
    activePanel: 'none',
    showInspector: false,
    enableTaskExtension: true,
    maxCharacters: undefined,
    editable: true,
    seamless: false,
    notionMode: true,
    floatingToolbar: true,
    disabled: false,
    showEditToggle: false,
    blockControls: 'inside',
  });

  private _isEditorHovered = signal<boolean>(false);
  readonly isEditorHovered = this._isEditorHovered.asReadonly();

  // Menu state
  private _menuState = signal<MenuState>({
    showToolbarMenu: false,
    showBubbleMenuMenu: false,
    showSlashCommandsMenu: false,
    showHeightMenu: false,
  });

  // Editor content (HTML — source of truth, updated on every contentChange)
  private _demoContent = signal('<p></p>');

  // Configurations - utilisent les configurations par défaut de la librairie
  private _toolbarConfig = signal<Partial<AteToolbarConfig>>(ATE_DEFAULT_TOOLBAR_CONFIG);
  private _bubbleMenuConfig = signal<Partial<AteBubbleMenuConfig>>(ATE_DEFAULT_BUBBLE_MENU_CONFIG);
  // Changed _activeSlashCommands to _slashCommandsConfig and initialized with DEFAULT_SLASH_COMMANDS_CONFIG
  private _nativeSlashCommands = signal<Partial<AteSlashCommandsConfig>>(
    ATE_DEFAULT_SLASH_COMMANDS_CONFIG,
  );
  private _isMagicTemplateEnabled = signal<boolean>(false);
  private _magicTemplateTitle = signal<string>('');
  private _isAiBubbleMenuEnabled = signal<boolean>(false);
  private _isAiBlockEnabled = signal<boolean>(false);
  private _isWarningBoxEnabled = signal<boolean>(false);

  // Signaux publics (lecture seule)
  readonly editorState = this._editorState.asReadonly();
  readonly menuState = this._menuState.asReadonly();
  readonly demoContent = this._demoContent.asReadonly();
  readonly isAiBlockEnabled = this._isAiBlockEnabled.asReadonly();

  // Live reactive content signals — _demoContent est la source de vérité (HTML)
  readonly liveHtml = this._demoContent.asReadonly();
  readonly liveMarkdown = computed(() => {
    this._demoContent(); // reactive trigger
    this.liveEditorState(); // reactive trigger when editor updates
    const editorRef = this.registry.get();
    if (!editorRef) {
      return '';
    }
    return editorRef.getContent('markdown');
  });
  readonly isWarningBoxEnabled = this._isWarningBoxEnabled.asReadonly();

  // Slash commands config is now computed to be reactive to translations
  readonly slashCommandsConfig = computed<AteSlashCommandsConfig>(() => {
    const natives = this._nativeSlashCommands();
    const isMagicEnabled = this._isMagicTemplateEnabled();
    const isAiBlockActive = this._isAiBlockEnabled();

    const customs = [];

    // AI Block Command
    if (isAiBlockActive) {
      const t = this.appI18nService.translations().items;
      customs.push({
        title: t.customAi,
        description: t.customAiDesc,
        icon: 'psychology',
        keywords: ['ai', 'assistant', 'generate'],
        command: (editor: Editor) => {
          editor.commands.insertContent({ type: 'aiBlock' });
        },
      });
    }

    if (isMagicEnabled) {
      const t = this.appI18nService.translations().items;
      const customTitle = this._magicTemplateTitle() || t.customMagicTitle;
      customs.push({
        title: customTitle,
        description: t.customMagicDesc,
        icon: 'auto_awesome',
        keywords: ['magic', 'template', 'structure'],
        command: (editor: Editor) => {
          editor.commands.insertContent(
            `<h3>✨ ${customTitle}</h3><p>This was inserted by a <strong>custom command</strong> using the <em>native editor API</em>!</p>`,
          );
        },
      });
    }

    // Warning Box Example (Approach 2: Standard Angular component)
    if (this._isWarningBoxEnabled()) {
      const t = this.appI18nService.translations().items;
      customs.push({
        title: t.warningBox,
        description: t.warningBoxDesc,
        icon: 'warning',
        keywords: ['warning', 'box'],
        command: (editor: Editor) => {
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'warningBox',
              content: [{ type: 'text', text: 'Attention ! Ceci est un avertissement...' }],
            })
            .run();
        },
      });
    }

    // Task is only there if extension is enabled
    if (this._editorState().enableTaskExtension) {
      const et = this.appI18nService.translations().items;
      customs.push({
        title: et.task,
        description: et.taskDesc,
        icon: 'task_alt',
        keywords: ['task', 'custom', 'node'],
        command: (editor: Editor) => {
          editor
            .chain()
            .focus()
            .insertContent(
              '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"></li></ul>',
            )
            .run();
        },
      });
    }

    customs.push({
      title: 'Dessin',
      description: 'Insérer une zone de dessin',
      icon: 'draw',
      keywords: ['dessin', 'drawing', 'canvas', 'croquis', 'schema'],
      command: (editor: Editor) => {
        editor.chain().focus().insertDrawing().run();
      },
    });

    customs.push({
      title: 'Nouvelle page',

      description: 'Créer une sous-page liée',

      icon: 'article',

      keywords: ['page', 'document', 'sous-page', 'nouvelle page'],

      command: (editor: Editor) => {
        const page = this.documentService.createChildOfCurrentPage();

        editor
          .chain()
          .focus()
          .setLink({
            href: `/document/${page.id}`,
            target: null,
          })
          .insertContent('📄 Nouvelle page')
          .run();
      },
    });

    // customs.push({
    //   title: 'Nouvelle page',

    //   description: 'Créer une sous-page liée',

    //   icon: 'article',

    //   keywords: ['page', 'document', 'sous-page', 'nouvelle page'],

    //   command: (editor: Editor) => {
    //     const page = this.documentService.createChildOfCurrentPage();

    //     editor
    //       .chain()
    //       .focus()
    //       .setLink({
    //         href: `/document/${page.id}`,
    //         target: null,
    //       })
    //       .insertContent('📄 Nouvelle page')
    //       .run();
    //   },
    // });

    return {
      ...natives,
      custom: customs,
    } as AteSlashCommandsConfig;
  });

  // Bubble Menu with custom AI transformer button
  readonly bubbleMenuConfig = computed(() => {
    const base = this._bubbleMenuConfig();
    const isAiEnabled = this._isAiBubbleMenuEnabled();
    const t = this.appI18nService.translations().items;

    const config = { ...base };

    return config as AteBubbleMenuConfig;
  });

  // Toolbar with custom AI generator button
  readonly toolbarConfig = computed(() => {
    const base = this._toolbarConfig();
    const t = this.appI18nService.translations().items;

    const config = { ...base };

    return config as AteToolbarConfig;
  });

  readonly toolbarActiveCount = computed(() => {
    const config = this._toolbarConfig();
    const count = Object.values(config).filter((v) => typeof v === 'boolean' && v).length;
    return count;
  });

  readonly bubbleMenuActiveCount = computed(() => {
    const config = this._bubbleMenuConfig();
    const count = Object.values(config).filter((v) => typeof v === 'boolean' && v).length;
    return count + (this._isAiBubbleMenuEnabled() ? 1 : 0);
  });

  readonly slashCommandsActiveCount = computed(() => {
    const natives = this._nativeSlashCommands();
    const isMagicEnabled = this._isMagicTemplateEnabled();
    const isAiBlockEnabled = this._isAiBlockEnabled();
    const nativeCount = Object.values(natives).filter(Boolean).length;
    return nativeCount + (isMagicEnabled ? 1 : 0) + (isAiBlockEnabled ? 1 : 0);
  });

  constructor() {
    // Update content when language changes
    effect(
      () => {
        // Re-trigger when language changes
        const locale = this.ateI18nService.currentLocale();

        this._editorState.update((state) => ({
          ...state,
          locale: locale === 'fr' ? 'fr' : undefined,
        }));
      },
      { allowSignalWrites: true },
    );

    // Update editor placeholder based on language
    effect(
      () => {
        const editorTranslations = this.ateI18nService.editor();
        this._editorState.update((state) => ({
          ...state,
          placeholder: editorTranslations.placeholder,
        }));
      },
      { allowSignalWrites: true },
    );
  }

  toggleAiBlockExample(enabled: boolean) {
    this._isAiBlockEnabled.set(enabled);
  }

  toggleWarningBoxExample(enabled: boolean) {
    this._isWarningBoxEnabled.set(enabled);
  }

  // Methods for editor state
  updateEditorState(partialState: Partial<EditorState>) {
    this._editorState.update((state) => ({ ...state, ...partialState }));
  }

  setEditorHovered(hovered: boolean) {
    this._isEditorHovered.set(hovered);
  }

  updateMenuState(partialState: Partial<MenuState>) {
    this._menuState.update((state) => ({ ...state, ...partialState }));
  }

  updateDemoContent(content: string) {
    this._demoContent.set(content);
  }

  // Methods for configurations
  toggleToolbarItem(key: string) {
    this._toolbarConfig.update((config) => ({
      ...config,
      [key]: !(config as Record<string, boolean>)[key],
    }));
  }

  setActivePanel(panel: 'none' | 'config' | 'theme') {
    this._editorState.update((state) => ({
      ...state,
      activePanel: panel,
      showSidebar: panel === 'config',
    }));
  }

  togglePanel(panel: 'config' | 'theme') {
    const current = this._editorState().activePanel;
    if (current === panel) {
      this.setActivePanel('none');
    } else {
      this.setActivePanel(panel);
    }
  }

  toggleBubbleMenuItem(key: string) {
    if (key === 'custom_ai') {
      this._isAiBubbleMenuEnabled.update((v) => !v);
      return;
    }
    this._bubbleMenuConfig.update((config) => ({
      ...config,
      [key]: !(config as Record<string, boolean>)[key],
    }));
  }

  // Updated toggleSlashCommand to work with separate states
  toggleSlashCommand(key: string) {
    if (key === 'custom_magic') {
      this._isMagicTemplateEnabled.update((v) => !v);
      return;
    }

    if (key === 'warningBox') {
      this._isWarningBoxEnabled.update((v) => !v);
      return;
    }

    this._nativeSlashCommands.update((config) => ({
      ...config,
      [key as AteSlashCommandKey]: !config[key as AteSlashCommandKey],
    }));
  }

  // Verification methods
  isToolbarItemActive(key: string): boolean {
    const config = this._toolbarConfig() as Record<string, boolean>;
    return !!config[key];
  }

  isBubbleMenuItemActive(key: string): boolean {
    if (key === 'custom_ai') {
      return this._isAiBubbleMenuEnabled();
    }
    const config = this._bubbleMenuConfig() as Record<string, boolean>;
    return !!config[key];
  }

  // Updated isSlashCommandActive to work with separate states
  isSlashCommandActive(key: string): boolean {
    if (key === 'custom_magic') {
      return this._isMagicTemplateEnabled();
    }
    if (key === 'custom_ai_block') {
      return this._isAiBlockEnabled();
    }
    if (key === 'warningBox') {
      return this._isWarningBoxEnabled();
    }
    return !!this._nativeSlashCommands()[key as AteSlashCommandKey];
  }

  // Magic template title management
  readonly magicTemplateTitle = computed(() => {
    return this._magicTemplateTitle() || this.appI18nService.translations().items.customMagicTitle;
  });

  updateMagicTemplateTitle(title: string) {
    this._magicTemplateTitle.set(title);
  }

  // Height configuration methods
  toggleHeightItem(key: string) {
    switch (key) {
      case 'enableScroll':
        // Activer le scroll en définissant une hauteur max par défaut
        this._editorState.update((state) => ({
          ...state,
          maxHeight: state.maxHeight ? undefined : 400,
        }));
        break;
      case 'fixedHeight':
        // Toggle between fixed height and auto
        this._editorState.update((state) => ({
          ...state,
          height: state.height ? undefined : 300,
        }));
        break;
      case 'maxHeight':
        // Toggle between max height and none
        this._editorState.update((state) => ({
          ...state,
          maxHeight: state.maxHeight ? undefined : 400,
        }));
        break;
    }
  }

  isHeightItemActive(key: string): boolean {
    const state = this._editorState();

    switch (key) {
      case 'enableScroll':
        // Le scroll est actif si on a une hauteur ou hauteur max
        return state.height !== undefined || state.maxHeight !== undefined;
      case 'fixedHeight':
        return state.height !== undefined;
      case 'maxHeight':
        return state.maxHeight !== undefined;
      default:
        return false;
    }
  }

  // Fill container toggle
  toggleFillContainer() {
    this._editorState.update((state) => ({
      ...state,
      fillContainer: !state.fillContainer,
    }));
  }

  // Dark mode toggle
  toggleDarkMode() {
    this._editorState.update((state) => ({
      ...state,
      darkMode: !state.darkMode,
    }));
  }

  // Seamless mode toggle
  toggleSeamless() {
    this._editorState.update((state) => ({
      ...state,
      seamless: !state.seamless,
    }));
  }

  // Footer toggle
  toggleFooter() {
    this._editorState.update((state) => ({
      ...state,
      showFooter: !state.showFooter,
    }));
  }

  // Inspector toggle
  toggleInspector() {
    this._editorState.update((state) => ({
      ...state,
      showInspector: !state.showInspector,
    }));
  }

  toggleEnableTaskExtension() {
    this._editorState.update((state) => ({
      ...state,
      enableTaskExtension: !state.enableTaskExtension,
    }));
  }

  // Menu closing methods
  closeAllMenus() {
    this._menuState.set({
      showToolbarMenu: false,
      showBubbleMenuMenu: false,
      showSlashCommandsMenu: false,
      showHeightMenu: false,
    });
  }

  // Exporter le contenu
  async exportContent(
    format: 'html' | 'markdown' | 'text',
    method: 'clipboard' | 'download',
  ): Promise<boolean> {
    const editorRef = this.registry.get();
    if (!editorRef) {
      return false;
    }
    try {
      await editorRef.exportAs(format, method);
      return true;
    } catch {
      return false;
    }
  }

  // Live reactive state from the global registry
  readonly liveEditorState = computed(() => {
    const editorRef = this.registry.get();
    return editorRef ? editorRef.stateSignal() : ATE_INITIAL_EDITOR_STATE;
  });
}
