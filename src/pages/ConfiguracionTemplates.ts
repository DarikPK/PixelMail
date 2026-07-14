export const PREMIUM_TEMPLATES = [
  {
    id: 'profesional',
    name: 'Profesional Clásico',
    category: 'Negocios',
    description: 'Firma corporativa tradicional, bien balanceada con logo circular y datos a la derecha.',
    rows: [
      {
        id: 'prof-row-1',
        columns: [
          {
            id: 'prof-col-1',
            widthPercent: 25,
            blocks: [
              { id: 'prof-gif-1', type: 'gif', content: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100', borderRadius: '50%', border: '2px solid #3B82F6', align: 'center' }
            ]
          },
          {
            id: 'prof-col-2',
            widthPercent: 75,
            blocks: [
              { id: 'prof-name', type: 'name', content: 'Sofía Valdivia M.', fontFamily: 'Inter', fontSize: '18px', fontWeight: '700', color: '#1E293B' },
              { id: 'prof-cargo', type: 'cargo', content: 'Directora de Operaciones', fontFamily: 'Inter', fontSize: '12px', fontWeight: '600', color: '#3B82F6' },
              { id: 'prof-esp-1', type: 'espaciador', content: '', height: '6px' },
              { id: 'prof-tel', type: 'link', content: '📞 +51 987 654 321', href: 'tel:+51987654321', color: '#475569', fontSize: '12px' },
              { id: 'prof-web', type: 'link', content: '🌐 pixel.com.pe', href: 'https://pixel.com.pe', color: '#3B82F6', fontSize: '12px' }
            ]
          }
        ]
      },
      {
        id: 'prof-row-2',
        columns: [
          {
            id: 'prof-col-3',
            widthPercent: 100,
            blocks: [
              { id: 'prof-sep', type: 'separator', content: '', color: '#CBD5E1', margin: '8px 0' },
              { id: 'prof-estado', type: 'estado', content: 'Disponible', estadoType: 'disponible', align: 'left' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'corporativa',
    name: 'Corporativa Premium',
    category: 'Corporativo',
    description: 'Estructura robusta de dos columnas con un banner de promoción inferior y aviso de confidencialidad.',
    rows: [
      {
        id: 'corp-row-1',
        columns: [
          {
            id: 'corp-col-1',
            widthPercent: 30,
            blocks: [
              { id: 'corp-gif', type: 'gif', content: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100', borderRadius: '8px' }
            ]
          },
          {
            id: 'corp-col-2',
            widthPercent: 70,
            blocks: [
              { id: 'corp-name', type: 'name', content: 'Ing. Carlos Mendoza', fontFamily: 'Roboto', fontSize: '19px', fontWeight: '700', color: '#0F172A' },
              { id: 'corp-cargo', type: 'cargo', content: 'Gerente General', fontFamily: 'Roboto', fontSize: '13px', fontWeight: '500', color: '#64748B' },
              { id: 'corp-sep-v', type: 'separator', content: '', color: '#CBD5E1', margin: '4px 0' },
              { id: 'corp-tel', type: 'link', content: '✉ carlos.mendoza@pixel.com.pe', href: 'mailto:carlos.mendoza@pixel.com.pe', color: '#475569', fontSize: '12px' }
            ]
          }
        ]
      },
      {
        id: 'corp-row-2',
        columns: [
          {
            id: 'corp-col-3',
            widthPercent: 100,
            blocks: [
              { id: 'corp-banner', type: 'gif', content: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=600&h=80', borderRadius: '4px', margin: '10px 0' },
              { id: 'corp-legal', type: 'legal', content: '', legalModel: 'corporativo' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'financiera',
    name: 'Financiera Elite',
    category: 'Finanzas',
    description: 'Estilo formal y sofisticado con acentos dorados y advertencia legal detallada de confidencialidad.',
    rows: [
      {
        id: 'fin-row-1',
        columns: [
          {
            id: 'fin-col-1',
            widthPercent: 70,
            blocks: [
              { id: 'fin-name', type: 'name', content: 'Beatriz Larrea', fontFamily: 'Georgia', fontSize: '20px', fontWeight: 'bold', color: '#1E293B' },
              { id: 'fin-cargo', type: 'cargo', content: 'Asesora Senior de Portafolio', fontFamily: 'Georgia', fontSize: '13px', color: '#B45309' },
              { id: 'fin-tel', type: 'text', content: 'Telf: +51 1 450 8900 | Anexo 420', fontSize: '11.5px', color: '#475569' }
            ]
          },
          {
            id: 'fin-col-2',
            widthPercent: 30,
            blocks: [
              { id: 'fin-qr', type: 'qr', content: 'https://pixel.com.pe/beatriz', qrShape: 'square', qrBorder: '1px solid #B45309' }
            ]
          }
        ]
      },
      {
        id: 'fin-row-2',
        columns: [
          {
            id: 'fin-col-3',
            widthPercent: 100,
            blocks: [
              { id: 'fin-sep', type: 'separator', content: '', color: '#B45309', margin: '6px 0' },
              { id: 'fin-legal', type: 'legal', content: '', legalModel: 'financiero' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'tecnologica',
    name: 'Tecnológica Moderna',
    category: 'Tecnología',
    description: 'Tonos neón brillantes, fuente Inter limpia, botones interactivos con iconos y un estado de disponibilidad activo.',
    rows: [
      {
        id: 'tech-row-1',
        columns: [
          {
            id: 'tech-col-1',
            widthPercent: 100,
            blocks: [
              { id: 'tech-name', type: 'name', content: 'Alex Rivera', fontFamily: 'Inter', fontSize: '21px', fontWeight: '800', color: '#0F172A' },
              { id: 'tech-cargo', type: 'cargo', content: 'Lead DevOps Engineer 🚀', fontFamily: 'Inter', fontSize: '13px', fontWeight: '600', color: '#06B6D4' },
              { id: 'tech-estado', type: 'estado', content: 'En reunión', estadoType: 'reunion', margin: '4px 0' }
            ]
          }
        ]
      },
      {
        id: 'tech-row-2',
        columns: [
          {
            id: 'tech-col-2',
            widthPercent: 50,
            blocks: [
              { id: 'tech-btn-sch', type: 'button', content: '📅 Agendar Reunión', buttonColor: '#06B6D4', href: 'https://calendly.com/alex' }
            ]
          },
          {
            id: 'tech-col-3',
            widthPercent: 50,
            blocks: [
              { id: 'tech-btn-li', type: 'button', content: '🔗 LinkedIn Perfil', buttonColor: '#0A66C2', href: 'https://linkedin.com' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'minimalista',
    name: 'Minimalista Esencial',
    category: 'Diseño',
    description: 'Máxima simpleza, espaciados ligeros, ideal para agencias creativas y arquitectos.',
    rows: [
      {
        id: 'min-row-1',
        columns: [
          {
            id: 'min-col-1',
            widthPercent: 100,
            blocks: [
              { id: 'min-name', type: 'name', content: 'MATEO SILVA', fontFamily: 'Helvetica', fontSize: '16px', fontWeight: 'normal', color: '#111111', align: 'center' },
              { id: 'min-cargo', type: 'cargo', content: 'ARQUITECTO', fontFamily: 'Helvetica', fontSize: '11px', color: '#888888', align: 'center' },
              { id: 'min-sep', type: 'separator', content: '', color: '#EEEEEE', margin: '8px 0' },
              { id: 'min-tel', type: 'link', content: 'mateosila.com', href: 'https://pixel.com.pe', color: '#444444', align: 'center', fontSize: '11px' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'ejecutiva',
    name: 'Ejecutiva Premium',
    category: 'Premium',
    description: 'Diseño sobrio y elegante de alta gama con paleta oscura, fuentes serif elegantes y foto premium.',
    rows: [
      {
        id: 'exec-row-1',
        columns: [
          {
            id: 'exec-col-1',
            widthPercent: 30,
            blocks: [
              { id: 'exec-avatar', type: 'gif', content: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=100&h=120', borderRadius: '4px' }
            ]
          },
          {
            id: 'exec-col-2',
            widthPercent: 70,
            blocks: [
              { id: 'exec-name', type: 'name', content: 'Dr. Guillermo Prado', fontFamily: 'Georgia', fontSize: '22px', fontWeight: '700', color: '#1E293B' },
              { id: 'exec-cargo', type: 'cargo', content: 'Director de Estrategia Corporativa', fontFamily: 'Georgia', fontSize: '13px', color: '#64748B' },
              { id: 'exec-sep', type: 'separator', content: '', color: '#334155', margin: '6px 0' },
              { id: 'exec-contact', type: 'text', content: '🏢 Calle Las Begonias 450, San Isidro', fontSize: '11.5px', color: '#475569' },
              { id: 'exec-btn', type: 'button', content: 'Ver Reporte de Gobierno', buttonColor: '#1E293B', href: '#' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'premium',
    name: 'Pixel Premium Banner',
    category: 'Marketing',
    description: 'Incluye logo animado GIF, código QR, banner de alto impacto y redes sociales.',
    rows: [
      {
        id: 'prem-row-1',
        columns: [
          {
            id: 'prem-col-1',
            widthPercent: 20,
            blocks: [
              { id: 'prem-logo', type: 'gif', content: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=80&h=80', borderRadius: '12px' }
            ]
          },
          {
            id: 'prem-col-2',
            widthPercent: 60,
            blocks: [
              { id: 'prem-name', type: 'name', content: 'Valeria Castro', fontFamily: 'Inter', fontSize: '18px', fontWeight: 'bold', color: '#0F172A' },
              { id: 'prem-cargo', type: 'cargo', content: 'Directora de Cuentas Premium', fontFamily: 'Inter', fontSize: '12px', color: '#3B82F6' },
              { id: 'prem-details', type: 'text', content: '📱 +51 912 345 678 | ✉ valeria@pixel.com.pe', fontSize: '11px', color: '#475569' }
            ]
          },
          {
            id: 'prem-col-3',
            widthPercent: 20,
            blocks: [
              { id: 'prem-qr', type: 'qr', content: 'https://pixel.com.pe', qrShape: 'circle' }
            ]
          }
        ]
      },
      {
        id: 'prem-row-2',
        columns: [
          {
            id: 'prem-col-4',
            widthPercent: 100,
            blocks: [
              { id: 'prem-banner', type: 'gif', content: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=600&h=120', borderRadius: '8px', margin: '8px 0' },
              { id: 'prem-legal', type: 'legal', content: '', legalModel: 'confidencial' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'oscura',
    name: 'Sleek Dark Mode',
    category: 'Creativos',
    description: 'Diseño optimizado para modo oscuro con fondo de pizarra elegante, textos claros y bordes suaves.',
    rows: [
      {
        id: 'dark-row-1',
        columns: [
          {
            id: 'dark-col-1',
            widthPercent: 100,
            blocks: [
              { id: 'dark-bg', type: 'text', content: '🌌 CREATIVE LABS', fontFamily: 'Inter', fontSize: '12px', fontWeight: 'bold', color: '#06B6D4' },
              { id: 'dark-name', type: 'name', content: 'Diana Pierce', fontFamily: 'Inter', fontSize: '20px', fontWeight: '800', color: '#F1F5F9' },
              { id: 'dark-cargo', type: 'cargo', content: 'Visual Designer', fontFamily: 'Inter', fontSize: '12px', color: '#94A3B8' },
              { id: 'dark-sep', type: 'separator', content: '', color: '#334155', margin: '8px 0' },
              { id: 'dark-web', type: 'link', content: '✉ diana.pierce@pixel.com.pe', href: 'mailto:diana@pixel.com.pe', color: '#38BDF8' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'clasica',
    name: 'Clásica Académica',
    category: 'Educación',
    description: 'Tipografía serif clásica (Times New Roman), márgenes formales y diseño perfectamente alineado.',
    rows: [
      {
        id: 'clas-row-1',
        columns: [
          {
            id: 'clas-col-1',
            widthPercent: 100,
            blocks: [
              { id: 'clas-name', type: 'name', content: 'Dra. Elena Rostova', fontFamily: 'Georgia', fontSize: '22px', fontWeight: 'normal', color: '#2C3E50' },
              { id: 'clas-cargo', type: 'cargo', content: 'Catedrática de Economía Aplicada', fontFamily: 'Georgia', fontSize: '14px', color: '#7F8C8D' },
              { id: 'clas-uni', type: 'text', content: 'Universidad Pontificia de Lima', fontSize: '13px', color: '#34495E' },
              { id: 'clas-sep', type: 'separator', content: '', color: '#BDC3C7', margin: '8px 0' },
              { id: 'clas-tel', type: 'link', content: 'Telf: +51 1 234 5678', href: 'tel:+5112345678', color: '#2C3E50' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'moderna',
    name: 'Moderna Activa',
    category: 'Marketing',
    description: 'Colores vibrantes, avatar redondo con borde brillante, un constructor de botones y estado activo.',
    rows: [
      {
        id: 'mod-row-1',
        columns: [
          {
            id: 'mod-col-1',
            widthPercent: 25,
            blocks: [
              { id: 'mod-pic', type: 'gif', content: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100&h=100', borderRadius: '50%', border: '3px solid #EC4899' }
            ]
          },
          {
            id: 'mod-col-2',
            widthPercent: 75,
            blocks: [
              { id: 'mod-name', type: 'name', content: 'Milagros Rojas', fontFamily: 'Inter', fontSize: '19px', fontWeight: '800', color: '#0F172A' },
              { id: 'mod-cargo', type: 'cargo', content: 'Social Media Manager', fontFamily: 'Inter', fontSize: '12px', fontWeight: 'bold', color: '#EC4899' },
              { id: 'mod-estado', type: 'estado', content: 'Disponible', estadoType: 'disponible', margin: '4px 0' },
              { id: 'mod-btn', type: 'button', content: '💬 WhatsApp Chat', buttonColor: '#25D366', href: 'https://wa.me/51900000000' }
            ]
          }
        ]
      }
    ]
  }
] as any;
