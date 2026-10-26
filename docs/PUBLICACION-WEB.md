# Publicación web con GitHub Pages

La misma V1 puede servirse como sitio estático HTTPS. El código y los recursos se alojan en GitHub Pages; los datos financieros y documentos se guardan en IndexedDB del navegador que abre el sitio. No existe una base de datos remota, sincronización ni inicio de sesión. El sitio puede ser público sin publicar los datos personales de sus usuarios: nunca se deben subir copias de seguridad ni documentos financieros al repositorio.

## Activación inicial

1. Abre el repositorio en GitHub y entra a **Settings → Pages**.
2. En **Build and deployment → Source**, selecciona **GitHub Actions**.
3. En **Actions**, abre **Publicar Mis cuentas** y ejecuta **Run workflow** sobre `main`, o vuelve a ejecutar el despliegue si falló antes de activar Pages.
4. Espera a que los trabajos Compilar y verificar / Publicar en GitHub Pages terminen correctamente. El enlace confirmado estará en el entorno **github-pages** y en Settings → Pages.

Si GitHub no permite activar Pages en un repositorio privado por el plan de la cuenta, se necesitará un plan compatible u otro alojamiento estático. No cambies la visibilidad del repositorio sin revisar antes qué código contiene.

El workflow `.github/workflows/pages.yml` instala con el lockfile, ejecuta las pruebas, compila y publica solo `dist`. Cada actualización de `main` vuelve a ejecutar este flujo. No necesita claves bancarias ni secretos de la aplicación. Vite usa rutas relativas para cargar recursos bajo el subdirectorio del repositorio, manteniendo también el uso local en Windows.

## Pasar de la versión local a la web

1. En la versión local, abre Configuración y exporta una copia de seguridad.
2. Abre la dirección HTTPS publicada en tu navegador habitual.
3. En Configuración, importa la copia.
4. Verifica tarjetas, saldos y documentos. Conserva la copia original en un lugar seguro.

La dirección web y la local tienen almacenamientos separados. Tampoco se comparten automáticamente los datos entre una PC y un teléfono, distintos perfiles de navegador o diferentes navegadores. Es necesario exportar/importar para trasladarlos. Las copias contienen datos sensibles sin cifrar: no las subas a GitHub.

La web necesita conexión para cargar sus archivos. Una PWA con funcionamiento sin conexión e instalación sigue siendo una mejora futura.
