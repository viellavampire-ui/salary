/**
 * Встроенный скрипт для <head>: ставит класс .dark до первой отрисовки,
 * чтобы не было «мигания» светлой темы (см. Next.js guide
 * «Preventing flash before hydration»).
 */
export const THEME_STORAGE_KEY = "theme";

export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
