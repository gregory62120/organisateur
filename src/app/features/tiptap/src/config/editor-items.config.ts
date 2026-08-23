import { ConfigItem } from "../types/editor-config.types";

// Factory functions to create items with translations
export function createToolbarItems(itemLabels: Record<string, string>): ConfigItem[] {
  return [
    { key: "bold", label: itemLabels["bold"], icon: "format_bold" },
    { key: "italic", label: itemLabels["italic"], icon: "format_italic" },
    {
      key: "underline",
      label: itemLabels["underline"],
      icon: "format_underlined",
    },
    {
      key: "strike",
      label: itemLabels["strike"],
      icon: "format_strikethrough",
    },
    { key: "code", label: itemLabels["code"], icon: "code" },
    {
      key: "superscript",
      label: itemLabels["superscript"],
      icon: "superscript",
    },
    { key: "subscript", label: itemLabels["subscript"], icon: "subscript" },
    { key: "highlight", label: itemLabels["highlight"], icon: "highlight" },
    { key: "highlightPicker", label: itemLabels["highlightPicker"], icon: "format_color_fill" },
    { key: "textColor", label: itemLabels["textColor"], icon: "format_color_text" },
    { key: "heading1", label: itemLabels["heading1"], icon: "title" },
    { key: "heading2", label: itemLabels["heading2"], icon: "title" },
    { key: "heading3", label: itemLabels["heading3"], icon: "title" },
    {
      key: "bulletList",
      label: itemLabels["bulletList"],
      icon: "format_list_bulleted",
    },
    {
      key: "orderedList",
      label: itemLabels["orderedList"],
      icon: "format_list_numbered",
    },
    {
      key: "blockquote",
      label: itemLabels["blockquote"],
      icon: "format_quote",
    },
    {
      key: "alignLeft",
      label: itemLabels["alignLeft"],
      icon: "format_align_left",
    },
    {
      key: "alignCenter",
      label: itemLabels["alignCenter"],
      icon: "format_align_center",
    },
    {
      key: "alignRight",
      label: itemLabels["alignRight"],
      icon: "format_align_right",
    },
    {
      key: "alignJustify",
      label: itemLabels["alignJustify"],
      icon: "format_align_justify",
    },
    { key: "link", label: itemLabels["link"], icon: "link" },
    { key: "image", label: itemLabels["image"], icon: "image" },
    {
      key: "horizontalRule",
      label: itemLabels["horizontalRule"],
      icon: "horizontal_rule",
    },
    { key: "table", label: itemLabels["table"], icon: "table_view" },
    { key: "undo", label: itemLabels["undo"], icon: "undo" },
    { key: "redo", label: itemLabels["redo"], icon: "redo" },
    { key: "clear", label: itemLabels["clear"], icon: "delete" },
    { key: "separator", label: itemLabels["separator"], icon: "more_vert" },
  ];
}

export function createBubbleMenuItems(itemLabels: Record<string, string>): ConfigItem[] {
  return [
    { key: "bold", label: itemLabels["bold"], icon: "format_bold" },
    { key: "italic", label: itemLabels["italic"], icon: "format_italic" },
    {
      key: "underline",
      label: itemLabels["underline"],
      icon: "format_underlined",
    },
    { key: "strike", label: itemLabels["strike"], icon: "format_strikethrough" },
    { key: "code", label: itemLabels["code"], icon: "code" },
    { key: "superscript", label: itemLabels["superscript"], icon: "superscript" },
    { key: "subscript", label: itemLabels["subscript"], icon: "subscript" },
    { key: "highlight", label: itemLabels["highlight"], icon: "highlight" },
    { key: "highlightPicker", label: itemLabels["highlightPicker"], icon: "format_color_fill" },
    { key: "textColor", label: itemLabels["textColor"], icon: "format_color_text" },
    { key: "link", label: itemLabels["link"], icon: "link" },
    { key: "separator", label: itemLabels["separator"], icon: "more_vert" },
    { key: "custom_ai", label: itemLabels["customAi"], icon: "psychology" },
  ];
}

export function createSlashCommandItems(itemLabels: Record<string, string>): ConfigItem[] {
  return [
    { key: "heading1", label: itemLabels["heading1"], icon: "format_h1" },
    { key: "heading2", label: itemLabels["heading2"], icon: "format_h2" },
    { key: "heading3", label: itemLabels["heading3"], icon: "format_h3" },
    {
      key: "bulletList",
      label: itemLabels["bulletList"],
      icon: "format_list_bulleted",
    },
    {
      key: "orderedList",
      label: itemLabels["orderedList"],
      icon: "format_list_numbered",
    },
    { key: "blockquote", label: itemLabels["blockquote"], icon: "format_quote" },
    { key: "code", label: itemLabels["code"], icon: "code" },
    { key: "image", label: itemLabels["image"], icon: "image" },
    {
      key: "horizontalRule",
      label: itemLabels["horizontalRule"],
      icon: "horizontal_rule",
    },
    { key: "table", label: itemLabels["table"], icon: "table_view" },
    { key: "custom_magic", label: itemLabels["customMagic"], icon: "auto_awesome" },
    { key: "custom_ai_block", label: itemLabels["customAi"], icon: "psychology" },
    { key: "counter", label: itemLabels["counter"], icon: "pin" },
    { key: "warningBox", label: itemLabels["warningBox"], icon: "warning" },
  ];
}

// Fallback constants for backward compatibility
export const TOOLBAR_ITEMS: ConfigItem[] = [
  { key: "bold", label: "Gras", icon: "format_bold" },
  { key: "italic", label: "Italique", icon: "format_italic" },
  { key: "underline", label: "Souligné", icon: "format_underlined" },
  { key: "strike", label: "Barré", icon: "format_strikethrough" },
  { key: "code", label: "Code", icon: "code" },
  { key: "superscript", label: "Exposant", icon: "superscript" },
  { key: "subscript", label: "Indice", icon: "subscript" },
  { key: "highlight", label: "Surligner", icon: "highlight" },
  { key: "highlightPicker", label: "Couleur de fond", icon: "format_color_fill" },
  { key: "textColor", label: "Couleur du texte", icon: "format_color_text" },
  { key: "heading1", label: "Titre 1", icon: "title" },
  { key: "heading2", label: "Titre 2", icon: "title" },
  { key: "heading3", label: "Titre 3", icon: "title" },
  { key: "bulletList", label: "Liste à puces", icon: "format_list_bulleted" },
  {
    key: "orderedList",
    label: "Liste numérotée",
    icon: "format_list_numbered",
  },
  { key: "blockquote", label: "Citation", icon: "format_quote" },
  { key: "alignLeft", label: "Aligner à gauche", icon: "format_align_left" },
  { key: "alignCenter", label: "Centrer", icon: "format_align_center" },
  { key: "alignRight", label: "Aligner à droite", icon: "format_align_right" },
  { key: "alignJustify", label: "Justifier", icon: "format_align_justify" },
  { key: "link", label: "Lien", icon: "link" },
  { key: "image", label: "Image", icon: "image" },
  {
    key: "horizontalRule",
    label: "Ligne horizontale",
    icon: "horizontal_rule",
  },
  { key: "table", label: "Tableau", icon: "table_view" },
  { key: "undo", label: "Annuler", icon: "undo" },
  { key: "redo", label: "Refaire", icon: "redo" },
  { key: "separator", label: "Séparateur", icon: "more_vert" },
];

export const BUBBLE_MENU_ITEMS: ConfigItem[] = [
  { key: "bold", label: "Gras", icon: "format_bold" },
  { key: "italic", label: "Italique", icon: "format_italic" },
  { key: "underline", label: "Souligné", icon: "format_underlined" },
  { key: "strike", label: "Barré", icon: "format_strikethrough" },
  { key: "code", label: "Code", icon: "code" },
  { key: "superscript", label: "Exposant", icon: "superscript" },
  { key: "subscript", label: "Indice", icon: "subscript" },
  { key: "highlight", label: "Surligner", icon: "highlight" },
  { key: "highlightPicker", label: "Couleur de fond", icon: "format_color_fill" },
  { key: "textColor", label: "Couleur du texte", icon: "format_color_text" },
  { key: "link", label: "Lien", icon: "link" },
  { key: "separator", label: "Séparateur", icon: "more_vert" },
];

export const SLASH_COMMAND_ITEMS: ConfigItem[] = [
  { key: "heading1", label: "Titre 1", icon: "format_h1" },
  { key: "heading2", label: "Titre 2", icon: "format_h2" },
  { key: "heading3", label: "Titre 3", icon: "format_h3" },
  { key: "bulletList", label: "Liste à puces", icon: "format_list_bulleted" },
  {
    key: "orderedList",
    label: "Liste numérotée",
    icon: "format_list_numbered",
  },
  { key: "blockquote", label: "Citation", icon: "format_quote" },
  { key: "code", label: "Code", icon: "code" },
  { key: "image", label: "Image", icon: "image" },
  {
    key: "horizontalRule",
    label: "Ligne horizontale",
    icon: "horizontal_rule",
  },
  { key: "table", label: "Tableau", icon: "table_view" },
];

export const HEIGHT_ITEMS: ConfigItem[] = [
  { key: "fixedHeight", label: "Hauteur fixe", icon: "height" },
  { key: "maxHeight", label: "Hauteur maximale", icon: "vertical_align_top" },
];
