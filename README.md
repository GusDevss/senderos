# Los Senderos Residencial — sitio web

Landing page estática (HTML + CSS + JS, sin dependencias) de
[lossenderosresidencial.com.mx](https://lossenderosresidencial.com.mx/).

## Estructura

```
index.html                 Página principal
aviso-de-privacidad.html   Aviso de privacidad
404.html                   Página de "no encontrada"
enviar.php                 Envía el formulario de contacto por correo
assets/css/styles.css      Estilos
assets/js/main.js          Interacciones (popup, video, galería, formulario, GTM)
assets/img/                Imágenes optimizadas en WebP
assets/video/              Video de portada (escritorio y móvil) y fragmentos
robots.txt, sitemap.xml    SEO
.htaccess                  HTTPS, redirecciones del WordPress anterior y caché (Hostinger)
```

## Tareas frecuentes

**Cambiar las promociones del popup:** en `index.html`, dentro de
`<dialog id="promociones">`, edita o duplica cada `<li class="promo">`
(imagen, título, texto y enlace de WhatsApp). Sube las imágenes nuevas a
`assets/img/` (cuadradas, ~540×540, de preferencia en `.webp`).

**Tiempo del popup:** `PROMO_DELAY_MS` en `assets/js/main.js` (8000 = 8 s). Se abre
antes si el visitante baja más allá de la portada (nunca antes de 3 s), una vez por
sesión; el botón "Accede a promociones" siempre lo abre.

**Correos del formulario:** al inicio de `enviar.php`, cambia `DESTINATARIOS`
(quién recibe las solicitudes) y `REMITENTE` (un correo creado en el dominio).

**WhatsApp:** número en `WHATSAPP` (`main.js`) y en los enlaces `wa.me/5214428230513`.

**Google Tag Manager:** `GTM_ID` en `main.js`. Eventos enviados al `dataLayer`:
`promociones_abiertas`, `clic_whatsapp`, `clic_telefono`, `formulario_contacto`, `video_recorrido`.

## Cotizador

Los precios, plazos, tasa, apertura y enganche están en el bloque JSON
`cotizador-datos` dentro de `index.html`. La Marquesa usa el plan `credito10`
(crédito directo a 120 meses, 12% anual, apertura de $10,000, enganche sugerido
del 10% y 6 pagos para completar enganche y apertura). `descuento` está en 0
para cotizar a precio de lista; con `100000` se reproduce el simulador de
referencia ($13,004.64 al mes). El PDF se genera con jsPDF
(`assets/js/vendor/jspdf.umd.min.js`, se carga solo al descargar).

## Caché del navegador

`styles.css` y `main.js` se cargan con `?v=...` en la URL (ver `index.html`,
`aviso-de-privacidad.html` y `404.html`). Si los modificas, cambia ese valor
para que los visitantes descarguen la versión nueva:

```bash
sed -i -E "s#styles\.css\?v=[a-z0-9]+#styles.css?v=$(md5sum assets/css/styles.css | cut -c1-8)#; s#main\.js\?v=[a-z0-9]+#main.js?v=$(md5sum assets/js/main.js | cut -c1-8)#" index.html aviso-de-privacidad.html 404.html
```

## Publicar en Hostinger

1. En hPanel → **Correos**, crea el buzón remitente (p. ej. `no-reply@lossenderosresidencial.com.mx`)
   y pon ese correo y el de destino en `enviar.php`.
2. Respalda el WordPress actual (hPanel → Respaldos) y vacía `public_html`.
3. Sube a `public_html` todo el contenido de este repositorio (incluido `.htaccess`),
   sin las carpetas `.git` ni `README.md`. También se puede conectar el repositorio en
   hPanel → **Git** para desplegar desde GitHub.
4. Verifica que el SSL esté activo y envía un formulario de prueba.
5. En Google Search Console envía `https://lossenderosresidencial.com.mx/sitemap.xml`.

## Probar en local

```bash
php -S localhost:8000
```

y abrir http://localhost:8000
