import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import type { SignatureBlock } from './types';

interface PreviewRendererProps {
  blocks: SignatureBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  previewMode: 'desktop' | 'mobile' | 'outlook' | 'gmail' | 'apple';
  zoom: number;
  gridVisible: boolean;
}

export const PreviewRenderer: React.FC<PreviewRendererProps> = ({
  blocks,
  selectedBlockId,
  onSelectBlock,
  previewMode,
  zoom,
  gridVisible
}) => {
  const isMobile = previewMode === 'mobile';

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
              Gmail Inbox - Previsualización de Firma
            </Typography>
          </Box>
        )}
        {previewMode === 'outlook' && (
          <Box sx={{ mb: 2, p: 1, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#0078D4' }} />
            <Typography sx={{ fontSize: '9px', fontWeight: 'bold', color: '#1F2937', fontFamily: 'Segoe UI' }}>
              Outlook Desktop Web Mail
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

        {/* Zona del Mensaje Ficticia de Correo para dar Contexto */}
        <Box sx={{ mb: 2, pb: 1, borderBottom: '1px dashed #E2E8F0' }}>
          <Typography sx={{ fontSize: '11px', color: '#64748B', fontWeight: 600, mb: 0.5 }}>
            Asunto: Reunión de Coordinación de Nuevas Firmas Profesionales
          </Typography>
          <Typography sx={{ fontSize: '10.5px', color: '#475569', lineHeight: 1.4 }}>
            Hola, te adjunto la propuesta de firmas HTML avanzadas y el nuevo constructor visual. Quedo atento a tus valiosos comentarios corporativos.
          </Typography>
        </Box>

        {/* CONTENEDOR DE LA FIRMA */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1.0,
            p: 1,
            position: 'relative'
          }}
        >
          {blocks.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '12px' }}>
                Firma vacía. Agrega componentes desde el panel lateral izquierdo.
              </Typography>
            </Box>
          ) : (
            blocks.map((block) => {
              if (block.hidden) return null;
              const isSelected = selectedBlockId === block.id;

              const alignStyle = block.align || 'left';
              const marginStyle = block.margin || '4px 0';
              const paddingStyle = block.padding || '4px 0';
              const radiusStyle = block.borderRadius || '0';
              const bgStyle = block.backgroundColor || 'transparent';
              const shadowStyle = block.shadow || 'none';

              return (
                <Box
                  key={block.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBlock(block.id);
                  }}
                  sx={{
                    border: `1.8px solid ${isSelected ? '#3B82F6' : 'transparent'}`,
                    boxShadow: isSelected ? '0 0 0 2px rgba(59,130,246,0.18)' : shadowStyle,
                    borderRadius: isSelected ? '6px' : radiusStyle,
                    cursor: 'pointer',
                    p: paddingStyle,
                    m: marginStyle,
                    bgcolor: isSelected ? 'rgba(59,130,246,0.04)' : bgStyle,
                    borderStyle: block.border ? 'solid' : undefined,
                    borderWidth: block.border ? '1px' : undefined,
                    borderColor: block.border || undefined,
                    transition: 'all 120ms',
                    position: 'relative',
                    '&:hover': {
                      borderColor: isSelected ? '#3B82F6' : '#94A3B8'
                    }
                  }}
                >
                  {/* Selector visual: Borde azul en hover */}
                  {isSelected && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -8,
                        left: 4,
                        bgcolor: '#3B82F6',
                        color: '#FFFFFF',
                        px: 0.6,
                        py: 0.1,
                        borderRadius: '3px',
                        fontSize: '8px',
                        fontWeight: 'bold',
                        zIndex: 10,
                        textTransform: 'uppercase'
                      }}
                    >
                      {block.name}
                    </Box>
                  )}

                  {/* Renderizado específico de Bloques en el Canvas */}
                  {block.type === 'name' && (
                    <Typography
                      sx={{
                        fontFamily: block.fontFamily || 'Inter',
                        fontSize: block.fontSize || '17px',
                        fontWeight: block.fontWeight || '700',
                        color: block.color || '#1E293B',
                        textAlign: alignStyle
                      }}
                    >
                      {block.content}
                    </Typography>
                  )}

                  {block.type === 'cargo' && (
                    <Typography
                      sx={{
                        fontFamily: block.fontFamily || 'Inter',
                        fontSize: block.fontSize || '13px',
                        fontWeight: block.fontWeight || '500',
                        color: block.color || '#64748B',
                        textAlign: alignStyle
                      }}
                    >
                      {block.content}
                    </Typography>
                  )}

                  {block.type === 'empresa' && (
                    <Typography
                      sx={{
                        fontFamily: block.fontFamily || 'Inter',
                        fontSize: block.fontSize || '12px',
                        fontWeight: block.fontWeight || 'bold',
                        color: block.color || '#475569',
                        textAlign: alignStyle
                      }}
                    >
                      {block.content}
                    </Typography>
                  )}

                  {['tel', 'cel', 'correo', 'web', 'direccion', 'frase', 'text'].includes(block.type) && (
                    <Typography
                      sx={{
                        fontFamily: block.fontFamily || 'Inter',
                        fontSize: block.fontSize || '11.5px',
                        color: block.color || '#475569',
                        textAlign: alignStyle,
                        fontWeight: block.fontWeight || 'normal'
                      }}
                    >
                      {block.content}
                    </Typography>
                  )}

                  {block.type === 'link' && (
                    <Typography
                      component="a"
                      href={block.href || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        fontFamily: block.fontFamily || 'Inter',
                        fontSize: block.fontSize || '11.5px',
                        color: block.color || '#3B82F6',
                        textAlign: alignStyle,
                        textDecoration: 'underline',
                        fontWeight: block.fontWeight || '500',
                        display: 'inline-block'
                      }}
                    >
                      {block.content}
                    </Typography>
                  )}

                  {block.type === 'button' && (
                    <Box sx={{ textAlign: alignStyle }}>
                      <Button
                        size="small"
                        sx={{
                          bgcolor: block.buttonColor || '#3B82F6',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          textTransform: 'none',
                          py: 0.4,
                          px: 1.5,
                          borderRadius: block.borderRadius || '6px',
                          fontWeight: 'bold',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                          '&:hover': {
                            bgcolor: block.buttonColor || '#3B82F6',
                            opacity: 0.9
                          }
                        }}
                      >
                        {block.content}
                      </Button>
                    </Box>
                  )}

                  {block.type === 'separator' && (
                    <Box sx={{ borderTop: `1px solid ${block.color || '#E2E8F0'}`, width: '100%', my: 0.5 }} />
                  )}

                  {block.type === 'espaciador' && (
                    <Box sx={{ height: block.height || '12px' }} />
                  )}

                  {block.type === 'gif' || block.type === 'logo' || block.type === 'image' ? (
                    <Box sx={{ textAlign: alignStyle }}>
                      <img
                        src={block.content || 'https://via.placeholder.com/120'}
                        alt={block.altText || 'Firma de correo'}
                        style={{
                          maxWidth: '100%',
                          width: block.width || 'auto',
                          height: block.height || 'auto',
                          borderRadius: block.borderRadius || '0'
                        }}
                      />
                    </Box>
                  ) : null}

                  {block.type === 'qr' && (
                    <Box sx={{ border: block.qrBorder || '1.5px dashed #10B981', borderRadius: block.qrShape === 'circle' ? '50%' : '6px', p: 1, width: '90px', height: '90px', mx: alignStyle === 'center' ? 'auto' : alignStyle === 'right' ? '0' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#FFF' }}>
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(block.content)}`} alt="QR" style={{ width: '70px', height: '70px' }} />
                    </Box>
                  )}

                  {block.type === 'legal' && (
                    <Typography variant="caption" sx={{ fontFamily: block.fontFamily || 'Inter', fontSize: '9.5px', color: block.color || 'text.disabled', textAlign: alignStyle, display: 'block', lineHeight: 1.3 }}>
                      {block.legalModel === 'financiero' && 'AVISO FINANCIERO: La información contenida en esta transmisión es de carácter estrictamente informativo y no constituye una oferta de compra/venta ni asesoría financiera formal.'}
                      {block.legalModel === 'corporativo' && 'INFORMACIÓN CORPORATIVA: Este correo y sus archivos adjuntos están sujetos a las políticas de comunicación corporativa de Pixel S.A.C.'}
                      {block.legalModel === 'confidencial' && 'CONFIDENCIALIDAD: Este mensaje es confidencial y para uso exclusivo del destinatario. Si lo recibe por error, por favor notifíquelo de inmediato al remitente y bórrelo de su sistema.'}
                      {(block.legalModel === 'estandar' || !block.legalModel) && 'Por favor, considere el medio ambiente antes de imprimir este correo electrónico.'}
                    </Typography>
                  )}

                  {block.type === 'estado' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, justifyContent: alignStyle === 'center' ? 'center' : alignStyle === 'right' ? 'flex-end' : 'flex-start' }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: block.estadoType === 'reunion' ? '#EF4444' : block.estadoType === 'vacaciones' ? '#F59E0B' : block.estadoType === 'fuera' ? '#64748B' : '#22C55E' }} />
                      <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '11px', color: 'text.secondary' }}>
                        {block.estadoType === 'reunion' ? 'En reunión' : block.estadoType === 'vacaciones' ? 'De vacaciones' : block.estadoType === 'fuera' ? 'Fuera de oficina' : 'Disponible'}
                      </Typography>
                    </Box>
                  )}

                  {block.type === 'social' && (
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: alignStyle === 'center' ? 'center' : alignStyle === 'right' ? 'flex-end' : 'flex-start' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#3B82F6' }}>
                        {block.socialPlatform?.toUpperCase() || 'LINKEDIN'}
                      </span>
                    </Box>
                  )}

                  {block.type === 'custom_html' && (
                    <div dangerouslySetInnerHTML={{ __html: block.content }} />
                  )}
                </Box>
              );
            })
          )}
        </Box>
      </Box>
    </Box>
  );
};
export default PreviewRenderer;
