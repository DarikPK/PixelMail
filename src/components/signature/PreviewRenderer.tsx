import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';

interface PreviewRendererProps {
  rawHTML: string;
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  previewMode: 'desktop' | 'mobile' | 'outlook' | 'gmail' | 'apple';
  zoom: number;
  gridVisible: boolean;
}

export const PreviewRenderer: React.FC<PreviewRendererProps> = ({
  rawHTML,
  selectedBlockId,
  onSelectBlock,
  previewMode,
  zoom,
  gridVisible
}) => {
  const isMobile = previewMode === 'mobile';
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // Generar el código HTML a inyectar en el Iframe
    // Agregamos estilos de selección temporales en el head del Iframe
    const selectionStyle = selectedBlockId
      ? `<style>
          [data-sb-id="${selectedBlockId}"] {
            outline: 2.5px solid #3B82F6 !important;
            outline-offset: 1px !important;
            cursor: pointer !important;
          }
          /* Cambiar el cursor a puntero en todos los elementos interactivos */
          [data-sb-id] {
            cursor: pointer !important;
          }
        </style>`
      : `<style>
          [data-sb-id] {
            cursor: pointer !important;
          }
        </style>`;

    const fullDocContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          ${selectionStyle}
          <style>
            body {
              margin: 0;
              padding: 10px;
              background-color: #FFFFFF;
              font-family: sans-serif;
              overflow-x: auto;
            }
          </style>
        </head>
        <body>
          ${rawHTML}
        </body>
      </html>
    `;

    doc.open();
    doc.write(fullDocContent);
    doc.close();

    // Adjuntar evento de clic dentro del Iframe para la selección interactiva
    const handleIframeClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      // Encontrar el ancestro más cercano que tenga un ID data-sb-id
      const clickableElement = target.closest('[data-sb-id]');
      if (clickableElement) {
        const sbId = clickableElement.getAttribute('data-sb-id');
        if (sbId) {
          onSelectBlock(sbId);
        }
      }
    };

    doc.addEventListener('click', handleIframeClick);

    return () => {
      doc.removeEventListener('click', handleIframeClick);
    };
  }, [rawHTML, selectedBlockId, onSelectBlock]);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        minHeight: '380px',
        bgcolor: '#ECEFF1',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        p: 2,
        backgroundSize: gridVisible ? '20px 20px' : '0 0',
        backgroundImage: gridVisible ? 'radial-gradient(circle, #CFD8DC 1px, transparent 1px)' : 'none',
        transition: 'all 200ms'
      }}
    >
      {/* Marco de Cliente de Correo Fotorrealista */}
      <Box
        sx={{
          transform: `scale(${zoom / 100})`,
          transition: 'transform 120ms ease-out',
          width: isMobile ? '360px' : '100%',
          maxWidth: '620px',
          boxShadow: '0 12px 28px rgba(0,0,0,0.1)',
          borderRadius: '8px',
          bgcolor: '#FFFFFF',
          border: '1.5px solid #CFD8DC',
          p: 2.5,
          position: 'relative'
        }}
      >
        {/* Encabezado del Cliente de Correo según pestaña */}
        {previewMode === 'gmail' && (
          <Box sx={{ mb: 2, p: 1, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#EF4444' }} />
            <Typography sx={{ fontSize: '9px', fontWeight: 'bold', color: '#1F2937', fontFamily: 'Inter' }}>
              Gmail Inbox - Previsualización Aislada
            </Typography>
          </Box>
        )}
        {previewMode === 'outlook' && (
          <Box sx={{ mb: 2, p: 1, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#0078D4' }} />
            <Typography sx={{ fontSize: '9px', fontWeight: 'bold', color: '#1F2937', fontFamily: 'Segoe UI' }}>
              Outlook Mail Client
            </Typography>
          </Box>
        )}
        {previewMode === 'apple' && (
          <Box sx={{ mb: 2, p: 1, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#8E8E93' }} />
            <Typography sx={{ fontSize: '9px', fontWeight: 'bold', color: '#1F2937', fontFamily: 'SF Pro Text' }}>
              Apple Mail Reader Card
            </Typography>
          </Box>
        )}

        {/* Zona de Mensaje Ficticia */}
        <Box sx={{ mb: 2, pb: 1, borderBottom: '1px dashed #E2E8F0' }}>
          <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 600, mb: 0.5 }}>
            Asunto: Envío de Nueva Firma HTML Profesional
          </Typography>
          <Typography sx={{ fontSize: '10.5px', color: '#475569', lineHeight: 1.4 }}>
            Hola, te adjunto el diseño HTML de firma importado. La estructura y los estilos inline originales se mantienen 100% estables y libres de interferencias.
          </Typography>
        </Box>

        {/* IFRAME DE LA FIRMA */}
        <iframe
          ref={iframeRef}
          title="Firma Previsualización Aislada"
          style={{
            width: '100%',
            height: '240px',
            border: 'none',
            display: 'block',
            backgroundColor: '#FFFFFF',
            borderRadius: '4px'
          }}
        />
      </Box>
    </Box>
  );
};
export default PreviewRenderer;
