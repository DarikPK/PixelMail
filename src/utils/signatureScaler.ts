/**
 * Aplica una escala proporcional a un HTML de firma sin utilizar transform: scale().
 * Modifica inline styles (width, height, font-size, padding, margin) y atributos de ancho/alto.
 */
export const applyScaleToHTML = (html: string, scale: number): string => {
  if (scale === 1 || !html) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Helper para escalar un valor de píxeles o número sin unidad
  const scaleValue = (valStr: string): string => {
    const trimmed = valStr.trim();
    if (!trimmed) return '';
    // Extraer número y unidad (ej. 14px, 120px)
    const num = parseFloat(trimmed);
    if (isNaN(num)) return trimmed;

    // Si tiene %, no lo escalamos
    if (trimmed.includes('%')) return trimmed;

    const unit = trimmed.replace(/^[-\d.]+/, '');
    const scaled = Math.round(num * scale);
    return `${scaled}${unit || 'px'}`;
  };

  // Helper para escalar propiedades CSS de un elemento
  const scaleStyleProperty = (styles: Record<string, string>, prop: string) => {
    if (styles[prop]) {
      const val = styles[prop];
      if (val.includes(' ') && (prop.includes('padding') || prop.includes('margin'))) {
        // Manejar shorthands como "padding: 10px 20px" o "margin: 8px 12px 14px"
        const parts = val.split(/\s+/);
        styles[prop] = parts.map(scaleValue).join(' ');
      } else {
        styles[prop] = scaleValue(val);
      }
    }
  };

  // Recorrer todos los elementos del cuerpo del DOM
  const allElements = doc.body.querySelectorAll('*');
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;

    // 1. Escalar atributos width y height (especialmente en table, td, img)
    const attrWidth = htmlEl.getAttribute('width');
    if (attrWidth) {
      if (!attrWidth.includes('%')) {
        const parsed = parseInt(attrWidth, 10);
        if (!isNaN(parsed)) {
          htmlEl.setAttribute('width', Math.round(parsed * scale).toString());
        }
      }
    }

    const attrHeight = htmlEl.getAttribute('height');
    if (attrHeight) {
      if (!attrHeight.includes('%')) {
        const parsed = parseInt(attrHeight, 10);
        if (!isNaN(parsed)) {
          htmlEl.setAttribute('height', Math.round(parsed * scale).toString());
        }
      }
    }

    // 2. Escalar inline styles
    if (htmlEl.style.cssText) {
      // Parsear estilos inline manualmente para preservar el orden y valores exactos
      const stylesList = htmlEl.style.cssText.split(';').map(s => s.trim()).filter(Boolean);
      const stylesRecord: Record<string, string> = {};

      stylesList.forEach((styleStr) => {
        const parts = styleStr.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim().toLowerCase();
          const val = parts.slice(1).join(':').trim();
          stylesRecord[key] = val;
        }
      });

      // Escalar propiedades específicas
      const propsToScale = [
        'font-size', 'line-height',
        'width', 'height',
        'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
        'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
        'border-width', 'border-radius', 'gap'
      ];

      propsToScale.forEach((prop) => {
        scaleStyleProperty(stylesRecord, prop);
      });

      // Reconstruir inline style string
      const reconstructed = Object.entries(stylesRecord)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ');
      htmlEl.style.cssText = reconstructed;
    }
  });

  return doc.body.innerHTML;
};
