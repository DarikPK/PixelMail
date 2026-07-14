import type { SignatureBlock } from './types';

export type ExportOption =
  | 'clean'
  | 'gmail'
  | 'outlook'
  | 'apple'
  | 'external_img'
  | 'base64_img';

export const exportBlocksToHTML = (
  blocks: SignatureBlock[],
  option: ExportOption = 'clean'
): string => {
  // Configuración MSO para Outlook
  const isOutlook = option === 'outlook';
  const forceBase64 = option === 'base64_img';
  const forceExternal = option === 'external_img';

  let html = '';

  // Encabezados de compatibilidad de Outlook
  if (isOutlook) {
    html += `<!--[if mso]>\n<noscript>\n<xml>\n<o:OfficeDocumentSettings>\n<o:AllowPNG/>\n<o:PixelsPerInch>96</o:PixelsPerInch>\n</o:OfficeDocumentSettings>\n</xml>\n</noscript>\n<![endif]-->\n`;
  }

  html += `<table cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; border-collapse: collapse; line-height: 1.4;">`;

  blocks.forEach((block) => {
    if (block.hidden) return; // Saltar si el bloque está oculto

    // Configuración de alineación e inline styles
    const align = block.align || 'left';
    const padding = block.padding || '4px 0';
    const margin = block.margin || '0';
    const border = block.border ? `border: ${block.border};` : '';
    const borderRadius = block.borderRadius ? `border-radius: ${block.borderRadius};` : '';
    const bg = block.backgroundColor ? `background-color: ${block.backgroundColor};` : '';
    const shadow = block.shadow ? `box-shadow: ${block.shadow};` : '';

    const inlineStyles = `text-align: ${align}; padding: ${padding}; margin: ${margin}; ${border} ${borderRadius} ${bg} ${shadow} box-sizing: border-box;`;

    html += `<tr><td valign="top" style="${inlineStyles}">`;

    switch (block.type) {
      case 'name':
        html += `<div style="font-family: ${block.fontFamily || 'Inter'}, sans-serif; font-size: ${block.fontSize || '20px'}; font-weight: ${block.fontWeight || '700'}; color: ${block.color || '#1E293B'};">${block.content}</div>`;
        break;

      case 'cargo':
        html += `<div style="font-family: ${block.fontFamily || 'Inter'}, sans-serif; font-size: ${block.fontSize || '14px'}; font-weight: ${block.fontWeight || '500'}; color: ${block.color || '#3B82F6'};">${block.content}</div>`;
        break;

      case 'empresa':
        html += `<div style="font-family: ${block.fontFamily || 'Inter'}, sans-serif; font-size: ${block.fontSize || '12px'}; font-weight: 700; color: ${block.color || '#475569'};">${block.content}</div>`;
        break;

      case 'tel':
      case 'cel':
      case 'correo':
      case 'web':
      case 'direccion':
      case 'frase':
      case 'text':
        html += `<div style="font-family: ${block.fontFamily || 'Inter'}, sans-serif; font-size: ${block.fontSize || '12px'}; color: ${block.color || '#475569'};">${block.content}</div>`;
        break;

      case 'link':
        html += `<a href="${block.href || '#'}" style="font-family: ${block.fontFamily || 'Inter'}, sans-serif; font-size: ${block.fontSize || '12px'}; color: ${block.color || '#3B82F6'}; text-decoration: none; font-weight: ${block.fontWeight || 'bold'};">${block.content}</a>`;
        break;

      case 'button': {
        const btnColor = block.buttonColor || '#3B82F6';
        const radius = block.borderRadius || '6px';
        html += `<a href="${block.href || '#'}" style="display: inline-block; background-color: ${btnColor}; color: #FFFFFF; font-family: ${block.fontFamily || 'Inter'}, sans-serif; font-size: ${block.fontSize || '12px'}; font-weight: bold; text-decoration: none; padding: 8px 16px; border-radius: ${radius}; text-align: center;">${block.content}</a>`;
        break;
      }

      case 'separator':
        html += `<div style="border-top: 1px solid ${block.color || '#CBD5E1'}; height: 1px; width: 100%;"></div>`;
        break;

      case 'espaciador':
        html += `<div style="height: ${block.height || '12px'}; font-size: 1px; line-height: 1px;">&nbsp;</div>`;
        break;

      case 'logo':
      case 'image':
      case 'gif': {
        let imgSrc = block.content;
        // Forzar base64 o externos si corresponde
        if (forceBase64 && !imgSrc.startsWith('data:image')) {
          imgSrc = block.content;
        } else if (forceExternal && imgSrc.startsWith('data:image')) {
          imgSrc = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100';
        }
        const widthAttr = block.width ? `width="${block.width.replace('px', '')}"` : '';
        const heightAttr = block.height ? `height="${block.height.replace('px', '')}"` : '';
        const imgStyles = block.borderRadius ? `border-radius: ${block.borderRadius};` : '';

        html += `<img src="${imgSrc}" alt="${block.altText || 'Firma'}" ${widthAttr} ${heightAttr} style="display: block; max-width: 100%; border: 0; ${imgStyles}" />`;
        break;
      }

      case 'qr': {
        html += `<table cellpadding="0" cellspacing="0" border="0" style="display: inline-block; border-collapse: collapse; border: ${block.qrBorder || '1px solid #CBD5E1'}; border-radius: ${block.qrShape === 'circle' ? '50%' : '8px'}; background-color: #FFFFFF; padding: 10px;"><tr><td><img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(block.content)}" alt="QR" width="90" height="90" style="display: block; border: 0;" /></td></tr></table>`;
        break;
      }

      case 'legal': {
        const model = block.legalModel || 'estandar';
        let text = 'Por favor, considere el medio ambiente antes de imprimir este correo.';
        if (model === 'financiero') text = 'AVISO FINANCIERO: La información contenida en esta transmisión es de carácter estrictamente informativo y no constituye una oferta de compra/venta ni asesoría financiera formal.';
        if (model === 'corporativo') text = 'INFORMACIÓN CORPORATIVA: Este correo y sus archivos adjuntos están sujetos a las políticas de comunicación corporativa de Pixel S.A.C.';
        if (model === 'confidencial') text = 'CONFIDENCIALIDAD: Este mensaje es confidencial y para uso exclusivo del destinatario. Si lo recibe por error, por favor notifíquelo de inmediato al remitente y bórrelo de su sistema.';

        const legalStyles = `font-family: ${block.fontFamily || 'Inter'}, sans-serif; font-size: ${block.fontSize || '9.5px'}; color: ${block.color || '#94A3B8'}; line-height: 1.35;`;
        html += `<div style="${legalStyles}">${text}</div>`;
        break;
      }

      case 'estado': {
        const type = block.estadoType || 'disponible';
        let label = 'Disponible';
        let dotColor = '#22C55E';
        if (type === 'reunion') { label = 'En reunión'; dotColor = '#EF4444'; }
        if (type === 'vacaciones') { label = 'De vacaciones'; dotColor = '#F59E0B'; }
        if (type === 'fuera') { label = 'Fuera de oficina'; dotColor = '#64748B'; }

        html += `<table cellpadding="0" cellspacing="0" border="0" style="display: inline-block; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 20px; padding: 4px 12px;"><tr>` +
                `<td valign="middle" style="padding-right: 6px;"><table cellpadding="0" cellspacing="0" border="0" style="width: 8px; height: 8px; background-color: ${dotColor}; border-radius: 50%;"><tr><td></td></tr></table></td>` +
                `<td valign="middle" style="font-family: ${block.fontFamily || 'Inter'}, sans-serif; font-size: 11px; font-weight: bold; color: #475569; line-height: 1;">${label}</td>` +
                `</tr></table>`;
        break;
      }

      case 'social': {
        const platform = block.socialPlatform || 'linkedin';
        let label = 'LinkedIn';
        let color = '#0A66C2';
        if (platform === 'facebook') { label = 'Facebook'; color = '#1877F2'; }
        if (platform === 'instagram') { label = 'Instagram'; color = '#E4405F'; }
        if (platform === 'twitter') { label = 'Twitter'; color = '#1DA1F2'; }
        if (platform === 'youtube') { label = 'YouTube'; color = '#FF0000'; }
        if (platform === 'tiktok') { label = 'TikTok'; color = '#000000'; }
        if (platform === 'whatsapp') { label = 'WhatsApp'; color = '#25D366'; }

        html += `<a href="${block.href || '#'}" style="font-family: ${block.fontFamily || 'Inter'}, sans-serif; font-size: 12px; color: ${color}; text-decoration: none; font-weight: bold; margin-right: 12px; display: inline-block;">${label}</a>`;
        break;
      }

      case 'custom_html':
        html += block.content;
        break;

      default:
        break;
    }

    html += `</td></tr>`;
  });

  html += `</table>`;
  return html;
};
