import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import OfficePaste from '@intevation/tiptap-extension-office-paste';
import {
  Editor,
  EditorOptions,
  Extension,
  Extensions,
  JSONContent,
  Mark,
  Node,
} from '@tiptap/core';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import { Node as PMNode } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';

import { Injector, Type } from '@angular/core';
import { NgControl } from '@angular/forms';
import { ATE_GLOBAL_CONFIG } from '../../config/ate-global-config.token';
import {
  AteSlashCommandsConfig,
  filterSlashCommands,
} from '../../config/ate-slash-commands.config';
import { AteNoopValueAccessorDirective } from '../../directives/ate-noop-value-accessor.directive';
import { AteResizableImage } from '../../extensions/ate-resizable-image.extension';
import { AteTableExtension } from '../../extensions/ate-table.extension';
import { AteTiptapStateExtension } from '../../extensions/ate-tiptap-state.extension';
import { AteUploadProgress } from '../../extensions/ate-upload-progress.extension';
import { AteStateCalculator } from '../../models/ate-editor-state.model';
import { AteCustomSlashCommands } from '../../models/ate-slash-command.model';
import { RegisterAngularComponentOptions } from '../../node-view/ate-node-view.models';
import { registerAngularComponent } from '../../node-view/ate-register-angular-component';
import { AteColorPickerService } from '../../services/ate-color-picker.service';
import { AteEditorCommandsService } from '../../services/ate-editor-commands.service';
import { AteEditorRegistry } from '../../services/ate-editor-registry.service';
import { AteExportService } from '../../services/ate-export.service';
import { AteI18nService, SupportedLocale } from '../../services/ate-i18n.service';
import { AteImageService } from '../../services/ate-image.service';
import { AteLinkService } from '../../services/ate-link.service';
import { AteColorBubbleMenuComponent } from '../bubble-menus/color/ate-color-bubble-menu.component';
import { AteImageBubbleMenuComponent } from '../bubble-menus/image/ate-image-bubble-menu.component';
import { AteLinkBubbleMenuComponent } from '../bubble-menus/link/ate-link-bubble-menu.component';
import { AteCellBubbleMenuComponent } from '../bubble-menus/table/ate-cell-bubble-menu.component';
import { AteTableBubbleMenuComponent } from '../bubble-menus/table/ate-table-bubble-menu.component';
import { AteBubbleMenuComponent } from '../bubble-menus/text/ate-bubble-menu.component';
import { AteEditToggleComponent } from '../edit-toggle/ate-edit-toggle.component';
import { AteSlashCommandsComponent } from '../slash-commands/ate-slash-commands.component';
import { AteToolbarComponent } from '../toolbar/ate-toolbar.component';
import { AteBlockControlsComponent } from './ate-block-controls.component';

import { AteDiscoveryCalculator } from '../../extensions/calculators/ate-discovery.calculator';
import { AteImageCalculator } from '../../extensions/calculators/ate-image.calculator';
import { AteMarksCalculator } from '../../extensions/calculators/ate-marks.calculator';
import { AteSelectionCalculator } from '../../extensions/calculators/ate-selection.calculator';
import { AteStructureCalculator } from '../../extensions/calculators/ate-structure.calculator';
import { AteTableCalculator } from '../../extensions/calculators/ate-table.calculator';

import { Router } from '@angular/router';
import { concat, defer, Observable, of, tap } from 'rxjs';
import { DocumentService } from '../../../../../../src/app/core/services/document.service';
import {
  ATE_DEFAULT_BUBBLE_MENU_CONFIG,
  ATE_DEFAULT_CELL_MENU_CONFIG,
  ATE_DEFAULT_CONFIG,
  ATE_DEFAULT_IMAGE_BUBBLE_MENU_CONFIG,
  ATE_DEFAULT_IMAGE_UPLOAD_CONFIG,
  ATE_DEFAULT_TABLE_MENU_CONFIG,
  ATE_DEFAULT_TOOLBAR_CONFIG,
} from '../../config/ate-editor.config';
import { AteBlockControlsExtension } from '../../extensions/ate-block-controls.extension';
import { AteLinkClickBehavior } from '../../extensions/ate-link-click-behavior.extension';
import {
  AteBubbleMenuConfig,
  AteCellBubbleMenuConfig,
  AteImageBubbleMenuConfig,
  AteTableBubbleMenuConfig,
} from '../../models/ate-bubble-menu.model';
import {
  AteAngularNode,
  AteAutofocusMode,
  AteBlockControlsMode,
  AteEditorConfig,
} from '../../models/ate-editor-config.model';
import {
  AteImageUploadHandler,
  AteImageUploadOptions,
  AteImageUploadResult,
} from '../../models/ate-image.model';
import { AteToolbarConfig } from '../../models/ate-toolbar.model';

// Slash commands configuration is handled dynamically via slashCommandsConfigComputed

/**
 * The main rich-text editor component for Angular.
 *
 * Powered by Tiptap and built with a native Signal-based architecture, it provides
 * a seamless, high-performance editing experience. Supports automatic registration
 * of Angular components as interactive nodes ('Angular Nodes'), full Reactive Forms
 * integration, and extensive customization via the AteEditorConfig.
 */
@Component({
  selector: 'angular-tiptap-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [AteNoopValueAccessorDirective],
  host: {
    '[class.fill-container]': 'finalFillContainer()',
    '[class.floating-toolbar]': 'finalFloatingToolbar()',
    '[class.is-readonly]': '!finalEditable() && !mergedDisabled()',
    '[class.is-disabled]': 'mergedDisabled()',
    '[style.--ate-border-width]': "finalSeamless() || mergedDisabled() ? '0' : null",
    '[style.--ate-background]':
      "finalSeamless() ? 'transparent' : (mergedDisabled() ? 'var(--ate-surface-tertiary)' : null)",
    '[style.--ate-toolbar-border-color]': "finalSeamless() ? 'transparent' : null",
    '[style.--ate-counter-background]': "finalSeamless() ? 'transparent' : null",
    '[style.--ate-counter-border-color]': "finalSeamless() ? 'transparent' : null",
    '[class.dark]': "config().theme === 'dark'",
    '[class.ate-blocks-inside]': "finalBlockControls() === 'inside'",
    '[class.ate-blocks-outside]': "finalBlockControls() === 'outside'",
    '[attr.data-theme]': 'config().theme',
  },
  imports: [
    AteToolbarComponent,
    AteBubbleMenuComponent,
    AteImageBubbleMenuComponent,
    AteTableBubbleMenuComponent,
    AteCellBubbleMenuComponent,
    AteSlashCommandsComponent,
    AteLinkBubbleMenuComponent,
    AteColorBubbleMenuComponent,
    AteEditToggleComponent,
    AteBlockControlsComponent,
  ],
  providers: [
    AteEditorCommandsService,
    AteImageService,
    AteColorPickerService,
    AteLinkService,
    AteExportService,
  ],
  templateUrl: './angular-tiptap-editor.component.html',
  styleUrl: './angular-tiptap-editor.component.scss',
})
export class AngularTiptapEditorComponent implements AfterViewInit, OnDestroy {
  /** Configuration globale de l'éditeur */
  config = input<AteEditorConfig>({});

  content = input<string>('');
  placeholder = input<string | undefined>(undefined);
  editable = input<boolean | undefined>(undefined);
  disabled = input<boolean | undefined>(undefined);
  minHeight = input<number | string | undefined>(undefined);
  height = input<number | string | undefined>(undefined);
  maxHeight = input<number | string | undefined>(undefined);
  fillContainer = input<boolean | undefined>(undefined);
  showToolbar = input<boolean | undefined>(undefined);
  showFooter = input<boolean | undefined>(undefined);
  showCharacterCount = input<boolean | undefined>(undefined);
  showWordCount = input<boolean | undefined>(undefined);
  maxCharacters = input<number | undefined>(undefined);
  enableOfficePaste = input<boolean | undefined>(undefined);
  enableSlashCommands = input<boolean | undefined>(undefined);
  slashCommands = input<AteSlashCommandsConfig | undefined>(undefined);
  customSlashCommands = input<AteCustomSlashCommands | undefined>(undefined);
  blockControls = input<AteBlockControlsMode>();
  locale = input<SupportedLocale | undefined>(undefined);
  autofocus = input<AteAutofocusMode | undefined>(undefined);
  seamless = input<boolean | undefined>(undefined);
  floatingToolbar = input<boolean | undefined>(undefined);
  showEditToggle = input<boolean | undefined>(undefined);
  spellcheck = input<boolean | undefined>(undefined);

  tiptapExtensions = input<(Extension | Node | Mark)[] | undefined>(undefined);
  tiptapOptions = input<Partial<EditorOptions> | undefined>(undefined);

  // Nouveaux inputs pour les bubble menus
  showBubbleMenu = input<boolean | undefined>(undefined);
  bubbleMenu = input<Partial<AteBubbleMenuConfig> | undefined>(undefined);
  showImageBubbleMenu = input<boolean | undefined>(undefined);
  imageBubbleMenu = input<Partial<AteImageBubbleMenuConfig> | undefined>(undefined);

  // Configuration de la toolbar
  toolbar = input<Partial<AteToolbarConfig> | undefined>(undefined);

  // Configuration des menus de table
  showTableBubbleMenu = input<boolean | undefined>(undefined);
  tableBubbleMenu = input<Partial<AteTableBubbleMenuConfig> | undefined>(undefined);
  showCellBubbleMenu = input<boolean | undefined>(undefined);
  cellBubbleMenu = input<Partial<AteCellBubbleMenuConfig> | undefined>(undefined);

  /**
   * Additionnal state calculators to extend the reactive editor state.
   */
  stateCalculators = input<AteStateCalculator[] | undefined>(undefined);

  // Nouveau input pour la configuration de l'upload d'images
  imageUpload = input<Partial<AteImageUploadOptions> | undefined>(undefined);

  /**
   * Custom handler for image uploads.
   * When provided, images will be processed through this handler instead of being converted to base64.
   * This allows you to upload images to your own server/storage and use the returned URL.
   *
   * @example
   * ```typescript
   * myUploadHandler: ImageUploadHandler = async (context) => {
   *   const formData = new FormData();
   *   formData.append('image', context.file);
   *   const response = await fetch('/api/upload', { method: 'POST', body: formData });
   *   const data = await response.json();
   *   return { src: data.imageUrl };
   * };
   *
   * // In template:
   * // <angular-tiptap-editor [imageUploadHandler]="myUploadHandler" />
   * ```
   */
  imageUploadHandler = input<AteImageUploadHandler | undefined>(undefined);

  /**
   * Optional unique identifier for the editor instance in the registry.
   * If not specified, a unique ID is automatically generated.
   */
  editorId = input<string | undefined>(undefined);

  // Nouveaux outputs
  contentChange = output<string>();
  editorCreated = output<Editor>();
  editorUpdate = output<{ editor: Editor; transaction: unknown }>();
  editorFocus = output<{ editor: Editor; event: FocusEvent }>();
  editorBlur = output<{ editor: Editor; event: FocusEvent }>();
  editableChange = output<boolean>();
  imageUploaded = output<AteImageUploadResult>();

  // ViewChild with signal
  editorElement = viewChild.required<ElementRef>('editorElement');

  // ============================================
  // Toolbar / Bubble Menu Coordination
  // ============================================
  hideBubbleMenus(): void {
    this.editorCommandsService.setToolbarInteracting(true);
  }

  showBubbleMenus(): void {
    this.editorCommandsService.setToolbarInteracting(false);
  }

  // Private signals for internal state
  private _editor = signal<Editor | null>(null);
  private _characterCount = signal<number>(0);
  private _wordCount = signal<number>(0);
  private _isDragOver = signal<boolean>(false);
  private _editorFullyInitialized = signal<boolean>(false);
  private _hoveredBlock = signal<{ node: PMNode; element: HTMLElement; pos: number } | null>(null);
  private readonly router = inject(Router);
  private readonly documentService = inject(DocumentService);

  // Anti-echo: track last emitted HTML to prevent cursor reset on parent echo
  private lastEmittedHtml: string | null = null;

  // Read-only access to signals
  readonly editor = this._editor.asReadonly();
  readonly characterCount = this._characterCount.asReadonly();
  readonly wordCount = this._wordCount.asReadonly();
  readonly isDragOver = this._isDragOver.asReadonly();
  readonly editorFullyInitialized = this._editorFullyInitialized.asReadonly();
  readonly hoveredBlock = this._hoveredBlock.asReadonly();

  private _isFormControlDisabled = signal<boolean>(false);
  readonly isFormControlDisabled = this._isFormControlDisabled.asReadonly();

  // Combined disabled state (Input + FormControl)
  readonly mergedDisabled = computed(
    () => (this.disabled() ?? this.effectiveConfig().disabled) || this.isFormControlDisabled(),
  );

  // Computed for editor states
  isEditorReady = computed(() => this.editor() !== null);

  // ============================================
  // UNIFIED CONFIGURATION COMPUTED PROPERTIES
  // ============================================

  // Appearance & Fundamentals
  readonly finalSeamless = computed(() => {
    const inputVal = this.seamless();
    if (inputVal !== undefined) {
      return inputVal;
    }

    const fromConfig = this.effectiveConfig().mode;
    return fromConfig === 'seamless';
  });

  readonly finalEditable = computed(
    () => this.editable() ?? this.effectiveConfig().editable ?? true,
  );
  readonly finalPlaceholder = computed(
    () =>
      this.placeholder() ??
      this.effectiveConfig().placeholder ??
      this.currentTranslations().editor.placeholder,
  );
  readonly finalFillContainer = computed(
    () => this.fillContainer() ?? this.effectiveConfig().fillContainer,
  );
  readonly finalShowFooter = computed(
    () => this.showFooter() ?? this.effectiveConfig().showFooter ?? true,
  );
  readonly finalShowEditToggle = computed(
    () => this.showEditToggle() ?? this.effectiveConfig().showEditToggle ?? false,
  );

  readonly finalHeight = computed(() => {
    const h = this.height() ?? this.effectiveConfig().height;
    return typeof h === 'number' ? `${h}px` : h;
  });
  readonly finalMinHeight = computed(() => {
    const mh = this.minHeight() ?? this.effectiveConfig().minHeight;
    return typeof mh === 'number' ? `${mh}px` : mh;
  });
  readonly finalMaxHeight = computed(() => {
    const mh = this.maxHeight() ?? this.effectiveConfig().maxHeight;
    return typeof mh === 'number' ? `${mh}px` : mh;
  });

  readonly finalSpellcheck = computed(
    () => this.spellcheck() ?? this.effectiveConfig().spellcheck ?? true,
  );
  readonly finalEnableOfficePaste = computed(
    () => this.enableOfficePaste() ?? this.effectiveConfig().enableOfficePaste ?? true,
  );

  // Features
  readonly finalShowToolbar = computed(
    () => this.showToolbar() ?? this.effectiveConfig().showToolbar ?? true,
  );

  readonly finalToolbarConfig = computed(() => {
    const fromInput = this.toolbar();
    const fromConfig = this.effectiveConfig().toolbar;
    const base = ATE_DEFAULT_TOOLBAR_CONFIG;

    if (fromInput && Object.keys(fromInput).length > 0) {
      return { ...base, ...fromInput };
    }
    if (fromConfig) {
      return { ...base, ...fromConfig };
    }
    return base;
  });

  readonly finalFloatingToolbar = computed(
    () => this.floatingToolbar() ?? this.effectiveConfig().floatingToolbar ?? false,
  );

  readonly finalShowBubbleMenu = computed(
    () => this.showBubbleMenu() ?? this.effectiveConfig().showBubbleMenu ?? true,
  );

  readonly finalBubbleMenuConfig = computed(() => {
    const fromInput = this.bubbleMenu();
    const fromConfig = this.effectiveConfig().bubbleMenu;
    const base = ATE_DEFAULT_BUBBLE_MENU_CONFIG;

    if (fromInput && Object.keys(fromInput).length > 0) {
      return { ...base, ...fromInput };
    }
    if (fromConfig) {
      return { ...base, ...fromConfig };
    }
    return base;
  });

  readonly finalShowImageBubbleMenu = computed(
    () => this.showImageBubbleMenu() ?? this.effectiveConfig().showImageBubbleMenu ?? true,
  );

  readonly finalImageBubbleMenuConfig = computed(() => {
    const fromInput = this.imageBubbleMenu();
    const fromConfig = this.effectiveConfig().imageBubbleMenu;
    const base = ATE_DEFAULT_IMAGE_BUBBLE_MENU_CONFIG;

    if (fromInput && Object.keys(fromInput).length > 0) {
      return { ...base, ...fromInput };
    }
    if (fromConfig) {
      return { ...base, ...fromConfig };
    }
    return base;
  });

  readonly finalShowTableBubbleMenu = computed(
    () => this.showTableBubbleMenu() ?? this.effectiveConfig().showTableMenu ?? true,
  );

  readonly finalTableBubbleMenuConfig = computed(() => {
    const fromInput = this.tableBubbleMenu();
    const fromConfig = this.effectiveConfig().tableBubbleMenu;
    const base = ATE_DEFAULT_TABLE_MENU_CONFIG;

    if (fromInput && Object.keys(fromInput).length > 0) {
      return { ...base, ...fromInput };
    }
    if (fromConfig) {
      return { ...base, ...fromConfig };
    }
    return base;
  });

  readonly finalShowCellBubbleMenu = computed(
    () => this.showCellBubbleMenu() ?? this.effectiveConfig().showCellMenu ?? true,
  );

  readonly finalCellBubbleMenuConfig = computed(() => {
    const fromInput = this.cellBubbleMenu();
    const fromConfig = this.effectiveConfig().cellBubbleMenu;
    const base = ATE_DEFAULT_CELL_MENU_CONFIG;

    if (fromInput && Object.keys(fromInput).length > 0) {
      return { ...base, ...fromInput };
    }
    if (fromConfig) {
      return { ...base, ...fromConfig };
    }
    return base;
  });

  readonly finalEnableSlashCommands = computed(
    () => this.enableSlashCommands() ?? this.effectiveConfig().enableSlashCommands ?? true,
  );

  readonly finalSlashCommandsConfig = computed(() => {
    const fromInputComponent = this.customSlashCommands();
    const fromConfigComponent = this.effectiveConfig().customSlashCommands;
    const customConfig = fromInputComponent ?? fromConfigComponent;

    if (customConfig) {
      return customConfig;
    }

    const fromInputOptions = this.slashCommands();
    const fromConfigOptions = this.effectiveConfig().slashCommands;
    const baseConfig =
      fromInputOptions && Object.keys(fromInputOptions).length > 0
        ? fromInputOptions
        : fromConfigOptions;

    return {
      commands: filterSlashCommands(
        baseConfig || {},
        this.i18nService,
        this.editorCommandsService,
        this.finalImageUploadConfig(),
      ),
    };
  });

  // Behavior
  readonly finalAutofocus = computed(() => this.autofocus() ?? this.effectiveConfig().autofocus);
  readonly finalMaxCharacters = computed(
    () => this.maxCharacters() ?? this.effectiveConfig().maxCharacters,
  );
  readonly finalBlockControls = computed(
    () => this.blockControls() ?? this.effectiveConfig().blockControls ?? 'none',
  );
  readonly finalShowCharacterCount = computed(
    () => this.showCharacterCount() ?? this.effectiveConfig().showCharacterCount ?? true,
  );
  readonly finalShowWordCount = computed(
    () => this.showWordCount() ?? this.effectiveConfig().showWordCount ?? true,
  );
  readonly finalLocale = computed(
    () => (this.locale() as SupportedLocale) ?? (this.effectiveConfig().locale as SupportedLocale),
  );

  // Extensions & Options
  readonly finalTiptapExtensions = computed(
    () => this.tiptapExtensions() ?? this.effectiveConfig().tiptapExtensions ?? [],
  );

  readonly finalTiptapOptions = computed(
    () => this.tiptapOptions() ?? this.effectiveConfig().tiptapOptions ?? {},
  );

  readonly finalStateCalculators = computed(
    () => this.stateCalculators() ?? this.effectiveConfig().stateCalculators ?? [],
  );

  readonly finalAngularNodesConfig = computed(() => this.effectiveConfig().angularNodes ?? []);

  // Image Upload
  readonly finalImageUploadConfig = computed(() => {
    const fromInput = this.imageUpload();
    const fromConfig = this.effectiveConfig().imageUpload;
    const base = ATE_DEFAULT_IMAGE_UPLOAD_CONFIG;

    const merged = {
      ...base,
      ...fromConfig,
      ...fromInput,
    };

    return {
      ...merged,
      maxSize: (merged.maxSize ?? 5) * 1024 * 1024, // Convert MB to bytes for internal service
    };
  });

  readonly finalImageUploadHandler = computed(
    () => this.imageUploadHandler() ?? this.effectiveConfig().imageUpload?.handler,
  );

  // Computed for current translations (allows per-instance override via config or input)
  readonly currentTranslations = computed(() => {
    const localeOverride = this.finalLocale();
    if (localeOverride) {
      const allTranslations = this.i18nService.allTranslations();
      return allTranslations[localeOverride] || this.i18nService.translations();
    }
    return this.i18nService.translations();
  });

  private _destroyRef = inject(DestroyRef);
  // NgControl for management of FormControls
  private ngControl = inject(NgControl, { self: true, optional: true });

  readonly i18nService = inject(AteI18nService);
  readonly editorCommandsService = inject(AteEditorCommandsService);
  // Access editor state via service
  readonly editorState = this.editorCommandsService.editorState;

  private editorRegistry = inject(AteEditorRegistry);
  private _registeredId = signal<string | null>(null);
  readonly registeredId = this._registeredId.asReadonly();

  private injector = inject(Injector);
  private globalConfig = inject(ATE_GLOBAL_CONFIG, { optional: true });

  /**
   * Final merged configuration.
   * Priority: Input [config] > Global config via provideAteEditor()
   */
  readonly effectiveConfig = computed(() => {
    const fromInput = this.config();
    const fromGlobal = this.globalConfig || {};
    return { ...ATE_DEFAULT_CONFIG, ...fromGlobal, ...fromInput };
  });

  constructor() {
    // Effect to update editor content (with anti-echo)
    effect(
      () => {
        const content = this.content(); // Sole reactive dependency

        untracked(() => {
          const editor = this.editor();
          const hasFormControl = !!(this.ngControl as { control?: unknown })?.control;

          if (!editor || content === undefined) {
            return;
          }

          // Anti-écho : on ignore ce qu'on vient d'émettre nous-mêmes
          if (content === this.lastEmittedHtml) {
            return;
          }

          // Double sécurité : on vérifie le contenu actuel de l'éditeur
          if (content === editor.getHTML()) {
            return;
          }

          // Do not overwrite content if we have a FormControl and content is empty
          if (hasFormControl && !content) {
            return;
          }

          editor.commands.setContent(content, { emitUpdate: false });
        });
      },
      { allowSignalWrites: true },
    );

    // Effect to update height properties
    effect(
      () => {
        const minHeight = this.finalMinHeight();
        const height = this.finalHeight();
        const maxHeight = this.finalMaxHeight();
        const element = this.editorElement()?.nativeElement;

        // Automatically calculate if scroll is needed
        const needsScroll = height !== undefined || maxHeight !== undefined;

        if (element) {
          element.style.setProperty('--editor-min-height', minHeight ?? 'auto');
          element.style.setProperty('--editor-height', height ?? 'auto');
          element.style.setProperty('--editor-max-height', maxHeight ?? 'none');
          element.style.setProperty('--editor-overflow', needsScroll ? 'auto' : 'visible');
        }
      },
      { allowSignalWrites: true },
    );

    // Effect to monitor editability changes
    effect(
      () => {
        const currentEditor = this.editor();
        // An editor is "editable" if it's not disabled and editable mode is ON
        const isEditable = this.finalEditable() && !this.mergedDisabled();
        // An editor is "readonly" if it's explicitly non-editable and not disabled
        // const isReadOnly = !this.finalEditable() && !this.mergedDisabled(); // Unused variable

        if (currentEditor) {
          this.editorCommandsService.setEditable(currentEditor, isEditable);
        }
      },
      { allowSignalWrites: true },
    );

    // Effect to synchronize image upload handler with the service
    effect(
      () => {
        const handler = this.finalImageUploadHandler();
        this.editorCommandsService.uploadHandler = handler || null;
      },
      { allowSignalWrites: true },
    );

    // Effect to update character count limit dynamically
    effect(
      () => {
        const editor = this.editor();
        const limit = this.finalMaxCharacters();

        if (editor && editor.extensionManager) {
          const characterCountExtension = editor.extensionManager.extensions.find(
            (ext) => ext.name === 'characterCount',
          );

          if (characterCountExtension) {
            characterCountExtension.options.limit = limit;
          }
        }
      },
      { allowSignalWrites: true },
    );

    // Effect to re-initialize editor when technical configuration changes
    effect(
      () => {
        // Monitor technical dependencies
        this.finalTiptapExtensions();
        this.finalTiptapOptions();
        this.finalAngularNodesConfig();
        this.finalBlockControls();

        untracked(() => {
          // Only if already initialized (post AfterViewInit)
          if (this.editorFullyInitialized()) {
            const currentEditor = this.editor();
            if (currentEditor) {
              currentEditor.destroy();
              this._editorFullyInitialized.set(false);
              this.initEditor();
            }
          }
        });
      },
      { allowSignalWrites: true },
    );

    this.editorCommandsService.onImageUploaded = (result) => {
      this.imageUploaded.emit(result);
    };
  }

  ngAfterViewInit() {
    // La vue est déjà complètement initialisée dans ngAfterViewInit
    // Initialiser l'éditeur
    this.initEditor();

    // S'abonner aux changements du FormControl
    this.setupFormControlSubscription();
  }

  ngOnDestroy() {
    const currentEditor = this.editor();
    if (currentEditor) {
      currentEditor.destroy();
    }
    this._editorFullyInitialized.set(false);

    // Unregister from the global registry
    const id = this.registeredId();
    if (id) {
      this.editorRegistry.unregister(id);
    }
  }

  private initEditor() {
    const extensions: Extensions = [
      StarterKit.configure({
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: 'ate-link',
          },
        },
      }),
      TextStyle,
      Color.configure({
        types: ['textStyle'],
      }),
      Placeholder.configure({
        placeholder: this.finalPlaceholder(),
      }),
      Superscript,
      Subscript,
      TextAlign.configure({
        types: ['heading', 'paragraph', 'resizableImage'],
      }),
      AteLinkClickBehavior(this.router, this.documentService),
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'ate-highlight',
        },
      }),
      AteResizableImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'ate-image',
        },
      }),
      AteUploadProgress.configure({
        isUploading: () => this.editorCommandsService.isUploading(),
        uploadProgress: () => this.editorCommandsService.uploadProgress(),
        uploadMessage: () => this.editorCommandsService.uploadMessage(),
      }),
      AteTableExtension,
      AteTiptapStateExtension.configure({
        onUpdate: (state) => this.editorCommandsService.updateState(state),
        calculators: [
          AteSelectionCalculator,
          AteMarksCalculator,
          AteTableCalculator,
          AteImageCalculator,
          AteStructureCalculator,
          AteDiscoveryCalculator,
          ...this.finalStateCalculators(),
        ],
      }),
    ];

    if (this.finalBlockControls() !== 'none') {
      extensions.push(
        AteBlockControlsExtension.configure({
          onHover: (data) => this._hoveredBlock.set(data),
        }),
      );
    }

    // Ajouter l'extension Office Paste si activée
    if (this.finalEnableOfficePaste()) {
      extensions.push(
        OfficePaste.configure({
          // Configuration par défaut pour une meilleure compatibilité
          transformPastedHTML: true,
          transformPastedText: true,
        }),
      );
    }

    if (this.finalShowCharacterCount() || this.finalShowWordCount()) {
      extensions.push(
        CharacterCount.configure({
          limit: this.finalMaxCharacters(),
        }),
      );
    }

    // Register automatic node views from config
    const autoNodeViews = this.finalAngularNodesConfig();
    autoNodeViews.forEach((reg: AteAngularNode) => {
      const options =
        typeof reg === 'function'
          ? { component: reg as Type<unknown> }
          : (reg as RegisterAngularComponentOptions<unknown>);

      try {
        const extension = registerAngularComponent(this.injector, options);
        extensions.push(extension);
      } catch (e) {
        console.error('[ATE] Failed to auto-register node view:', e);
      }
    });

    // Allow addition of custom extensions, but avoid duplicates by filtering by name
    const customExtensions = this.finalTiptapExtensions();
    if (customExtensions.length > 0) {
      const existingNames = new Set(
        extensions
          .map((ext) => (ext as { name?: string })?.name)
          .filter((name): name is string => !!name),
      );

      const toAdd = customExtensions.filter((ext) => {
        const name = (ext as { name?: string })?.name;
        return !name || !existingNames.has(name);
      });

      extensions.push(...toAdd);
    }

    // Also allow any tiptap user options
    const userOptions = this.finalTiptapOptions();
    const userEditorProps = userOptions.editorProps;
    const userHandlePaste = userEditorProps?.handlePaste;
    const userHandleDOMPaste = userEditorProps?.handleDOMEvents?.paste;

    type EditorHandlePaste = NonNullable<NonNullable<EditorOptions['editorProps']>['handlePaste']>;
    type EditorDOMPasteHandler = NonNullable<
      NonNullable<NonNullable<EditorOptions['editorProps']>['handleDOMEvents']>['paste']
    >;

    const handleDOMPaste: EditorDOMPasteHandler = (view, event) => {
      const currentEditor = this.editor();
      if (
        currentEditor &&
        this.editorCommandsService.handleImagePaste(
          currentEditor,
          event,
          this.getImageUploadOptions(),
        )
      ) {
        return true;
      }

      if (!userHandleDOMPaste) {
        return false;
      }

      const userResult = userHandleDOMPaste(view, event);
      return userResult === true;
    };

    const handlePaste: EditorHandlePaste = (view, event, slice) => {
      const currentEditor = this.editor();
      if (
        currentEditor &&
        this.editorCommandsService.handleImagePaste(
          currentEditor,
          event,
          this.getImageUploadOptions(),
        )
      ) {
        return true;
      }

      if (!userHandlePaste) {
        return false;
      }

      const userResult = userHandlePaste(view, event, slice);
      return userResult === true;
    };

    const newEditor = new Editor({
      ...userOptions,
      element: this.editorElement().nativeElement,
      extensions: extensions,
      content: this.content(),
      editable: this.finalEditable() && !this.mergedDisabled(),
      autofocus: this.finalAutofocus(),
      editorProps: {
        ...userEditorProps,
        attributes: {
          ...userEditorProps?.attributes,
          spellcheck: this.finalSpellcheck().toString(),
        },
        handleDOMEvents: {
          ...userEditorProps?.handleDOMEvents,
          paste: handleDOMPaste,
        },
        handlePaste,
      },
      onUpdate: ({ editor, transaction }) => {
        const html = editor.getHTML();

        // Anti-écho : mémoriser ce qu'on émet pour éviter la boucle
        this.lastEmittedHtml = html;

        this.contentChange.emit(html);
        // Mettre à jour le FormControl si il existe
        if (
          (
            this.ngControl as {
              control?: { setValue: (value: string, options: { emitEvent: boolean }) => void };
            }
          )?.control
        ) {
          (
            this.ngControl as {
              control: { setValue: (value: string, options: { emitEvent: boolean }) => void };
            }
          ).control.setValue(html, {
            emitEvent: false,
          });
        }
        this.editorUpdate.emit({ editor, transaction });
        this.updateCharacterCount(editor);
      },
      onCreate: ({ editor }) => {
        this.editorCreated.emit(editor);
        this.updateCharacterCount(editor);

        // Marquer l'éditeur comme complètement initialisé après un court délai
        // pour s'assurer que tous les plugins et extensions sont prêts
        setTimeout(() => {
          this._editorFullyInitialized.set(true);
        }, 100);
      },
      onFocus: ({ editor, event }) => {
        const id = this.registeredId();
        if (id) {
          this.editorRegistry.setActive(id);
        }
        this.editorFocus.emit({ editor, event });
      },
      onBlur: ({ editor, event }) => {
        // Marquer le FormControl comme touché si il existe
        if ((this.ngControl as { control?: { markAsTouched: () => void } })?.control) {
          (this.ngControl as { control: { markAsTouched: () => void } }).control.markAsTouched();
        }
        this.editorBlur.emit({ editor, event });
      },
    });

    // Stocker la référence de l'éditeur immédiatement
    this._editor.set(newEditor);

    // Register editor in the global registry
    const registeredId = this.editorRegistry.register(
      this.editorId(),
      () => this.editor(),
      this.editorCommandsService,
    );
    this._registeredId.set(registeredId);
  }

  toggleEditMode(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const newEditable = !this.finalEditable();
    this.editableChange.emit(newEditable);
  }

  private updateCharacterCount(editor: Editor) {
    if (
      (this.finalShowCharacterCount() || this.finalShowWordCount()) &&
      editor.storage['characterCount']
    ) {
      const storage = editor.storage['characterCount'];
      this._characterCount.set(storage.characters());
      this._wordCount.set(storage.words());
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this._isDragOver.set(true);
  }

  onDrop(event: DragEvent) {
    const editor = this.editor();
    if (editor) {
      this.editorCommandsService.handleImageDrop(editor, event, this.getImageUploadOptions());
      this._isDragOver.set(false);
    }
  }

  private getImageUploadOptions(): AteImageUploadOptions {
    const config = this.finalImageUploadConfig();
    return {
      quality: config.quality,
      maxWidth: config.maxWidth,
      maxHeight: config.maxHeight,
      maxSize: config.maxSize,
      allowedTypes: config.allowedTypes,
    };
  }

  // Public methods
  getHTML(): string {
    return this.editor()?.getHTML() || '';
  }

  getJSON(): JSONContent | undefined {
    return this.editor()?.getJSON();
  }

  getText(): string {
    return this.editor()?.getText() || '';
  }

  setContent(content: string, emitUpdate = true) {
    const editor = this.editor();
    if (editor) {
      this.editorCommandsService.setContent(editor, content, emitUpdate);
    }
  }

  focus() {
    const editor = this.editor();
    if (editor) {
      this.editorCommandsService.focus(editor);
    }
  }

  blur() {
    const editor = this.editor();
    if (editor) {
      this.editorCommandsService.blur(editor);
    }
  }

  // Méthode publique pour obtenir l'éditeur
  getEditor(): Editor | null {
    return this.editor();
  }

  private setupFormControlSubscription(): void {
    const control = (
      this.ngControl as {
        control?: {
          value: string;
          valueChanges: Observable<string>;
          status: string;
          statusChanges: Observable<string>;
        };
      }
    )?.control;
    if (control) {
      // Synchronize form control value with editor content
      const formValue$: Observable<string> = concat(
        defer(() => of(control.value)),
        control.valueChanges,
      );

      formValue$
        .pipe(
          tap((value: string) => {
            const editor = this.editor();
            if (editor) {
              this.setContent(value, false);
            }
          }),
          takeUntilDestroyed(this._destroyRef),
        )
        .subscribe();

      // Synchronize form control status with editor disabled state
      const formStatus$: Observable<string> = concat(
        defer(() => of(control.status)),
        control.statusChanges,
      );

      formStatus$
        .pipe(
          tap((status: string) => {
            this._isFormControlDisabled.set(status === 'DISABLED');
          }),
          takeUntilDestroyed(this._destroyRef),
        )
        .subscribe();
    }
  }

  onEditorClick(event: Event) {
    const editor = this.editor();
    if (!editor) {
      return;
    }

    // In read-only mode, handle clearing of node selection
    if (!this.finalEditable()) {
      const target = event.target as HTMLElement;
      const editorElement = this.editorElement()?.nativeElement;
      if (target === editorElement || target.classList.contains('ate-content')) {
        // Clear selection to hide bubble menus
        editor.commands.setTextSelection(0);
      }
      return;
    }

    // Verify if interaction is on the container element and not on the content
    const target = event.target as HTMLElement;
    const editorElement = this.editorElement()?.nativeElement;

    if (target === editorElement || target.classList.contains('ate-content')) {
      // Interaction in the empty space, position the cursor at the end
      setTimeout(() => {
        const { doc } = editor.state;
        const endPos = doc.content.size;
        editor.commands.setTextSelection(endPos);
        editor.commands.focus();
      }, 0);
    }
  }
}
