export const PREDEFINED_COMPONENTS = [
  // ==========================================
  // BÁSICOS
  // ==========================================
  {
    id: 'comp-info-personal',
    category: 'Básicos',
    name: 'Información Personal',
    description: 'Nombre completo, cargo, empresa y datos esenciales perfectamente alineados.',
    icon: '👤',
    keywords: ['nombre', 'cargo', 'empresa', 'personal', 'perfil', 'usuario', 'puesto', 'trabajo'],
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
    id: 'comp-texto',
    category: 'Básicos',
    name: 'Texto Libre',
    description: 'Párrafo de texto libre personalizable para lemas o frases.',
    icon: '📝',
    keywords: ['texto', 'libre', 'frase', 'lema', 'parrafo', 'nota', 'comentario'],
    blocks: [
      { id: 'b-text-val', type: 'text', content: 'Escribe tu lema corporativo o una nota aquí.', fontFamily: 'Inter', fontSize: '12px', color: '#64748B' }
    ]
  },
  {
    id: 'comp-separador',
    category: 'Básicos',
    name: 'Separador',
    description: 'Línea divisoria delgada para segmentar secciones.',
    icon: '➖',
    keywords: ['separador', 'linea', 'division', 'divider', 'barra'],
    blocks: [
      { id: 'b-sep-val', type: 'separator', color: '#E2E8F0', margin: '10px 0' }
    ]
  },
  {
    id: 'comp-espaciador',
    category: 'Básicos',
    name: 'Espaciador',
    description: 'Espacio vertical transparente y ajustable en altura.',
    icon: '🔲',
    keywords: ['espaciador', 'espacio', 'blanco', 'separacion', 'alto', 'height', 'margin'],
    blocks: [
      { id: 'b-space-val', type: 'espaciador', height: '15px' }
    ]
  },

  // ==========================================
  // IMÁGENES
  // ==========================================
  {
    id: 'comp-logo',
    category: 'Imágenes',
    name: 'Logo o Foto',
    description: 'Imagen, fotografía personal o logo corporativo circular.',
    icon: '🖼',
    keywords: ['logo', 'foto', 'imagen', 'avatar', 'fotografia', 'marca', 'compañia', 'corporativo'],
    blocks: [
      { id: 'b-logo-val', type: 'gif', content: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100', borderRadius: '50%', border: '2px solid #3B82F6', align: 'center' }
    ]
  },
  {
    id: 'comp-qr',
    category: 'Imágenes',
    name: 'Código QR',
    description: 'Código QR interactivo con leyenda personalizada.',
    icon: '🔳',
    keywords: ['qr', 'codigo', 'escanear', 'vcard', 'link', 'enlace', 'imagen', 'celular', 'contacto'],
    blocks: [
      { id: 'b-qr-val', type: 'qr', content: 'https://pixel.com.pe', qrShape: 'square', qrBorder: '1px solid #10B981' },
      { id: 'b-qr-text', type: 'text', content: 'Escanéame para visitar sitio web', fontSize: '11px', color: '#64748B', align: 'center' }
    ]
  },
  {
    id: 'comp-gif',
    category: 'Imágenes',
    name: 'GIF Animado',
    description: 'Logotipos animados o pancartas dinámicas en movimiento.',
    icon: '🎬',
    keywords: ['gif', 'animado', 'movimiento', 'animacion', 'video', 'imagen', 'reproductor'],
    blocks: [
      { id: 'b-gif-val', type: 'gif', content: 'https://media.giphy.com/media/l0HlIDU1mFT9fL40o/giphy.gif', borderRadius: '8px' }
    ]
  },
  {
    id: 'comp-banner',
    category: 'Imágenes',
    name: 'Banner Promocional',
    description: 'Pancarta horizontal de ancho completo para campañas.',
    icon: '🚩',
    keywords: ['banner', 'promocional', 'campaña', 'oferta', 'descuento', 'horizontal', 'imagen', 'publicidad'],
    blocks: [
      { id: 'b-banner-val', type: 'gif', content: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=600&h=120', borderRadius: '4px', margin: '8px 0' }
    ]
  },

  // ==========================================
  // CONTACTO
  // ==========================================
  {
    id: 'comp-telefono',
    category: 'Contacto',
    name: 'Teléfono',
    description: 'Enlace telefónico con icono para llamadas directas.',
    icon: '📞',
    keywords: ['telefono', 'telf', 'llamar', 'llamada', 'fijo', 'contacto', 'celular'],
    blocks: [
      { id: 'b-tel-val-alone', type: 'link', content: '📞 Telf: +51 1 234 5678', href: 'tel:+5112345678', color: '#475569', fontSize: '12px' }
    ]
  },
  {
    id: 'comp-correo',
    category: 'Contacto',
    name: 'Correo Electrónico',
    description: 'Dirección de correo electrónico con enlace directo mailto.',
    icon: '✉',
    keywords: ['correo', 'email', 'e-mail', 'mailto', 'mensaje', 'contacto'],
    blocks: [
      { id: 'b-email-val-alone', type: 'link', content: '✉ correo@ejemplo.com', href: 'mailto:correo@ejemplo.com', color: '#3B82F6', fontSize: '12px' }
    ]
  },
  {
    id: 'comp-sitio-web',
    category: 'Contacto',
    name: 'Sitio Web',
    description: 'Enlace a la página web corporativa o personal.',
    icon: '🌐',
    keywords: ['sitio', 'web', 'pagina', 'internet', 'link', 'portal', 'url'],
    blocks: [
      { id: 'b-web-val-alone', type: 'link', content: '🌐 www.sitio-web.com', href: 'https://ejemplo.com', color: '#3B82F6', fontSize: '12px', fontWeight: 'bold' }
    ]
  },
  {
    id: 'comp-direccion',
    category: 'Contacto',
    name: 'Dirección',
    description: 'Dirección de oficina física o domicilio.',
    icon: '📍',
    keywords: ['direccion', 'oficina', 'domicilio', 'ubicacion', 'mapa', 'google maps', 'sede'],
    blocks: [
      { id: 'b-dir-val', type: 'text', content: '📍 Calle Las Begonias 450, San Isidro, Lima', fontFamily: 'Inter', fontSize: '12px', color: '#475569' }
    ]
  },

  // ==========================================
  // ACCIONES
  // ==========================================
  {
    id: 'comp-action-whatsapp',
    category: 'Acciones',
    name: 'Botón de WhatsApp',
    description: 'Botón rápido estilizado para chatear por WhatsApp.',
    icon: '💬',
    keywords: ['whatsapp', 'chat', 'mensaje', 'escribir', 'celular', 'movil', 'wa.me', 'verde'],
    blocks: [
      { id: 'b-btn-wa', type: 'button', content: '💬 Chat por WhatsApp', buttonColor: '#25D366', href: 'https://wa.me/51900000000', borderRadius: '20px' }
    ]
  },
  {
    id: 'comp-action-meeting',
    category: 'Acciones',
    name: 'Agendar Reunión',
    description: 'Botón con enlace para programar citas o reuniones (Calendly).',
    icon: '📅',
    keywords: ['agendar', 'reunion', 'calendly', 'cita', 'agenda', 'calendario', 'programar', 'meet'],
    blocks: [
      { id: 'b-btn-meet', type: 'button', content: '📅 Agendar Reunión', buttonColor: '#3B82F6', href: 'https://calendly.com', borderRadius: '6px' }
    ]
  },
  {
    id: 'comp-action-web',
    category: 'Acciones',
    name: 'Visitar Sitio Web',
    description: 'Botón premium para dirigir tráfico a tu portal principal.',
    icon: '🔗',
    keywords: ['visitar', 'sitio', 'web', 'boton', 'empresa', 'principal', 'ir', 'navegar'],
    blocks: [
      { id: 'b-btn-web', type: 'button', content: '🔗 Visitar Sitio Web', buttonColor: '#1E293B', href: 'https://pixel.com.pe', borderRadius: '6px' }
    ]
  },
  {
    id: 'comp-action-custom',
    category: 'Acciones',
    name: 'Botón Personalizado',
    description: 'Botón de llamada a la acción libremente configurable.',
    icon: '🎛',
    keywords: ['boton', 'personalizado', 'libre', 'accion', 'click', 'clic', 'custom', 'enlace'],
    blocks: [
      { id: 'b-btn-custom', type: 'button', content: 'Botón Personalizado', buttonColor: '#8B5CF6', href: '#', borderRadius: '6px' }
    ]
  },

  // ==========================================
  // SOCIAL
  // ==========================================
  {
    id: 'comp-social-linkedin',
    category: 'Social',
    name: 'LinkedIn',
    description: 'Enlace profesional de LinkedIn.',
    icon: '💼',
    keywords: ['linkedin', 'red', 'social', 'profesional', 'empleo', 'contacto', 'curriculum', 'cv'],
    blocks: [
      { id: 'b-li-val-alone', type: 'social', content: 'https://linkedin.com', socialPlatform: 'linkedin' }
    ]
  },
  {
    id: 'comp-social-facebook',
    category: 'Social',
    name: 'Facebook',
    description: 'Enlace a página o perfil de Facebook.',
    icon: '📘',
    keywords: ['facebook', 'fb', 'red', 'social', 'fanpage', 'perfil'],
    blocks: [
      { id: 'b-fb-val-alone', type: 'social', content: 'https://facebook.com', socialPlatform: 'facebook' }
    ]
  },
  {
    id: 'comp-social-instagram',
    category: 'Social',
    name: 'Instagram',
    description: 'Enlace a perfil visual de Instagram.',
    icon: '📸',
    keywords: ['instagram', 'ig', 'fotos', 'red', 'social', 'perfil'],
    blocks: [
      { id: 'b-ig-val-alone', type: 'social', content: 'https://instagram.com', socialPlatform: 'instagram' }
    ]
  },
  {
    id: 'comp-social-tiktok',
    category: 'Social',
    name: 'TikTok',
    description: 'Enlace a canal de videos rápidos TikTok.',
    icon: '🎵',
    keywords: ['tiktok', 'videos', 'red', 'social', 'canal', 'viral'],
    blocks: [
      { id: 'b-tk-val-alone', type: 'social', content: 'https://tiktok.com', socialPlatform: 'tiktok' }
    ]
  },
  {
    id: 'comp-social-youtube',
    category: 'Social',
    name: 'YouTube',
    description: 'Enlace directo a canal corporativo de YouTube.',
    icon: '📺',
    keywords: ['youtube', 'videos', 'canal', 'red', 'social', 'corporativo', 'reproductor', 'google'],
    blocks: [
      { id: 'b-yt-val-alone', type: 'social', content: 'https://youtube.com', socialPlatform: 'youtube' }
    ]
  },

  // ==========================================
  // LEGAL
  // ==========================================
  {
    id: 'comp-legal-standard',
    category: 'Legal',
    name: 'Aviso Legal',
    description: 'Declaración ecológica / estándar sobre el medio ambiente.',
    icon: '⚖',
    keywords: ['aviso', 'legal', 'ecologico', 'medio', 'ambiente', 'imprimir', 'papel', 'hoja', 'verde'],
    blocks: [
      { id: 'b-legal-eco', type: 'legal', legalModel: 'estandar', fontSize: '9.5px', color: '#94A3B8' }
    ]
  },
  {
    id: 'comp-legal-confidential',
    category: 'Legal',
    name: 'Confidencialidad',
    description: 'Declaración estricta de confidencialidad para correos corporativos.',
    icon: '🔒',
    keywords: ['confidencialidad', 'confidencial', 'privado', 'seguro', 'transmisión', 'correo', 'secreto', 'corporativo', 'legal'],
    blocks: [
      { id: 'b-legal-conf', type: 'legal', legalModel: 'confidencial', fontSize: '9.5px', color: '#94A3B8' }
    ]
  }
] as any;
