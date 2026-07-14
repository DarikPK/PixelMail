export type BlockType =
  | 'root'
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
  name: string; // Nombre visible en el árbol (ej. "Datos personales", "Nombre")
  content: string; // Texto, URL de imagen, o código HTML
  fontFamily?: string;
  fontSize?: string;
  color?: string;
  fontWeight?: string | number;
  align?: 'left' | 'center' | 'right';
  padding?: string;
  margin?: string;
  border?: string;
  borderRadius?: string;
  href?: string; // Enlace para botones, imágenes o links
  buttonColor?: string;
  hidden?: boolean;
  locked?: boolean;
  width?: string;
  height?: string;
  keepRatio?: boolean;
  altText?: string;
  qrShape?: 'square' | 'circle';
  qrBorder?: string;
  legalModel?: 'financiero' | 'corporativo' | 'confidencial' | 'estandar';
  socialPlatform?: 'linkedin' | 'facebook' | 'instagram' | 'twitter' | 'youtube' | 'tiktok' | 'whatsapp';
  backgroundColor?: string;
  shadow?: string;
  estadoType?: 'disponible' | 'reunion' | 'vacaciones' | 'fuera';
  children?: SignatureBlock[]; // Soporte para jerarquías
}

export interface SignatureProject {
  id: string;
  name: string;
  blocks: SignatureBlock[];
  createdAt: string;
  updatedAt: string;
}
