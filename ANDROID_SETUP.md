# Guía de Preparación para Empaquetado Android (Trusted Web Activity) - Pixel Mail

Esta guía detalla los pasos, configuraciones y comandos necesarios para empaquetar **Pixel Mail** como una aplicación nativa de Android utilizando **Trusted Web Activity (TWA)** de Google. TWA permite que la PWA se ejecute dentro de una aplicación Android nativa sin la barra de direcciones del navegador, con excelente rendimiento y acceso completo a APIs modernas.

---

## 1. Valores Sugeridos y Configuración

- **Nombre de la Aplicación:** `Pixel Mail`
- **Host de Producción (Dominio):** `mail.pixel.com.pe`
- **URL de Inicio:** `https://mail.pixel.com.pe`
- **Package Name (ID de Aplicación):** `pe.com.pixel.mail` (ID sugerido verificado y libre en Google Play Store).

---

## 2. Configuración de Digital Asset Links (`assetlinks.json`)

Para que la aplicación se abra en modo pantalla completa sin barra de direcciones de navegador (standalone), es obligatorio establecer una asociación de confianza digital entre el sitio web (`mail.pixel.com.pe`) y el paquete Android (`pe.com.pixel.mail`).

Esto se logra mediante un archivo JSON público llamado `assetlinks.json` ubicado en la ruta exacta:
`https://mail.pixel.com.pe/.well-known/assetlinks.json`

### Plantilla de `assetlinks.json`
El archivo ya ha sido pre-configurado en `public/.well-known/assetlinks.json` con la siguiente estructura:

```json
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "pe.com.pixel.mail",
      "sha256_cert_fingerprints": [
        "TU_HUELLA_SHA256_AQUÍ"
      ]
    }
  }
]
```

> ⚠️ **IMPORTANTE:** Debes reemplazar `"TU_HUELLA_SHA256_AQUÍ"` con la huella digital real del certificado de firma (App Signing Key) proporcionada por Google Play Console, o de la clave local utilizada para firmar el APK/AAB. Debe estar en formato hexadecimal con letras mayúsculas y dos puntos (ejemplo: `AA:BB:CC:DD...`).

---

## 3. Empaquetado Profesional usando Bubblewrap

**Bubblewrap** es la herramienta CLI recomendada por Google para generar proyectos de Android a partir de una PWA de forma automática y confiable.

### Requisitos Previos:
1. Tener instalado [Node.js](https://nodejs.org/).
2. Tener instalado [Java Development Kit (JDK) v17 o superior](https://adoptium.net/).
3. Tener instalado el [Android SDK](https://developer.android.com/studio).

### Pasos de Configuración y Generación:

#### Paso 3.1: Instalar la CLI de Bubblewrap
Ejecuta de manera global en tu terminal:
```bash
npm install -g @bubblewrap/cli
```

#### Paso 3.2: Inicializar el Proyecto Android
Crea un directorio vacío para el proyecto Android e inicialízalo leyendo el manifiesto web de producción:
```bash
mkdir pixelmail-android
cd pixelmail-android
bubblewrap init --manifest=https://mail.pixel.com.pe/manifest.webmanifest
```

La herramienta te guiará con una serie de preguntas. Utiliza los siguientes valores sugeridos:
- **Application name:** `Pixel Mail`
- **Short name:** `Pixel Mail`
- **Application ID (Package Name):** `pe.com.pixel.mail`
- **Starting URL:** `https://mail.pixel.com.pe/`
- **Theme Color:** `#3B82F6` (Color principal azul real de Pixel Mail)
- **Background Color:** `#0F1117` (Fondo de pantalla oscura inicial de Pixel Mail)

#### Paso 3.3: Generar las Firmas y Compilar el Proyecto (AAB / APK)
Compila el proyecto para generar el archivo instalable de desarrollo (APK) y el paquete de distribución para Google Play (Android App Bundle - AAB):
```bash
bubblewrap build
```

*Nota: Si es la primera vez que ejecutas este comando, Bubblewrap creará un archivo almacén de claves seguro (`android.keystore`). Guarda este archivo y sus contraseñas de forma extremadamente segura fuera del repositorio de código.*

---

## 4. Publicación en Google Play Store

### Requisitos:
1. **Cuenta de Desarrollador de Google Play Console:** Requiere un pago único de $25 USD.
2. **Generar el Android App Bundle (AAB):** Utilizar siempre el formato `.aab` generado por Bubblewrap (`app-release-bundle.aab`) en lugar de `.apk` para la tienda.
3. **Firma de la Aplicación en Play Store:**
   - Sube tu archivo `app-release-bundle.aab` a la sección de lanzamientos de producción.
   - En Play Console, ve a **Configuración de la app > Firma de apps**.
   - Copia la **Huella digital del certificado de firma de la app SHA-256** provista por Google.
   - Pega esta huella digital en tu archivo local `public/.well-known/assetlinks.json`.
   - Realiza un deploy de Firebase Hosting para actualizar el archivo en producción.

Una vez actualizado, el sistema de Android verificará la firma automáticamente y tu aplicación instalada en los celulares de los usuarios se ejecutará de forma impecable en modo standalone profesional y seguro.
