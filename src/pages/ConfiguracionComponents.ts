export const PREDEFINED_COMPONENTS = [
  {
    id: 'comp-info-personal',
    name: '👤 Información Personal',
    description: 'Incluye nombre, cargo y datos de contacto perfectamente alineados.',
    icon: '👤',
    blocks: [
      { id: 'b-name-val', type: 'name', content: 'Nombre Completo', fontFamily: 'Inter', fontSize: '18px', fontWeight: '700', color: '#1E293B' },
      { id: 'b-cargo-val', type: 'cargo', content: 'Cargo / Puesto', fontFamily: 'Inter', fontSize: '13px', fontWeight: '500', color: '#3B82F6' },
      { id: 'b-space-contact', type: 'espaciador', content: '', height: '6px' },
      { id: 'b-tel-val', type: 'link', content: '📱 +51 900 000 000', href: 'tel:+51900000000', color: '#475569', fontSize: '12px' },
      { id: 'b-email-val', type: 'link', content: '✉ correo@ejemplo.com', href: 'mailto:correo@ejemplo.com', color: '#475569', fontSize: '12px' },
      { id: 'b-web-val', type: 'link', content: '🌐 sitio-web.com', href: 'https://ejemplo.com', color: '#3B82F6', fontSize: '12px' }
    ]
  },
  {
    id: 'comp-logo',
    name: '🖼 Logo o Foto',
    description: 'Avatar o logotipo circular con borde estilizado.',
    icon: '🖼',
    blocks: [
      { id: 'b-logo-val', type: 'gif', content: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100', borderRadius: '50%', border: '2px solid #3B82F6', align: 'center' }
    ]
  },
  {
    id: 'comp-qr',
    name: '🔳 Código QR',
    description: 'Código QR interactivo con leyenda personalizada.',
    icon: '🔳',
    blocks: [
      { id: 'b-qr-val', type: 'qr', content: 'https://pixel.com.pe', qrShape: 'square', qrBorder: '1px solid #10B981' },
      { id: 'b-qr-text', type: 'text', content: 'Escanéame para guardar contacto', fontSize: '11px', color: '#64748B', align: 'center' }
    ]
  },
  {
    id: 'comp-botones',
    name: '🎛 Botones de Acción',
    description: 'Botón de llamada a la acción premium para agendar o chatear.',
    icon: '🎛',
    blocks: [
      { id: 'b-btn-action', type: 'button', content: '📅 Agendar Reunión', buttonColor: '#3B82F6', href: 'https://calendly.com', borderRadius: '6px' }
    ]
  },
  {
    id: 'comp-redes',
    name: '🌐 Redes Sociales',
    description: 'Enlaces directos a tus perfiles profesionales.',
    icon: '🌐',
    blocks: [
      { id: 'b-li-val', type: 'social', content: 'https://linkedin.com', socialPlatform: 'linkedin' },
      { id: 'b-fb-val', type: 'social', content: 'https://facebook.com', socialPlatform: 'facebook' }
    ]
  },
  {
    id: 'comp-gif',
    name: '🎬 GIF Animado',
    description: 'Componente especial para logotipos o banners en movimiento.',
    icon: '🎬',
    blocks: [
      { id: 'b-gif-val', type: 'gif', content: 'https://media.giphy.com/media/l0HlIDU1mFT9fL40o/giphy.gif', borderRadius: '8px' }
    ]
  },
  {
    id: 'comp-separador',
    name: '➖ Separador',
    description: 'Línea divisoria delgada para segmentar la firma.',
    icon: '➖',
    blocks: [
      { id: 'b-sep-val', type: 'separator', color: '#E2E8F0', margin: '10px 0' }
    ]
  },
  {
    id: 'comp-banner',
    name: '🚩 Banner Promocional',
    description: 'Imagen horizontal de ancho completo para ofertas o avisos.',
    icon: '🚩',
    blocks: [
      { id: 'b-banner-val', type: 'gif', content: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=600&h=120', borderRadius: '4px', margin: '8px 0' }
    ]
  },
  {
    id: 'comp-legal',
    name: '⚖ Aviso Legal',
    description: 'Componente especializado con modelos legales de confidencialidad.',
    icon: '⚖',
    blocks: [
      { id: 'b-legal-val', type: 'legal', legalModel: 'confidencial' }
    ]
  },
  {
    id: 'comp-estado',
    name: '🟢 Estado de Disponibilidad',
    description: 'Indicador de disponibilidad en tiempo real.',
    icon: '🟢',
    blocks: [
      { id: 'b-estado-val', type: 'estado', content: 'Disponible', estadoType: 'disponible', align: 'left' }
    ]
  },
  {
    id: 'comp-espaciador',
    name: '🔲 Espaciador',
    description: 'Espacio vertical en blanco ajustable.',
    icon: '🔲',
    blocks: [
      { id: 'b-space-val', type: 'espaciador', height: '15px' }
    ]
  }
] as any;
