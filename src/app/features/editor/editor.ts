import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { Editor, Extensions } from '@tiptap/core';
import {
  AngularTiptapEditorComponent,
  AteEditorConfig,
  AteI18nService,
  AteImageUploadResult,
  AteTableOfContentsComponent,
} from '../../../../projects/angular-tiptap-editor/src/public-api';
import { ToastContainerComponent } from '../tiptap/src/components/toast-container.component';
import { Drawing } from '../tiptap/src/extensions/drawing.extension';
import { TaskItem, TaskList } from '../tiptap/src/extensions/task.extension';
import { EditorConfigurationService } from '../tiptap/src/services/editor-configuration.service';
import { ToastService } from '../tiptap/src/services/toast.service';

const TEXT_LOCK_KEY = 'tf-editor-text-lock';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [AngularTiptapEditorComponent, ToastContainerComponent, AteTableOfContentsComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EditorComponent),
      multi: true,
    },
  ],
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
})
export class EditorComponent {
  readonly content = input('');
  readonly contentChange = output<string>();

  // Injection des services
  private configService = inject(EditorConfigurationService);
  private i18nService = inject(AteI18nService);
  private toastService = inject(ToastService);

  // Signaux depuis le service
  readonly editorState = this.configService.editorState;
  readonly demoContent = this.configService.demoContent;
  readonly toolbarConfig = this.configService.toolbarConfig;
  readonly bubbleMenuConfig = this.configService.bubbleMenuConfig;
  readonly slashCommandsConfig = this.configService.slashCommandsConfig;
  readonly currentLocale = this.i18nService.currentLocale;
  readonly tocConfig = this.configService.tocConfig;

  readonly finalTiptapExtensions = computed(
    () => {
      const exts: Extensions = [Drawing];
      if (this.editorState().enableTaskExtension) {
        exts.push(TaskList, TaskItem);
      }
      return exts;
    },
    { equal: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]) },
  );

  readonly editorConfig = computed(() => {
    const state = this.editorState();

    const config: AteEditorConfig = {
      theme: state.darkMode ? 'dark' : 'light',
      mode: state.seamless ? 'seamless' : 'classic',
      height: state.height ? `${state.height}px` : undefined,
      autofocus: state.autofocus,
      placeholder: state.placeholder,
      editable: state.editable,
      minHeight: state.minHeight ? `${state.minHeight}px` : undefined,
      maxHeight: state.maxHeight ? `${state.maxHeight}px` : undefined,
      fillContainer: state.fillContainer,
      disabled: state.disabled,
      locale: this.currentLocale(),
      showToolbar: state.showToolbar,
      showFooter: state.showFooter,
      showCharacterCount: state.showCharacterCount,
      showWordCount: state.showWordCount,
      showEditToggle: state.showEditToggle,
      maxCharacters: state.maxCharacters,
      toolbar: this.toolbarConfig(),
      bubbleMenu: this.bubbleMenuConfig(),
      slashCommands: this.slashCommandsConfig(),
      floatingToolbar: state.floatingToolbar,
      showBubbleMenu: state.showBubbleMenu,
      showImageBubbleMenu: state.showImageBubbleMenu,
      showTableMenu: state.showTableBubbleMenu,
      showCellMenu: state.showCellBubbleMenu,
      enableSlashCommands: state.enableSlashCommands,
      tiptapExtensions: this.finalTiptapExtensions(),
      blockControls: state.blockControls,
    };
    return config;
  });

  private readonly view = viewChild<ElementRef<HTMLElement>>('viewRef');

  /**
   * Sur tablette, le texte hors des zones de dessin est verrouillé : le doigt ou le Pencil n'y
   * posent plus de curseur, n'ouvrent pas le clavier et n'écrivent rien (Scribble compris).
   * Actif par défaut sur un écran tactile, réglable avec le bouton cadenas.
   */
  readonly textLocked = signal(this.restoreLock());

  readonly touchDevice =
    typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

  toggleTextLock() {
    this.textLocked.update((locked) => !locked);
    try {
      localStorage.setItem(TEXT_LOCK_KEY, String(this.textLocked()));
    } catch {
      // Stockage indisponible : le réglage ne sera pas conservé.
    }
  }

  private restoreLock(): boolean {
    try {
      const saved = localStorage.getItem(TEXT_LOCK_KEY);
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {
      // Pas de stockage : valeur par défaut.
    }
    return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  }

  constructor() {
    afterNextRender(() => {
      const root = this.view()?.nativeElement;
      if (!root) {
        return;
      }
      const outsideDrawing = (target: EventTarget | null) =>
        target instanceof Element &&
        target.closest('.ProseMirror') !== null &&
        target.closest('.ate-drawing-node') === null;

      // Doigt / Pencil hors dessin : pas de curseur ni de clavier (le défilement reste possible).
      root.addEventListener(
        'pointerdown',
        (event) => {
          if (this.textLocked() && event.pointerType !== 'mouse' && outsideDrawing(event.target)) {
            event.preventDefault();
            (document.activeElement as HTMLElement | null)?.blur?.();
          }
        },
        true,
      );

      // Toute saisie (clavier, dictée, écriture manuscrite) dont le curseur est hors dessin.
      root.addEventListener(
        'beforeinput',
        (event) => {
          if (this.textLocked() && outsideDrawing(event.target)) {
            const anchor = document.getSelection()?.anchorNode;
            const element = anchor instanceof Element ? anchor : anchor?.parentElement;
            if (!element?.closest('.ate-drawing-node')) {
              event.preventDefault();
            }
          }
        },
        true,
      );
    });

    // Effet pour synchroniser la classe dark sur le body (pour les bubble menus)
    effect(() => {
      const isDark = this.editorState().darkMode;
      if (isDark) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    });
  }

  onContentChange(value: string) {
    this.contentChange.emit(value);
  }

  onEditableChange(editable: boolean) {
    this.configService.updateEditorState({ editable });
  }

  onEditorHover(hovered: boolean) {
    this.configService.setEditorHovered(hovered);
  }

  onFocusEvent(_event: { editor: Editor; event: FocusEvent }) {
    console.log('Editor Focused!');
  }

  onImageUploaded(event: AteImageUploadResult) {
    this.toastService.success(`Image uploaded successfully: ${event.name || 'image'}`);
  }
}
