export interface Attachment {
  id?: string;
  name?: string | null;
  size?: number | null;
  contentType?: string | null;
  contentDisposition?: string | null;
  contentId?: string | null;
}

/**
 * Compara el tamaño de un adjunto con los data URIs base64 en el cuerpo HTML
 * para determinar si es un recurso inline equivalente.
 */
export const isDataUriEquivalent = (attSize?: number | null, attType?: string | null, html?: string | null): boolean => {
  if (!html || typeof html !== 'string' || !attSize || typeof attSize !== 'number') return false;

  // Buscar todas las imágenes base64 en el HTML
  const regex = /src="data:(image\/[^;]+);base64,([^"]+)"/gi;
  let match;

  // Copia del html para evitar loops infinitos si regex se comparte
  const htmlCopy = html;

  while ((match = regex.exec(htmlCopy)) !== null) {
    const mime = match[1].toLowerCase();
    const base64Data = match[2];

    // El tamaño binario original es aprox 75% del tamaño de base64
    const calculatedSize = Math.round(base64Data.length * 0.75);

    // Verificar si el tipo de contenido coincide o si ambos son de tipo image/
    const attMime = attType ? attType.toLowerCase() : '';
    const isMimeMatch = attMime && (attMime === mime || mime.includes(attMime) || attMime.includes(mime) || (attMime.startsWith('image/') && mime.startsWith('image/')));

    if (isMimeMatch) {
      // Comparar tamaños con una tolerancia del 12% por si hay paddings/headers
      const sizeDiff = Math.abs(attSize - calculatedSize);
      const tolerance = attSize * 0.12;

      if (sizeDiff <= tolerance) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Determina si un adjunto es en realidad un recurso inline (no descargable por sí mismo)
 */
export const isInlineAttachment = (att: Attachment, html?: string | null): boolean => {
  if (!att) return false;

  // 1. Content-Disposition: inline es una señal de que es inline
  if (att.contentDisposition && typeof att.contentDisposition === 'string') {
    const disposition = att.contentDisposition.toLowerCase().trim();
    if (disposition === 'inline') {
      return true;
    }
  }

  // 2. Si hay HTML en el cuerpo, verificar referencias
  if (html && typeof html === 'string') {
    const htmlLower = html.toLowerCase();

    // 2a. Si tiene contentId, verificar su uso en el HTML
    if (att.contentId && typeof att.contentId === 'string' && att.contentId.trim().length > 0) {
      const cidLower = att.contentId.toLowerCase().trim();
      if (htmlLower.includes(`cid:${cidLower}`) || htmlLower.includes(cidLower)) {
        return true;
      }
    }

    // 2b. Si tiene id, verificar su uso en el HTML
    if (att.id && typeof att.id === 'string' && att.id.trim().length > 0) {
      const idLower = att.id.toLowerCase().trim();
      if (htmlLower.includes(`cid:${idLower}`) || htmlLower.includes(idLower)) {
        return true;
      }
    }

    // 2c. Si tiene un name (filename) y es referenciado como cid:name
    if (att.name && typeof att.name === 'string' && att.name.trim().length > 0) {
      const nameLower = att.name.toLowerCase().trim();
      if (htmlLower.includes(`cid:${nameLower}`)) {
        return true;
      }
    }

    // 2d. Verificar si coincide con un data URI equivalente
    if (att.size && att.size > 0) {
      const isImg = (att.contentType && att.contentType.toLowerCase().startsWith('image/')) ||
                    (att.name && /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(att.name));
      if (isImg && isDataUriEquivalent(att.size, att.contentType, html)) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Filtra y retorna únicamente los adjuntos reales (no inline)
 */
export const getRealAttachments = (attachments?: Attachment[] | null, html?: string | null): Attachment[] => {
  if (!attachments || !Array.isArray(attachments)) return [];
  return attachments.filter(att => att && !isInlineAttachment(att, html));
};

/**
 * Determina si el correo tiene adjuntos reales para mostrar el icono de clip
 */
export const hasRealAttachments = (attachments?: Attachment[] | null, html?: string | null): boolean => {
  return getRealAttachments(attachments, html).length > 0;
};
