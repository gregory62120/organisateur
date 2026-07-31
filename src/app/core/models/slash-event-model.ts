import { EditorBlock } from './block-model';

export interface SlashEvent {
  block: EditorBlock;
  x: number;
  y: number;
}
