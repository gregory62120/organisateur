export type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'quote' | 'check';

export interface EditorBlock {
  id: string;

  type: BlockType;

  content: string;

  checked?: boolean;
}
