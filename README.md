# Los Senderos Residencial — sitio web

Landing page estática (HTML + CSS + JS, sin dependencias) de
[lossenderosresidencial.com.mx](https://lossenderosresidencial.com.mx/).

## Estructura

```
index.html                 Página principal
aviso-de-privacidad.html   Aviso de privacidad
assets/css/styles.css      Estilos
assets/js/main.js          Interacciones (popup, video, galería, formulario, GTM)
assets/img/                Imágenes optimizadas en WebP
assets/video/              Video de portada (escritorio y móvil) y fragmentos
robots.txt, sitemap.xml    SEO
.htaccess                  HTTPS, redirecciones 301 del WordPress anterior y caché (Apache)
```

## Tareas frecuentes

**Cambiar las promociones del popup:** en `index.html`, dentro de
`<dialog id="promociones">`, edita o duplica cada `<li class="promo">`
(imagen, título, texto y enlace de WhatsApp). Sube las imágenes nuevas a
`assets/img/` (cuadradas, ~540×540, de preferencia en `.webp`).

**Tiempo del popup:** `PROMO_DELAY_MS` en `assets/js/main.js` (3000 = 3 s).
Se abre solo una vez por sesión; el botón "Accede a promociones" siempre lo abre.

**WhatsApp:** número en `WHATSAPP` (`main.js`) y en los enlaces `wa.me/5214428230513`.

**Google Tag Manager:** `GTM_ID` en `main.js`. Eventos enviados al `dataLayer`:
`promociones_abiertas`, `clic_whatsapp`, `clic_telefono`, `formulario_contacto`, `video_recorrido`.

## Probar en local

```bash
python3 -m http.server 8000
```

y abrir http://localhost:8000
