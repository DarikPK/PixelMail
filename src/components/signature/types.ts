export type BlockType =
  | 'root'
  | 'table'
  | 'row'
  | 'cell'
  | 'logo'
  | 'image'
  | 'name'
  | 'cargo'
  | 'empresa'
  | 'tel'
  | 'cel'
  | 'correo'
  | 'web'
  | 'direccion'
  | 'frase'
  | 'text'
  | 'link'
  | 'button'
  | 'social'
  | 'separator'
  | 'tablas'
  | 'legal'
  | 'custom_html'
  | 'gif'
  | 'espaciador'
  | 'estado'
  | 'qr';

export interface SignatureBlock {
  id: string;
  type: BlockType;
  name: string; // Nombre visible (ej. "Columna logo", "Nombre")
  tagName: string; // "table", "tr", "td", "img", "a", etc.
  domPath: string; // Ruta/Selector CSS para localizarlo en el DOM (ej. "table > tr > td")
  content: string; // Texto plano o innerHTML
  attributes: Record<string, string>; // Atributos HTML (href, src, alt, width, height, etc.)
  inlineStyles: Record<string, string>; // Estilos inline parseados
  hidden?: boolean;
  locked?: boolean;
  children?: SignatureBlock[]; // Árbol jerárquico real del DOM
}

export interface AssetRecord {
  filename: string;
  isFound: boolean;
  resolvedDataUrl?: string; // Base64 o Object URL para la vista previa
}

export interface SignatureProject {
  id: string;
  name: string;
  rawHTML: string; // El HTML maestro intacto original
  blocks: SignatureBlock[]; // El árbol simplificado del DOM
  missingAssets: AssetRecord[]; // Registro de recursos locales/faltantes
  createdAt: string;
  updatedAt: string;
}
