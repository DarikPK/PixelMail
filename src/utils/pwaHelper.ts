/**
 * Utilidad robusta para detectar de forma fiable si la aplicación
 * se está ejecutando como una PWA instalada (App Mode) o Trusted Web Activity (TWA).
 */
export const isRunningAsPWA = (): boolean => {
  if (typeof window === 'undefined') return false;

  // 1. Detección estándar mediante display-mode standalone (Chrome, Android, Windows)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  // 2. Detección específica de iOS / Safari standalone
  const isIosStandalone = (window.navigator as any).standalone === true;

  // 3. Detección para Trusted Web Activity (TWA) de Android mediante document.referrer
  const isAndroidTWA = document.referrer?.includes('android-app://') || false;

  // 4. Detección de fallback mediante query parameter o display-mode fullscreen/minimal-ui
  const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches ||
                       window.matchMedia('(display-mode: minimal-ui)').matches;

  return isStandalone || isIosStandalone || isAndroidTWA || isFullscreen;
};
