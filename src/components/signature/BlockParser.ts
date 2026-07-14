import type { SignatureBlock, BlockType, AssetRecord } from './types';

// Inyecta atributos data-sb-id en todos los elementos del HTML
export const injectSBIds = (html: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  let counter = 0;
  const traverse = (el: Element) => {
    if (!el.getAttribute('data-sb-id')) {
      el.setAttribute('data-sb-id', `sb-${Date.now()}-${counter++}`);
    }
    Array.from(el.children).forEach(traverse);
  };

  Array.from(doc.body.children).forEach(traverse);
  return doc.body.innerHTML;
};

// Sanitizador de HTML que mantiene la estructura intacta pero remueve scripts nocivos
export const sanitizeHTML = (html: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remover scripts e iframes
  const dangerous = doc.querySelectorAll('script, iframe, object, embed');
  dangerous.forEach((el) => el.remove());

  // Limpiar eventos en*
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

// Analizar recursos locales faltantes (como assets/logo_pixel.svg)
export const findMissingAssets = (html: string): AssetRecord[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const imgs = doc.querySelectorAll('img');

  const assets: AssetRecord[] = [];
  imgs.forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
      // Es una ruta local o relativa
      const filename = src.split('/').pop() || src;
      if (!assets.some((a) => a.filename === filename)) {
        assets.push({
          filename,
          isFound: false
        });
      }
    }
  });

  return assets;
};

// Reemplazar rutas locales en el HTML con Base64/Object URLs resueltas
export const resolveLocalAssets = (html: string, resolvedAssets: AssetRecord[]): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const imgs = doc.querySelectorAll('img');

  imgs.forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
      const filename = src.split('/').pop() || src;
      const resolved = resolvedAssets.find((r) => r.filename === filename && r.isFound && r.resolvedDataUrl);
      if (resolved && resolved.resolvedDataUrl) {
        img.setAttribute('src', resolved.resolvedDataUrl);
      }
    }
  });

  return doc.body.innerHTML;
};

// Heurística de clasificación para mostrar un árbol de bloques DOM simplificado y elegante
const classifyTagToBlockType = (el: Element): BlockType => {
  const tagName = el.tagName.toLowerCase();
  if (tagName === 'table') return 'table';
  if (tagName === 'tr') return 'row';
  if (tagName === 'td') return 'cell';
  if (tagName === 'img') {
    const src = el.getAttribute('src') || '';
    const alt = el.getAttribute('alt') || '';
    if (src.includes('logo') || alt.toLowerCase().includes('logo')) return 'logo';
    if (src.includes('qr') || alt.toLowerCase().includes('qr')) return 'qr';
    return 'image';
  }
  if (tagName === 'a') {
    const href = el.getAttribute('href') || '';
    if (href.includes('linkedin.com') || href.includes('facebook.com') || href.includes('instagram.com') || href.includes('twitter.com') || href.includes('youtube.com') || href.includes('tiktok.com') || href.includes('wa.me')) {
      return 'social';
    }
    if (el.classList.contains('button') || el.classList.contains('btn') || (el as HTMLElement).style.backgroundColor) {
      return 'button';
    }
    return 'link';
  }

  const text = el.textContent?.trim() || '';
  const lower = text.toLowerCase();
  if (lower.includes('confidencial') || lower.includes('aviso legal') || lower.includes('transmission is intended') || lower.includes('medio ambiente')) {
    return 'legal';
  }
  if (parseInt((el as HTMLElement).style.fontSize || '12px') >= 18 || el.tagName.toLowerCase() === 'h1' || el.tagName.toLowerCase() === 'h2') {
    return 'name';
  }
  if (lower.includes('director') || lower.includes('manager') || lower.includes('gerente') || lower.includes('asesor') || lower.includes('engineer')) {
    return 'cargo';
  }

  return 'text';
};

const getBlockName = (type: BlockType, el: Element): string => {
  const tagName = el.tagName.toLowerCase();
  switch (type) {
    case 'table': return 'Tabla Principal';
    case 'row': return 'Fila de Tabla';
    case 'cell': return 'Celda de Columna';
    case 'logo': return 'Logo Corporativo';
    case 'qr': return 'Código QR';
    case 'image': return 'Imagen / Avatar';
    case 'social': return `Red Social: ${el.getAttribute('href')?.split('.com')[0]?.split('//')[1]?.replace('www.', '') || 'Perfil'}`;
    case 'button': return 'Botón de Acción';
    case 'link': return 'Enlace';
    case 'legal': return 'Aviso Legal';
    case 'name': return 'Nombre';
    case 'cargo': return 'Cargo';
    default: return `Elemento: <${tagName}>`;
  }
};

// Generar árbol DOM simplificado para el panel lateral de estructura
export const buildDOMTree = (html: string): SignatureBlock[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const buildNode = (el: Element): SignatureBlock | null => {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return null;

    const sbId = el.getAttribute('data-sb-id') || '';
    const type = classifyTagToBlockType(el);
    const tagName = el.tagName.toLowerCase();

    // Parsear estilos inline
    const inlineStyles: Record<string, string> = {};
    const styleAttr = el.getAttribute('style') || '';
    if (styleAttr) {
      styleAttr.split(';').forEach((s) => {
        const parts = s.split(':');
        if (parts.length === 2) {
          inlineStyles[parts[0].trim()] = parts[1].trim();
        }
      });
    }

    // Parsear atributos
    const attributes: Record<string, string> = {};
    Array.from(el.attributes).forEach((attr) => {
      attributes[attr.name] = attr.value;
    });

    const children: SignatureBlock[] = [];
    Array.from(el.children).forEach((child) => {
      const childBlock = buildNode(child);
      if (childBlock) {
        children.push(childBlock);
      }
    });

    return {
      id: sbId || 'sb-gen-' + Math.random().toString(36).substr(2, 5),
      type,
      name: getBlockName(type, el),
      tagName,
      domPath: getDOMPath(el),
      content: children.length === 0 ? el.textContent?.trim() || '' : '',
      attributes,
      inlineStyles,
      children: children.length > 0 ? children : undefined
    };
  };

  const roots: SignatureBlock[] = [];
  Array.from(doc.body.children).forEach((child) => {
    const rootBlock = buildNode(child);
    if (rootBlock) {
      roots.push(rootBlock);
    }
  });

  return roots;
};

// Generar ruta de selector del DOM
const getDOMPath = (el: Element): string => {
  const path: string[] = [];
  let current: Element | null = el;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let name = current.tagName.toLowerCase();
    const sbId = current.getAttribute('data-sb-id');
    if (sbId) {
      name += `[data-sb-id="${sbId}"]`;
      path.unshift(name);
      break;
    }
    path.unshift(name);
    current = current.parentElement;
  }
  return path.join(' > ');
};

// Actualiza un elemento del DOM en la cadena HTML maestra usando su data-sb-id
export const updateHTMLNode = (
  html: string,
  sbId: string,
  updates: {
    content?: string;
    attributes?: Record<string, string>;
    inlineStyles?: Record<string, string>;
  }
): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const el = doc.querySelector(`[data-sb-id="${sbId}"]`);
  if (el) {
    // 1. Actualizar contenido
    if (updates.content !== undefined) {
      if (el.children.length === 0) {
        el.textContent = updates.content;
      } else {
        el.innerHTML = updates.content;
      }
    }

    // 2. Actualizar atributos
    if (updates.attributes) {
      Object.entries(updates.attributes).forEach(([key, val]) => {
        if (val === null || val === undefined) {
          el.removeAttribute(key);
        } else {
          el.setAttribute(key, val);
        }
      });
    }

    // 3. Actualizar estilos inline
    if (updates.inlineStyles) {
      const styles = { ...updates.inlineStyles };
      const styleString = Object.entries(styles)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ');

      if (styleString) {
        el.setAttribute('style', styleString);
      } else {
        el.removeAttribute('style');
      }
    }
  }

  return doc.body.innerHTML;
};
