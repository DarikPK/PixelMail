export type ExportOption =
  | 'clean'
  | 'gmail'
  | 'outlook'
  | 'apple'
  | 'external_img'
  | 'base64_img';

export const exportBlocksToHTML = (
  rawHTML: string,
  option: ExportOption = 'clean'
): string => {
  if (!rawHTML) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHTML, 'text/html');

  // Remover atributos data-sb-id de previsualización interna para un HTML final ultra limpio
  doc.querySelectorAll('[data-sb-id]').forEach((el) => {
    el.removeAttribute('data-sb-id');
  });

  // Optimización Outlook: Remover base64 y bordes redondeados incompatibles
  if (option === 'outlook') {
    doc.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (src.startsWith('data:image')) {
        img.setAttribute('src', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100');
      }
      img.style.borderRadius = '';
    });

    doc.querySelectorAll('*').forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.borderRadius = '';
      htmlEl.style.boxShadow = '';
    });
  }

  // Optimización Gmail: Asegurar inline styles limpios
  if (option === 'gmail') {
    doc.querySelectorAll('*').forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style.display === 'flex' || htmlEl.style.display === 'grid') {
        htmlEl.style.display = 'block';
      }
    });
  }

  return doc.body.innerHTML;
};
