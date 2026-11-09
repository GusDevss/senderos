/* Los Senderos Residencial — interacciones del sitio */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var WHATSAPP = '5214428230513';
  var PROMO_DELAY_MS = 8000;          // el popup aparece a los 8 s (o antes si el visitante baja de la portada)
  var PROMO_SESSION_KEY = 'ls-promos-visto';
  var GTM_ID = 'GTM-PTMTM2C9';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || {};
  var saveData = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function track(event, data) {
    window.dataLayer = window.dataLayer || [];
    var payload = { event: event };
    if (data) for (var k in data) payload[k] = data[k];
    window.dataLayer.push(payload);
  }

  function storage(fn) { try { return fn(window.sessionStorage); } catch (e) { return null; } }

  /* ---------- Año del pie ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Encabezado sólido al hacer scroll ---------- */
  var header = $('[data-header]');
  if (header && !document.body.classList.contains('page-legal')) {
    var onScroll = function () { header.classList.toggle('is-solid', window.scrollY > 40); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Menú móvil ---------- */
  var toggle = $('[data-menu-toggle]');
  if (toggle) {
    var setMenu = function (open) {
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      $('.sr-only', toggle).textContent = open ? 'Cerrar menú' : 'Abrir menú';
    };
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    $$('[data-nav] a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---------- Video de portada ----------
     Se carga después del póster (no bloquea la primera carga), en versión
     ligera para celulares, y no se carga con ahorro de datos o movimiento reducido. */
  var heroVideo = $('[data-hero-video]');
  if (heroVideo && !reduceMotion && !saveData) {
    var startHero = function () {
      var small = window.matchMedia('(max-width: 767px)').matches;
      heroVideo.src = small ? heroVideo.dataset.srcSm : heroVideo.dataset.srcLg;
      heroVideo.addEventListener('playing', function () { heroVideo.classList.add('is-playing'); }, { once: true });
      var p = heroVideo.play();
      if (p && p.catch) p.catch(function () {});
    };
    if (document.readyState === 'complete') startHero();
    else window.addEventListener('load', startHero, { once: true });

    // Pausar cuando la portada no está visible (ahorra batería y CPU)
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!heroVideo.src) return;
          if (en.isIntersecting) { var p = heroVideo.play(); if (p && p.catch) p.catch(function () {}); }
          else heroVideo.pause();
        });
      }, { threshold: 0.05 }).observe(heroVideo);
    }
  }

  /* ---------- Videos cortos diferidos (fragmentos del drone) ---------- */
  var lazyVideos = $$('video.lazy-video');
  if ('IntersectionObserver' in window && !reduceMotion && !saveData) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) {
          if (!v.src) v.src = v.dataset.src;
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else if (v.src) {
          v.pause();
        }
      });
    }, { rootMargin: '200px 0px', threshold: 0.2 });
    lazyVideos.forEach(function (v) { vio.observe(v); });
  }

  /* ---------- Animaciones de aparición ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); rio.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    reveals.forEach(function (el) { rio.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Panorámica: auto-recorrido suave + arrastre con el mouse ---------- */
  $$('[data-pano]').forEach(function (pano) {
    var vp = $('.pano-viewport', pano);
    var img = $('img', vp);
    var userTouched = false, inView = false, dir = 1, raf = null, last = 0, pos = null;

    var stop = function () { userTouched = true; pano.classList.add('is-touched'); if (raf) cancelAnimationFrame(raf); raf = null; };
    var step = function (t) {
      raf = null;
      if (userTouched || !inView) return;
      var dt = last ? Math.min(t - last, 50) : 16; last = t;
      var max = vp.scrollWidth - vp.clientWidth;
      if (max > 0) {
        if (pos === null || Math.abs(pos - vp.scrollLeft) > 2) pos = vp.scrollLeft;
        pos += dir * dt * 0.04; // ~40 px por segundo
        if (pos >= max) { pos = max; dir = -1; } else if (pos <= 0) { pos = 0; dir = 1; }
        vp.scrollLeft = pos;
      }
      raf = requestAnimationFrame(step);
    };
    var start = function () { if (!raf && !userTouched && !reduceMotion) { last = 0; raf = requestAnimationFrame(step); } };

    // Empieza centrada en la alberca/casa club
    var center = function () { vp.scrollLeft = (vp.scrollWidth - vp.clientWidth) * 0.3; };
    if (img.complete) center(); else img.addEventListener('load', center, { once: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        inView = en[0].isIntersecting;
        if (inView) start();
      }, { threshold: 0.3 }).observe(vp);
    }

    ['touchstart', 'wheel', 'keydown'].forEach(function (ev) { vp.addEventListener(ev, stop, { passive: true }); });

    // Arrastrar con el mouse en escritorio
    var down = false, startX = 0, startLeft = 0;
    vp.addEventListener('mousedown', function (e) {
      stop(); down = true; startX = e.pageX; startLeft = vp.scrollLeft; vp.classList.add('is-dragging');
    });
    window.addEventListener('mousemove', function (e) {
      if (!down) return;
      e.preventDefault();
      vp.scrollLeft = startLeft - (e.pageX - startX);
    });
    window.addEventListener('mouseup', function () { down = false; vp.classList.remove('is-dragging'); });
  });

  /* ---------- Utilidades para <dialog> ---------- */
  function openDialog(d) {
    if (!d || d.open) return;
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    document.body.classList.add('dialog-open');
  }
  function closeDialog(d) {
    if (!d) return;
    if (typeof d.close === 'function') d.close(); else d.removeAttribute('open');
  }
  $$('dialog').forEach(function (d) {
    d.addEventListener('close', function () {
      if (!$('dialog[open]')) document.body.classList.remove('dialog-open');
    });
    // Cerrar al hacer clic fuera del contenido
    d.addEventListener('click', function (e) { if (e.target === d) closeDialog(d); });
    $$('[data-close]', d).forEach(function (b) { b.addEventListener('click', function () { closeDialog(d); }); });
  });

  /* ---------- Popup de promociones ---------- */
  var promos = $('[data-promos]');
  if (promos) {
    var track_ = $('[data-promo-track]', promos);
    var slides = $$('.promo', track_);
    var dotsWrap = $('[data-promo-dots]', promos);
    var current = 0;

    slides.forEach(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Ver promoción ' + (i + 1) + ' de ' + slides.length);
      b.addEventListener('click', function () { goTo(i); });
      dotsWrap.appendChild(b);
    });
    var dots = $$('button', dotsWrap);

    function setCurrent(i) {
      current = i;
      dots.forEach(function (d, j) { d.setAttribute('aria-current', j === i ? 'true' : 'false'); });
    }
    function goTo(i) {
      i = (i + slides.length) % slides.length;
      track_.scrollTo({ left: slides[i].offsetLeft - track_.offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
      setCurrent(i);
    }
    setCurrent(0);
    $('[data-promo-prev]', promos).addEventListener('click', function () { goTo(current - 1); });
    $('[data-promo-next]', promos).addEventListener('click', function () { goTo(current + 1); });
    track_.addEventListener('scroll', function () {
      var i = Math.round(track_.scrollLeft / track_.clientWidth);
      if (i !== current && slides[i]) setCurrent(i);
    }, { passive: true });

    // Rotación automática mientras el popup está abierto (se detiene al interactuar)
    var auto = null;
    function stopAuto() { if (auto) { clearInterval(auto); auto = null; } }
    function startAuto() {
      stopAuto();
      if (reduceMotion || slides.length < 2) return;
      auto = setInterval(function () { goTo(current + 1); }, 5000);
    }
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
      promos.addEventListener(ev, stopAuto, { passive: true });
    });
    promos.addEventListener('close', stopAuto);

    function showPromos(source) {
      if (promos.open) return;
      openDialog(promos);
      track_.scrollLeft = 0; setCurrent(0);
      startAuto();
      storage(function (s) { s.setItem(PROMO_SESSION_KEY, '1'); });
      track('promociones_abiertas', { origen: source });
    }

    $$('[data-open-promos]').forEach(function (b) {
      b.addEventListener('click', function () { showPromos('boton'); });
    });

    // Apertura automática (una vez por sesión de navegación)
    var alreadySeen = storage(function (s) { return s.getItem(PROMO_SESSION_KEY); });
    if (!alreadySeen) {
      var autoTimer = null;
      var minDelayReached = false;
      var onScrollPromo = function () {
        if (minDelayReached && window.scrollY > window.innerHeight * 0.9) autoOpen('scroll');
      };
      var autoOpen = function (source) {
        clearTimeout(autoTimer);
        window.removeEventListener('scroll', onScrollPromo);
        if ($('dialog[open]') || document.body.classList.contains('menu-open')) return;
        showPromos(source);
      };
      autoTimer = setTimeout(function () { autoOpen('automatico'); }, PROMO_DELAY_MS);
      // Si el visitante baja más allá de la portada (muestra interés) se abre antes,
      // pero nunca en los primeros 3 segundos.
      setTimeout(function () { minDelayReached = true; onScrollPromo(); }, 3000);
      window.addEventListener('scroll', onScrollPromo, { passive: true });
    }
  }

  /* ---------- Visor de imágenes ---------- */
  var lb = $('[data-lightbox-dialog]');
  if (lb) {
    var lbImg = $('[data-lightbox-img]', lb);
    $$('[data-lightbox]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var img = $('img', el);
        lbImg.src = el.getAttribute('data-lightbox');
        lbImg.alt = img ? img.alt : '';
        openDialog(lb);
      });
    });
    lb.addEventListener('close', function () { lbImg.removeAttribute('src'); });
  }

  /* ---------- Carrusel de la galería ---------- */
  $$('[data-scroll-prev], [data-scroll-next]').forEach(function (btn) {
    var target = document.getElementById(btn.getAttribute('data-scroll-prev') || btn.getAttribute('data-scroll-next'));
    if (!target) return;
    var dir = btn.hasAttribute('data-scroll-next') ? 1 : -1;
    btn.addEventListener('click', function () {
      var item = target.querySelector('li');
      var step = item ? item.getBoundingClientRect().width + 18 : 300;
      target.scrollBy({ left: dir * step, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  /* ---------- YouTube ligero (carga el reproductor sólo al dar clic) ---------- */
  $$('[data-youtube]').forEach(function (box) {
    $('button', box).addEventListener('click', function () {
      var id = box.getAttribute('data-youtube');
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      iframe.title = 'Recorrido virtual Los Senderos Residencial';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      box.innerHTML = '';
      box.appendChild(iframe);
      track('video_recorrido');
    });
  });

  /* ---------- Mapa de Google (carga al dar clic) ---------- */
  var mapBtn = $('[data-map-load]');
  if (mapBtn) {
    mapBtn.addEventListener('click', function () {
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.google.com/maps?q=' + encodeURIComponent('Los Senderos Residencial, Av. Tlacote, Santiago de Querétaro, Qro.') + '&output=embed';
      iframe.title = 'Ubicación de Los Senderos Residencial en Google Maps';
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      var wrap = mapBtn.parentNode;
      wrap.innerHTML = '';
      wrap.appendChild(iframe);
    });
  }

  /* ---------- Formulario de contacto → correo (enviar.php) ---------- */
  var form = $('[data-contact-form]');
  if (form) {
    var status = $('[data-form-status]', form);
    var submitBtn = $('[data-form-submit]', form);
    var timeField = $('[data-form-time]', form);
    if (timeField) timeField.value = String(Date.now());

    // Resultado cuando el formulario se envió sin JavaScript
    var enviado = new URLSearchParams(location.search).get('enviado');
    if (enviado === '1') status.textContent = '¡Gracias! Recibimos tu solicitud y te contactaremos muy pronto.';
    else if (enviado === '0') status.textContent = 'No pudimos enviar tu mensaje. Escríbenos por WhatsApp, por favor.';

    var whatsappFallback = function (d) {
      var lines = [
        'Hola, me gustaría recibir información sobre Los Senderos Residencial.',
        '',
        'Nombre: ' + d.get('nombre'),
        'Teléfono: ' + d.get('telefono'),
        'Correo: ' + d.get('correo')
      ];
      if (d.get('privada')) lines.push('Privada de interés: ' + d.get('privada'));
      if (d.get('mensaje')) lines.push('Mensaje: ' + d.get('mensaje'));
      return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(lines.join('\n'));
    };

    var showStatus = function (text, link) {
      status.textContent = text;
      if (link) {
        var a = document.createElement('a');
        a.href = link; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = ' Enviar por WhatsApp →';
        a.style.color = 'inherit'; a.style.fontWeight = '600';
        status.appendChild(a);
      }
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      $$('input:not([type="hidden"]):not([name="sitio_web"]), select, textarea', form).forEach(function (f) {
        var wrap = f.closest('.field');
        var valid = f.checkValidity();
        if (wrap) wrap.classList.toggle('is-invalid', !valid);
        if (!valid && ok) { ok = false; f.focus(); }
      });
      if (!ok) { showStatus('Revisa los campos marcados y acepta el aviso de privacidad.'); return; }

      var d = new FormData(form);
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando…';
      status.textContent = '';

      fetch(form.action, { method: 'POST', body: d, headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (res) {
          if (res && res.ok) {
            track('formulario_contacto', { privada: d.get('privada') || 'sin definir' });
            showStatus(res.mensaje || '¡Gracias! Te contactaremos muy pronto.');
            form.reset();
            if (timeField) timeField.value = String(Date.now());
          } else {
            showStatus((res && res.mensaje) || 'No pudimos enviar tu mensaje.', whatsappFallback(d));
          }
        })
        .catch(function () {
          showStatus('No pudimos enviar tu mensaje.', whatsappFallback(d));
        })
        .then(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Enviar solicitud';
        });
    });
  }

  /* ---------- Medición de clics en WhatsApp / llamadas ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-track], a[href^="tel:"]');
    if (!a) return;
    track(a.getAttribute('data-track') ? 'clic_whatsapp' : 'clic_telefono', { ubicacion: a.getAttribute('data-track') || 'telefono' });
  });

  /* ---------- Google Tag Manager (diferido para no frenar la carga) ---------- */
  function loadGTM() {
    if (window.__gtmLoaded) return;
    window.__gtmLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + GTM_ID;
    document.head.appendChild(s);
  }
  if (GTM_ID) {
    var gtmTimer = setTimeout(loadGTM, 3500);
    ['pointerdown', 'scroll', 'keydown', 'touchstart'].forEach(function (ev) {
      window.addEventListener(ev, function () { clearTimeout(gtmTimer); loadGTM(); }, { once: true, passive: true });
    });
  }
})();
