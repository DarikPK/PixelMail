import type { SignatureBlock, BlockType } from './types';

// Función para generar un ID aleatorio único
const generateId = (): string => 'sb-' + Math.random().toString(36).substr(2, 9);

// Sanitizador de HTML simple y seguro
export const sanitizeHTML = (html: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Eliminar scripts
  const scripts = doc.querySelectorAll('script, style, link[rel="stylesheet"], iframe, object, embed');
  scripts.forEach((el) => el.remove());

  // Eliminar atributos on* de javascript (ej. onclick)
  const allElements = doc.querySelectorAll('*');
  allElements.forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return doc.body.innerHTML;
};

// Motor de Detección Automática de Bloques
export const parseHTMLToBlocks = (html: string): SignatureBlock[] => {
  const sanitized = sanitizeHTML(html);
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitized, 'text/html');

  const blocks: SignatureBlock[] = [];

  // Función recursiva para escanear nodos del DOM
  const scanNode = (node: Element) => {
    // Evitar procesar elementos vacíos o invisibles
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return;

    const tagName = node.tagName.toLowerCase();

    // 1. Detección de Imágenes (Logos, Banners, QR)
    if (tagName === 'img') {
      const src = node.getAttribute('src') || '';
      const alt = node.getAttribute('alt') || '';
      let type: BlockType = 'image';
      let name = 'Imagen';

      if (src.includes('qr') || alt.toLowerCase().includes('qr')) {
        type = 'qr';
        name = 'Código QR';
      } else if (src.includes('logo') || alt.toLowerCase().includes('logo')) {
        type = 'logo';
        name = 'Logo Corporativo';
      }

      blocks.push({
        id: generateId(),
        type,
        name,
        content: src,
        width: node.getAttribute('width') || undefined,
        height: node.getAttribute('height') || undefined,
        altText: alt || undefined,
        borderRadius: (node as HTMLElement).style.borderRadius || undefined,
        border: (node as HTMLElement).style.border || undefined
      });
      return;
    }

    // 2. Detección de Separadores
    if (tagName === 'hr' || (node as HTMLElement).style.borderTop) {
      blocks.push({
        id: generateId(),
        type: 'separator',
        name: 'Separador',
        content: '',
        color: (node as HTMLElement).style.borderColor || '#CBD5E1'
      });
      return;
    }

    // 3. Detección de Enlaces (Redes Sociales o Links standard)
    if (tagName === 'a') {
      const href = node.getAttribute('href') || '';
      const text = node.textContent?.trim() || '';

      if (href.includes('linkedin.com')) {
        blocks.push({ id: generateId(), type: 'social', name: 'LinkedIn', content: href, socialPlatform: 'linkedin', href });
      } else if (href.includes('facebook.com')) {
        blocks.push({ id: generateId(), type: 'social', name: 'Facebook', content: href, socialPlatform: 'facebook', href });
      } else if (href.includes('instagram.com')) {
        blocks.push({ id: generateId(), type: 'social', name: 'Instagram', content: href, socialPlatform: 'instagram', href });
      } else if (href.includes('twitter.com') || href.includes('x.com')) {
        blocks.push({ id: generateId(), type: 'social', name: 'Twitter / X', content: href, socialPlatform: 'twitter', href });
      } else if (href.includes('youtube.com')) {
        blocks.push({ id: generateId(), type: 'social', name: 'YouTube', content: href, socialPlatform: 'youtube', href });
      } else if (href.includes('tiktok.com')) {
        blocks.push({ id: generateId(), type: 'social', name: 'TikTok', content: href, socialPlatform: 'tiktok', href });
      } else if (href.includes('wa.me') || href.includes('whatsapp.com')) {
        blocks.push({ id: generateId(), type: 'social', name: 'WhatsApp', content: href, socialPlatform: 'whatsapp', href });
      } else {
        blocks.push({
          id: generateId(),
          type: 'link',
          name: 'Enlace Web',
          content: text || href,
          href,
          color: (node as HTMLElement).style.color || undefined
        });
      }
      return;
    }

    // 4. Detección de Botones
    if (tagName === 'button' || node.classList.contains('button') || node.classList.contains('btn') || (node as HTMLElement).style.backgroundColor && tagName === 'a') {
      const text = node.textContent?.trim() || 'Botón';
      blocks.push({
        id: generateId(),
        type: 'button',
        name: 'Botón de Acción',
        content: text,
        href: node.getAttribute('href') || '#',
        buttonColor: (node as HTMLElement).style.backgroundColor || '#3B82F6',
        borderRadius: (node as HTMLElement).style.borderRadius || undefined
      });
      return;
    }

    // 5. Detección de Textos Especializados (Nombre, Cargo, Confidencialidad)
    const textContent = node.textContent?.trim() || '';
    if (textContent && node.children.length === 0) {
      const style = window.getComputedStyle(node);
      const fontSize = (node as HTMLElement).style.fontSize || style.fontSize;
      const fontWeight = (node as HTMLElement).style.fontWeight || style.fontWeight;
      const color = (node as HTMLElement).style.color || style.color;

      const lowerText = textContent.toLowerCase();

      if (lowerText.includes('confidencial') || lowerText.includes('aviso legal') || lowerText.includes('transmission is intended')) {
        blocks.push({
          id: generateId(),
          type: 'legal',
          name: 'Aviso de Confidencialidad',
          content: textContent,
          legalModel: 'confidencial',
          color,
          fontSize
        });
      } else if (lowerText.includes('medio ambiente') || lowerText.includes('imprimir este correo')) {
        blocks.push({
          id: generateId(),
          type: 'legal',
          name: 'Firma Ecológica',
          content: textContent,
          legalModel: 'estandar',
          color,
          fontSize
        });
      } else if (parseInt(fontSize) >= 18 || fontWeight === 'bold' || parseInt(fontWeight) >= 700) {
        // Asumir que texto grande/negrita es el Nombre
        blocks.push({
          id: generateId(),
          type: 'name',
          name: 'Nombre',
          content: textContent,
          fontWeight: '700',
          fontSize,
          color
        });
      } else if (lowerText.includes('director') || lowerText.includes('manager') || lowerText.includes('gerente') || lowerText.includes('asesor') || lowerText.includes('engineer') || lowerText.includes('diseñador')) {
        blocks.push({
          id: generateId(),
          type: 'cargo',
          name: 'Cargo / Puesto',
          content: textContent,
          fontSize,
          color
        });
      } else if (lowerText.includes('telf') || lowerText.includes('tel:') || lowerText.includes('phone') || textContent.includes('+51')) {
        blocks.push({
          id: generateId(),
          type: 'tel',
          name: 'Teléfono',
          content: textContent,
          fontSize,
          color
        });
      } else if (lowerText.includes('correo') || lowerText.includes('email') || textContent.includes('@')) {
        blocks.push({
          id: generateId(),
          type: 'correo',
          name: 'Correo Electrónico',
          content: textContent,
          fontSize,
          color
        });
      } else if (lowerText.includes('web') || lowerText.includes('site') || lowerText.includes('.com') || lowerText.includes('.pe')) {
        blocks.push({
          id: generateId(),
          type: 'web',
          name: 'Sitio Web',
          content: textContent,
          fontSize,
          color
        });
      } else {
        blocks.push({
          id: generateId(),
          type: 'text',
          name: 'Texto Libre',
          content: textContent,
          fontSize,
          color
        });
      }
      return;
    }

    // 6. Si contiene hijos, procesar recursivamente o agrupar como Custom HTML si es un contenedor desconocido complejo
    if (tagName === 'table' || tagName === 'tbody' || tagName === 'tr' || tagName === 'td') {
      // Dejar que se procesen las celdas individuales para extraer información estructurada
      Array.from(node.children).forEach(scanNode);
    } else if (node.children.length > 0) {
      // Procesar hijos de forma natural
      Array.from(node.children).forEach(scanNode);
    } else {
      // HTML personalizado para cualquier cosa no reconocida o de estructura libre
      blocks.push({
        id: generateId(),
        type: 'custom_html',
        name: 'HTML Personalizado',
        content: node.outerHTML
      });
    }
  };

  // Comenzar el escaneo desde el body del DOM parsed
  Array.from(doc.body.children).forEach(scanNode);

  // Si no se detectó ningún bloque, meter todo el HTML como un bloque Custom HTML único
  if (blocks.length === 0 && sanitized.trim()) {
    blocks.push({
      id: generateId(),
      type: 'custom_html',
      name: 'HTML Personalizado',
      content: sanitized
    });
  }

  return blocks;
};
