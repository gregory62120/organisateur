import { Component, computed, effect, forwardRef, inject } from '@angular/core';
import {
  AngularTiptapEditorComponent,
  AteEditorConfig,
  AteI18nService,
  AteImageUploadResult,
} from '../../../../projects/angular-tiptap-editor/src/public-api';
import { Editor, Extension, Extensions, Mark } from '@tiptap/core';
import { TaskItem, TaskList } from '../tiptap/src/extensions/task.extension';
import { EditorConfigurationService } from '../tiptap/src/services/editor-configuration.service';
import { ToastService } from '../tiptap/src/services/toast.service';
import { ToastContainerComponent } from '../tiptap/src/components/toast-container.component';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [AngularTiptapEditorComponent, ToastContainerComponent],
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
export class EditorComponent implements ControlValueAccessor {
  private onChange = (value: string) => {};
  private onTouched = () => {};

  content = '';

  writeValue(value: string): void {
    this.content = value ?? '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  onContentChange(value: string) {
    console.log(value);
    this.content = value;
    this.onChange(value);
  }

  onBlur() {
    this.onTouched();
  }

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

  readonly finalTiptapExtensions = computed(
    () => {
      const exts: Extensions = [];
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

  constructor() {
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
