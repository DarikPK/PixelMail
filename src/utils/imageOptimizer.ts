import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { storage } from '../config/firebase';

export interface OptimizationResult {
  name: string;
  originalSize: number;
  originalType: string;
  originalWidth: number;
  originalHeight: number;
  originalAspect: number;
  hasTransparency: boolean;
  format: string;
  optimizedSize: number;
  optimizedWidth: number;
  optimizedHeight: number;
  optimizedDataUrl: string;
  ratio: number;
  hash: string;
  category: 'logo' | 'qr' | 'foto' | 'banner';
}

/**
 * Calcula el hash SHA-256 de un File.
 */
export const getFileSHA256 = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Calcula el hash SHA-256 de una cadena Base64.
 */
export const getBase64SHA256 = async (base64: string): Promise<string> => {
  try {
    const cleanBase64 = base64.split(',')[1] || base64;
    const binaryString = atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes.buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return 'unknown-hash-' + Date.now();
  }
};

/**
 * Convierte un Data URL Base64 a un objeto File.
 */
export const dataURLToFile = (dataUrl: string, filename: string): File => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

/**
 * Analiza y optimiza una imagen (File o Base64) basándose en las reglas de Pixel Mail.
 */
export const optimizeImage = async (
  input: File | string,
  fileName: string,
  category: 'logo' | 'qr' | 'foto' | 'banner' = 'foto'
): Promise<OptimizationResult> => {
  let file: File;
  let dataUrl: string;
  let hash = '';

  if (input instanceof File) {
    file = input;
    dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
    hash = await getFileSHA256(file);
  } else {
    dataUrl = input;
    file = dataURLToFile(dataUrl, fileName);
    hash = await getBase64SHA256(dataUrl);
  }

  const originalSize = file.size;
  const originalType = file.type || 'image/png';
  const format = originalType.split('/')[1]?.toUpperCase() || 'PNG';

  // Si es un SVG, la optimización consiste en limpiar metadatos de texto y compresión de espacios
  if (originalType === 'image/svg+xml' || format === 'SVG') {
    const rawText = atob(dataUrl.split(',')[1]);

    // Limpieza de metadatos, comentarios y espacios innecesarios
    let optimizedSVG = rawText
      .replace(/<!--[\s\S]*?-->/g, '') // Eliminar comentarios
      .replace(/<\?xml[\s\S]*?\?>/i, '') // Eliminar encabezado XML si existe
      .replace(/\s+/g, ' ') // Comprimir espacios en blanco
      .replace(/> </g, '><') // Eliminar espacios entre etiquetas
      .trim();

    const optimizedBase64 = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(optimizedSVG)))}`;
    const optimizedSize = Math.round((optimizedBase64.length * 3) / 4);

    return {
      name: fileName,
      originalSize,
      originalType,
      originalWidth: 200,
      originalHeight: 200,
      originalAspect: 1,
      hasTransparency: true,
      format: 'SVG',
      optimizedSize,
      optimizedWidth: 200,
      optimizedHeight: 200,
      optimizedDataUrl: optimizedBase64,
      ratio: Math.round(((originalSize - optimizedSize) / originalSize) * 100),
      hash,
      category
    };
  }

  // Cargar imagen en HTMLImageElement para analizar resolución y transparencia
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (e) => reject(e);
    image.src = dataUrl;
  });

  const originalWidth = img.width;
  const originalHeight = img.height;
  const originalAspect = originalWidth / originalHeight;

  // Analizar transparencia (crear canvas temporal para leer pixeles)
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(100, originalWidth);
  canvas.height = Math.min(100, originalHeight);
  const ctx = canvas.getContext('2d');
  let hasTransparency = false;

  if (ctx) {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < imgData.length; i += 4) {
        if (imgData[i] < 255) {
          hasTransparency = true;
          break;
        }
      }
    } catch (e) {
      // Ignorar cross-origin
    }
  }

  // REGLAS DE REDIMENSIONAMIENTO AUTOMÁTICO
  let maxDim = 800;
  if (category === 'logo') maxDim = 500;
  else if (category === 'qr') maxDim = 500;
  else if (category === 'banner') maxDim = 1200;
  else if (category === 'foto') maxDim = 800;

  let targetWidth = originalWidth;
  let targetHeight = originalHeight;

  if (originalWidth > maxDim) {
    targetWidth = maxDim;
    targetHeight = Math.round(maxDim / originalAspect);
  }

  // Crear lienzo para renderizado y optimización final
  const optCanvas = document.createElement('canvas');
  optCanvas.width = targetWidth;
  optCanvas.height = targetHeight;
  const optCtx = optCanvas.getContext('2d')!;

  optCtx.imageSmoothingEnabled = true;
  optCtx.imageSmoothingQuality = 'high';
  optCtx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Seleccionar formato de salida óptimo
  let outputType = originalType;
  let quality = 0.85;

  if (originalType === 'image/jpeg' || originalType === 'image/jpg') {
    outputType = 'image/jpeg';
  } else if (originalType === 'image/webp') {
    outputType = 'image/webp';
  } else {
    outputType = hasTransparency ? 'image/png' : 'image/jpeg';
  }

  let optimizedDataUrl = optCanvas.toDataURL(outputType, quality);
  let optimizedSize = Math.round((optimizedDataUrl.length * 3) / 4);

  if (optimizedSize > originalSize && targetWidth === originalWidth) {
    optimizedDataUrl = dataUrl;
    optimizedSize = originalSize;
  }

  return {
    name: fileName,
    originalSize,
    originalType,
    originalWidth,
    originalHeight,
    originalAspect,
    hasTransparency,
    format,
    optimizedSize,
    optimizedWidth: targetWidth,
    optimizedHeight: targetHeight,
    optimizedDataUrl,
    ratio: Math.max(0, Math.round(((originalSize - optimizedSize) / originalSize) * 100)),
    hash,
    category
  };
};

/**
 * Sube una imagen Base64 a Firebase Storage si no existe previamente (deduplicación).
 * Devuelve la URL de descarga pública.
 */
export const uploadBase64ToStorage = async (base64: string, userId: string, _filename: string): Promise<string> => {
  const hash = await getBase64SHA256(base64);
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const ext = mime.split('/')[1] || 'png';

  // Ruta única en Storage: users/{userId}/signatures/assets/{hash}.{ext}
  const storagePath = `users/${userId}/signatures/assets/${hash}.${ext}`;
  const assetRef = ref(storage, storagePath);

  try {
    // 1. Intentar obtener URL de descarga para ver si ya existe (DEDUPLICACIÓN)
    const existingUrl = await getDownloadURL(assetRef);
    console.log("RECURSO EXISTENTE: Reutilizando imagen ya subida a Storage.", storagePath);
    return existingUrl;
  } catch (err) {
    // Si no existe (arroja error), proceder a subir
    console.log("SUBIDA AUTOMÁTICA: Subiendo nueva imagen a Firebase Storage.", storagePath);

    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    const blob = new Blob([u8arr], { type: mime });
    await uploadBytes(assetRef, blob);
    const url = await getDownloadURL(assetRef);
    return url;
  }
};

/**
 * Escanea el HTML de una firma. Si supera los 700 KB (o contiene Base64 pesados),
 * extrae automáticamente todos los Base64, los sube a Firebase Storage,
 * y los reemplaza por URLs públicas para mantener Firestore ligero.
 */
export const optimizeSignatureResourcesBeforeSave = async (html: string, userId: string): Promise<string> => {
  if (!html) return html;

  const htmlSize = new Blob([html]).size;
  console.log("PESO DE LA FIRMA HTML:", htmlSize, "bytes");

  // Si supera 700 KB, o si contiene Base64, subimos los recursos a Storage de forma transparente
  if (htmlSize > 700 * 1024 || html.includes('data:image/')) {
    console.log("OPTIMIZACIÓN EXTRACCIÓN: Extrayendo recursos Base64 de la firma pesada a Firebase Storage...");

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const imgs = doc.querySelectorAll('img');

    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      const src = img.getAttribute('src') || '';

      if (src.startsWith('data:image/')) {
        try {
          const publicUrl = await uploadBase64ToStorage(src, userId, `imagen-firma-${i}`);
          img.setAttribute('src', publicUrl);
        } catch (err) {
          console.error("Error al subir recurso Base64 a Storage:", err);
        }
      }
    }

    return doc.body.innerHTML;
  }

  return html;
};
