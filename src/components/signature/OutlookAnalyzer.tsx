import React from 'react';
import { Box, Typography, Card, CardContent, Button, Divider } from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  AutoFixHigh as AutoFixIcon
} from '@mui/icons-material';
import type { SignatureBlock } from './types';

interface OutlookAnalyzerProps {
  blocks: SignatureBlock[];
  onOptimizeForOutlook: () => void;
}

export const OutlookAnalyzer: React.FC<OutlookAnalyzerProps> = ({
  blocks,
  onOptimizeForOutlook
}) => {
  // Heurística de detección de alertas de compatibilidad de Outlook
  const analyzeCompatibility = (): string[] => {
    const warnings: string[] = [];

    const checkNode = (node: SignatureBlock) => {
      // 1. Detección de border-radius
      if (node.inlineStyles?.['border-radius'] || node.attributes?.['border-radius']) {
        warnings.push(`⚠️ "${node.name}": 'border-radius' (bordes redondeados) podría ignorarse en Outlook Desktop.`);
      }

      // 2. Detección de box-shadow
      if (node.inlineStyles?.['box-shadow'] || node.attributes?.['box-shadow']) {
        warnings.push(`⚠️ "${node.name}": 'box-shadow' (sombras) no es compatible en Outlook.`);
      }

      // 3. Detección de SVG
      const src = node.attributes?.['src'] || node.content || '';
      if (node.tagName === 'img' && src.includes('.svg')) {
        warnings.push(`⚠️ "${node.name}": Los archivos SVG no se visualizan de manera confiable en Outlook. Te sugerimos usar PNG o JPG.`);
      }

      // 4. Detección de Base64
      if (node.tagName === 'img' && src.startsWith('data:image')) {
        warnings.push(`⚠️ "${node.name}": Las imágenes en Base64 se bloquean por defecto en Outlook Desktop. Te sugerimos usar URLs HTTPS externas.`);
      }

      // 5. Detección de flexbox o grid
      const display = node.inlineStyles?.['display'] || '';
      if (display.includes('flex') || display.includes('grid')) {
        warnings.push(`⚠️ "${node.name}": Flexbox o CSS Grid no son compatibles con Outlook. Usa tablas HTML.`);
      }

      // Procesar hijos recursivamente
      if (node.children) {
        node.children.forEach(checkNode);
      }
    };

    blocks.forEach(checkNode);
    return Array.from(new Set(warnings)); // Eliminar duplicados
  };

  const warningsList = analyzeCompatibility();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '12.5px', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
        📬 Auditoría Outlook Web & Desktop
      </Typography>

      <Divider />

      {warningsList.length === 0 ? (
        <Card variant="outlined" sx={{ borderColor: 'success.main', bgcolor: 'rgba(16,185,129,0.04)' }}>
          <CardContent sx={{ p: '12px !important', display: 'flex', alignItems: 'center', gap: 1 }}>
            <SuccessIcon color="success" sx={{ fontSize: '20px' }} />
            <Typography variant="caption" color="success.dark" sx={{ fontWeight: 'bold', fontSize: '10px' }}>
              ¡Excelente! No se detectaron problemas críticos de compatibilidad con Outlook.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', display: 'block', mb: 0.5 }}>
            Se encontraron los siguientes detalles que podrían comprometer la visualización de la firma en Outlook Desktop:
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, maxHeight: '200px', overflowY: 'auto' }}>
            {warningsList.map((warn, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start', bgcolor: '#FFFBEB', p: 1, borderRadius: '4px', border: '1px solid #FDE68A' }}>
                <WarningIcon sx={{ fontSize: '14px', color: '#F59E0B', mt: 0.2 }} />
                <Typography variant="caption" sx={{ fontSize: '9.5px', color: '#B45309', lineHeight: 1.35 }}>
                  {warn}
                </Typography>
              </Box>
            ))}
          </Box>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AutoFixIcon />}
            onClick={onOptimizeForOutlook}
            sx={{
              mt: 1,
              py: 0.6,
              fontSize: '10px',
              textTransform: 'none',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #0078D4 0%, #005A9E 100%)',
              boxShadow: '0 2px 4px rgba(0,120,212,0.15)'
            }}
          >
            Optimizar copia para Outlook
          </Button>
        </Box>
      )}
    </Box>
  );
};
export default OutlookAnalyzer;
