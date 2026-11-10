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
    var center = function () { vp.scrollLeft = (vp.scrollWidth - vp.clientWidth) * 0.3; var r = $('[data-pano-range]', pano); if (r) r.value = '300'; };
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

    // Barra deslizante y flechas
    var range = $('[data-pano-range]', pano);
    var maxScroll = function () { return Math.max(1, vp.scrollWidth - vp.clientWidth); };
    var syncRange = function () { if (range) range.value = String(Math.round(vp.scrollLeft / maxScroll() * 1000)); };
    vp.addEventListener('scroll', syncRange, { passive: true });
    if (range) {
      range.addEventListener('input', function () { stop(); vp.scrollLeft = (+range.value / 1000) * maxScroll(); });
    }
    var nudge = function (d) {
      stop();
      vp.scrollBy({ left: d * vp.clientWidth * 0.45, behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    var prevB = $('[data-pano-prev]', pano), nextB = $('[data-pano-next]', pano);
    if (prevB) prevB.addEventListener('click', function () { nudge(-1); });
    if (nextB) nextB.addEventListener('click', function () { nudge(1); });
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

  /* ---------- Visor de imágenes (con navegación en la galería) ---------- */
  var lb = $('[data-lightbox-dialog]');
  if (lb) {
    var lbImg = $('[data-lightbox-img]', lb);
    var lbCap = $('[data-lb-caption]', lb);
    var lbCount = $('[data-lb-count]', lb);
    var lbList = [], lbIndex = 0;

    var itemData = function (el) {
      var img = $('img', el);
      return { src: el.getAttribute('data-lightbox'), alt: img ? img.alt : '', caption: el.getAttribute('data-caption') || (img ? img.alt : '') };
    };
    var showAt = function (i) {
      lbIndex = (i + lbList.length) % lbList.length;
      var it = lbList[lbIndex];
      lbImg.classList.add('is-loading');
      lbImg.onload = function () { lbImg.classList.remove('is-loading'); };
      lbImg.src = it.src; lbImg.alt = it.alt;
      lbCap.textContent = it.caption.replace(/&amp;/g, '&');
      lbCount.textContent = (lbIndex + 1) + ' / ' + lbList.length;
      // precargar la siguiente
      if (lbList.length > 1) { var pre = new Image(); pre.src = lbList[(lbIndex + 1) % lbList.length].src; }
    };

    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('[data-lightbox]');
      if (!el) return;
      e.preventDefault();
      var gallery = el.closest('[data-gallery]');
      if (gallery) {
        var visible = $$('.g-item:not(.is-hidden) [data-lightbox]', gallery);
        lbList = visible.map(itemData);
        lbIndex = visible.indexOf(el);
      } else {
        lbList = [itemData(el)]; lbIndex = 0;
      }
      lb.classList.toggle('is-single', lbList.length < 2);
      showAt(lbIndex);
      openDialog(lb);
    });

    $('[data-lb-prev]', lb).addEventListener('click', function () { showAt(lbIndex - 1); });
    $('[data-lb-next]', lb).addEventListener('click', function () { showAt(lbIndex + 1); });
    lb.addEventListener('keydown', function (e) {
      if (lbList.length < 2) return;
      if (e.key === 'ArrowRight') showAt(lbIndex + 1);
      if (e.key === 'ArrowLeft') showAt(lbIndex - 1);
    });
    // Deslizar con el dedo
    var tx = null;
    lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (tx === null || lbList.length < 2) return;
      var dx = e.changedTouches[0].clientX - tx; tx = null;
      if (Math.abs(dx) > 50) showAt(lbIndex + (dx < 0 ? 1 : -1));
    }, { passive: true });
    lb.addEventListener('close', function () { lbImg.removeAttribute('src'); });
    // Clic en el fondo (fuera de la imagen) cierra
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-figure')) closeDialog(lb); });
  }

  /* ---------- Galería: filtros y "ver todas" ---------- */
  var filterWrap = $('[data-filters]');
  var bento = $('[data-gallery]');
  if (filterWrap && bento) {
    var chips = $$('[data-filter]', filterWrap);
    var moreBtn = $('[data-gallery-more]');
    var moreLabel = moreBtn ? $('[data-more-label]', moreBtn) : null;
    var expanded = false, currentFilter = 'todas';
    var limit = function () {
      return window.matchMedia('(max-width: 600px)').matches
        ? +(bento.getAttribute('data-limit-mobile') || 4)
        : +(bento.getAttribute('data-limit') || 6);
    };
    var render = function (animate) {
      var n = 0, total = 0;
      $$('.g-item', bento).forEach(function (it) {
        var match = currentFilter === 'todas' || it.getAttribute('data-cat') === currentFilter;
        it.classList.toggle('is-hidden', !match);
        if (match) total++;
        var collapsed = match && !expanded && n >= limit();
        if (match) n++;
        it.classList.toggle('is-collapsed', collapsed);
        it.classList.remove('is-entering');
        if (animate && match && !collapsed && !reduceMotion) { void it.offsetWidth; it.classList.add('is-entering'); }
      });
      if (moreBtn) {
        moreBtn.parentNode.hidden = total <= limit();
        moreBtn.setAttribute('aria-expanded', String(expanded));
        moreLabel.textContent = expanded ? 'Ver menos fotos' : 'Ver todas las fotos (' + total + ')';
      }
    };
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        currentFilter = chip.getAttribute('data-filter');
        chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        expanded = false;
        bento.classList.toggle('is-filtered', currentFilter !== 'todas');
        render(true);
        track('galeria_filtro', { filtro: currentFilter });
      });
    });
    if (moreBtn) {
      moreBtn.addEventListener('click', function () {
        expanded = !expanded;
        render(expanded);
        if (!expanded) document.getElementById('galeria').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    }
    var lastMobile = window.matchMedia('(max-width: 600px)').matches;
    window.addEventListener('resize', function () {
      var m = window.matchMedia('(max-width: 600px)').matches;
      if (m !== lastMobile) { lastMobile = m; render(false); }
    });
    render(false);
  }

  /* ---------- Preguntas frecuentes: solo una abierta a la vez ---------- */
  var faqs = $$('.faq details');
  faqs.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) faqs.forEach(function (o) { if (o !== d && o.open) o.open = false; });
    });
  });

  /* ---------- Botón para volver al inicio ---------- */
  var toTop = $('[data-to-top]');
  if (toTop) {
    var onTop = function () { toTop.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.8); };
    window.addEventListener('scroll', onTop, { passive: true });
    onTop();
    toTop.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Cotizador (incluye crédito directo con tabla de amortización) ---------- */
  var quote = $('[data-quote]');
  var QD = null;
  try { QD = JSON.parse(($('#cotizador-datos') || {}).textContent || 'null'); } catch (e) { QD = null; }
  if (quote && QD) {
    var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    var fmt0 = function (c) { return '$' + Math.round(c / 100).toLocaleString('es-MX'); };
    var fmt2 = function (c) { return '$' + (c / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    var dLong = function (d) { return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear(); };
    var dShort = function (d) { return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); };
    var addMonths = function (base, n, day) { return new Date(base.getFullYear(), base.getMonth() + n, day); };
    var qs = function (sel) { return $(sel, quote); };
    var amort = $('[data-q-amort]');
    var engInput = qs('[data-q-enganche]');
    var current = null;
    var engTouched = {};

    var parseMoney = function (v) { var n = String(v).replace(/[^\d.]/g, ''); return n === '' ? NaN : Math.round(parseFloat(n) * 100); };
    var showMoneyInput = function (cents) { engInput.value = Math.round(cents / 100).toLocaleString('es-MX'); };

    // Motor de cálculo (todos los importes en centavos)
    var compute = function (pk, plk, engancheCents) {
      var pr = QD.privadas[pk], pl = QD.planes[plk];
      var lista = Math.round(pr.precioLista * 100);
      var apartado = Math.round(QD.apartado * 100);
      var r = { privadaKey: pk, planKey: plk, privada: pr.nombre, plan: pl.nombre, tipo: pl.tipo, lista: lista, apartado: apartado };
      if (pl.tipo === 'contado') { r.precio = lista; r.saldo = lista - apartado; r.total = lista; return r; }
      if (pl.tipo === 'meses') {
        r.precio = lista; r.saldo = lista - apartado; r.meses = pl.meses;
        r.mensual = Math.round(r.saldo / pl.meses); r.total = lista; return r;
      }
      // Crédito directo amortizado
      var desc = Math.round((pl.descuento || 0) * 100);
      var precio = lista - desc;
      r.descuento = desc; r.precio = precio;
      if (!isFinite(engancheCents)) throw new Error('Escribe cuánto quieres dar de enganche.');
      if (engancheCents < apartado) throw new Error('El enganche debe cubrir al menos el apartado de ' + fmt0(apartado) + '.');
      if (engancheCents >= precio) throw new Error('El enganche debe ser menor al precio del terreno (' + fmt0(precio) + ').');
      var apertura = Math.round(pl.apertura * 100);
      var principal = precio - engancheCents;
      var tasa = pl.tasaAnual / 100 / 12;
      var mensual = Math.round(principal * tasa / (1 - Math.pow(1 + tasa, -pl.meses)));
      // Enganche restante + apertura en N pagos (redondeados al peso; el último se ajusta)
      var puente = engancheCents - apartado + apertura;
      var nP = pl.pagosEnganche;
      var pagoP = Math.ceil(puente / nP / 100) * 100;
      var ultimoP = puente - pagoP * (nP - 1);
      // Fechas: pagos de enganche desde el próximo mes; mensualidades después, el día 1
      var hoy = new Date();
      var inicioPuente = addMonths(hoy, 1, 2);
      var schedule = [], saldo = principal;
      for (var i = 0; i < pl.meses; i++) {
        var ini = saldo, interes = Math.round(ini * tasa);
        var pago = i === pl.meses - 1 ? ini + interes : Math.min(mensual, ini + interes);
        var capital = pago - interes;
        saldo = ini - capital;
        schedule.push({ n: i + 1, fecha: addMonths(hoy, nP + 1 + i, 1), ini: ini, pago: pago, capital: capital, interes: interes, fin: saldo });
      }
      var intereses = schedule.reduce(function (a, x) { return a + x.interes; }, 0);
      r.enganche = engancheCents; r.apertura = apertura; r.inicial = engancheCents + apertura;
      r.principal = principal; r.mensual = mensual; r.tasaAnual = pl.tasaAnual; r.meses = pl.meses;
      r.puente = puente; r.nPuente = nP; r.pagoPuente = pagoP; r.ultimoPuente = ultimoP; r.inicioPuente = inicioPuente;
      r.schedule = schedule; r.intereses = intereses; r.total = precio + apertura + intereses;
      r.primera = schedule[0].fecha; r.ultima = schedule[schedule.length - 1].fecha; r.ultimoPago = schedule[schedule.length - 1].pago;
      return r;
    };

    var defaultEnganche = function (pk, plk) {
      var pl = QD.planes[plk], precio = (QD.privadas[pk].precioLista - (pl.descuento || 0)) * 100;
      return Math.round(precio * pl.enganchePct / 100 / 100) * 100;
    };

    var line = function (dt, dd, cls) {
      return '<div' + (cls ? ' class="' + cls + '"' : '') + '><dt>' + dt + '</dt><dd>' + dd + '</dd></div>';
    };

    var summaryText = function (r) {
      var L = ['Hola, me interesa esta cotización de Los Senderos Residencial:', '', 'Privada: ' + r.privada,
        'Lote tipo: ' + QD.lote.frente + ' x ' + QD.lote.fondo + ' m (' + QD.lote.m2 + ' m²)', 'Forma de pago: ' + r.plan,
        'Precio de lista: ' + fmt2(r.lista)];
      if (r.tipo === 'contado') L.push('Apartado: ' + fmt2(r.apartado), 'Saldo en una sola exhibición: ' + fmt2(r.saldo));
      else if (r.tipo === 'meses') L.push('Apartado: ' + fmt2(r.apartado), r.meses + ' mensualidades de ' + fmt2(r.mensual));
      else {
        if (r.descuento) L.push('Descuento: ' + fmt2(r.descuento), 'Precio del terreno: ' + fmt2(r.precio));
        L.push('Enganche (incluye apartado de ' + fmt0(r.apartado) + '): ' + fmt2(r.enganche),
          'Apertura de crédito (pago único): ' + fmt2(r.apertura),
          'Enganche + apertura: ' + fmt2(r.inicial) + ' (apartado + ' + (r.nPuente - 1) + ' pagos de ' + fmt2(r.pagoPuente) + ' y uno de ' + fmt2(r.ultimoPuente) + ')',
          'Saldo a financiar: ' + fmt2(r.principal),
          'Mensualidad: ' + fmt2(r.mensual) + ' (' + r.meses + ' pagos, tasa anual ' + r.tasaAnual + '%)',
          'Primera mensualidad: ' + dShort(r.primera), 'Intereses: ' + fmt2(r.intereses),
          'Total con financiamiento y apertura: ' + fmt2(r.total), 'Sin revisión de buró y sin aval.');
      }
      L.push('', '¿Me pueden confirmar disponibilidad y descuentos vigentes?');
      return L.join('\n');
    };

    var renderTable = function (r) {
      var body = $('[data-q-a-body]', amort);
      var html = '';
      r.schedule.forEach(function (x) {
        html += '<tr><td>' + x.n + '</td><td>' + dShort(x.fecha) + '</td><td>' + fmt2(x.ini) + '</td><td>' + fmt2(x.pago) + '</td><td>' + fmt2(x.capital) + '</td><td>' + fmt2(x.interes) + '</td><td>' + fmt2(x.fin) + '</td></tr>';
      });
      body.innerHTML = html;
      $('[data-q-a-principal]', amort).textContent = fmt2(r.principal);
      $('[data-q-a-interest]', amort).textContent = fmt2(r.intereses);
      $('[data-q-a-total]', amort).textContent = fmt2(r.total);
      $('[data-q-a-info]', amort).textContent = r.privada + ' · ' + r.meses + ' mensualidades de ' + fmt2(r.mensual) + ' · tasa mensual ' + (r.tasaAnual / 12).toLocaleString('es-MX') + '% · del ' + dShort(r.primera) + ' al ' + dShort(r.ultima);
    };

    var setError = function (msg) {
      var err = qs('[data-q-error]');
      err.hidden = !msg; err.textContent = msg || '';
      engInput.setAttribute('aria-invalid', msg ? 'true' : 'false');
      quote.classList.toggle('is-invalid', !!msg);
    };

    var render = function () {
      var pk = ($('input[name="q-privada"]:checked', quote) || {}).value || 'marquesa';
      var allowed = QD.privadas[pk].planes;
      // Formas de pago disponibles para la privada
      $$('input[name="q-plan"]', quote).forEach(function (inp) {
        var ok = allowed.indexOf(inp.value) > -1;
        inp.closest('.q-opt').hidden = !ok;
        if (!ok && inp.checked) inp.checked = false;
      });
      var checked = $('input[name="q-plan"]:checked', quote);
      if (!checked) { checked = $('input[name="q-plan"][value="' + allowed[0] + '"]', quote); checked.checked = true; }
      var plk = checked.value, pl = QD.planes[plk];
      var isCredit = pl.tipo === 'amortizado';
      qs('[data-credit-fields]').hidden = !isCredit;
      qs('[data-lot-step]').textContent = isCredit ? '4' : '3';
      amort.hidden = !isCredit;
      qs('[data-q-amort-link]').hidden = !isCredit;

      var key = pk + '|' + plk;
      if (isCredit) {
        var def = defaultEnganche(pk, plk);
        if (!engTouched[key]) showMoneyInput(def);
        var presets = [def, 20000000, 50000000];
        qs('[data-q-presets]').innerHTML = presets.map(function (c, i) {
          return '<button type="button" class="q-chip" data-amount="' + c + '">' + fmt0(c) + (i === 0 ? ' <small>(' + pl.enganchePct + '%)</small>' : '') + '</button>';
        }).join('');
        qs('[data-q-enganche-note]').textContent = 'Enganche sugerido: ' + fmt0(def) + ' (' + pl.enganchePct + '% del precio). Incluye el apartado de ' + fmt0(QD.apartado * 100) + '; el resto y la apertura se cubren en ' + pl.pagosEnganche + ' pagos.';
      }

      var r;
      try { r = compute(pk, plk, isCredit ? parseMoney(engInput.value) : 0); setError(''); }
      catch (e) {
        setError(e.message); current = null;
        qs('[data-q-hero]').textContent = '—';
        return;
      }
      current = r;
      $$('.q-chip', quote).forEach(function (b) { b.classList.toggle('is-active', +b.getAttribute('data-amount') === r.enganche); });

      qs('[data-q-name]').textContent = r.privada;
      qs('[data-q-plan-name]').textContent = r.plan;
      var hero = qs('[data-q-hero]');
      hero.classList.add('is-updating'); setTimeout(function () { hero.classList.remove('is-updating'); }, 160);
      var lines = '';
      if (r.tipo === 'amortizado') {
        qs('[data-q-hero-label]').textContent = 'Tu mensualidad estimada';
        hero.innerHTML = fmt2(r.mensual).replace(/(\.\d\d)$/, '<small>$1</small>');
        qs('[data-q-hero-sub]').textContent = r.meses + ' mensualidades · tasa anual ' + r.tasaAnual + '% · MXN';
        lines += line('Precio de lista', fmt2(r.lista));
        if (r.descuento) lines += line('Descuento', '−' + fmt2(r.descuento));
        lines += line('Enganche <small>incluye apartado</small>', fmt2(r.enganche));
        lines += line('Apertura de crédito <small>pago único</small>', fmt2(r.apertura));
        lines += line('Enganche + apertura', fmt2(r.inicial), 'is-strong');
        lines += line('Saldo a financiar', fmt2(r.principal), 'is-strong');
        lines += line('Primera mensualidad', dLong(r.primera));
        lines += line('Total con intereses y apertura', fmt2(r.total), 'quote-total');
        var br = qs('[data-q-bridge]'); br.hidden = false;
        br.textContent = 'Apartado de ' + fmt0(r.apartado) + ' y después ' + (r.nPuente - 1) + ' pagos de ' + fmt2(r.pagoPuente) + ' y uno de ' + fmt2(r.ultimoPuente) + ' para completar enganche y apertura, a partir de ' + MESES[r.inicioPuente.getMonth()] + ' de ' + r.inicioPuente.getFullYear() + '.';
        qs('[data-q-note]').textContent = 'Simulación con precio de lista al ' + QD.fechaLista + ', sin descuentos ni promociones. No reserva el lote ni aprueba el crédito; un asesor confirmará disponibilidad, fechas y condiciones finales.';
        renderTable(r);
      } else {
        qs('[data-q-bridge]').hidden = true;
        qs('[data-q-hero-label]').textContent = 'Precio de lista';
        hero.textContent = fmt0(r.precio);
        qs('[data-q-hero-sub]').textContent = fmt0(r.precio / QD.lote.m2) + ' por m² · lote de ' + QD.lote.m2 + ' m²';
        lines += line('Apartado', fmt0(r.apartado));
        if (r.tipo === 'contado') lines += line('Saldo en una sola exhibición', fmt0(r.saldo));
        else lines += line(r.meses + ' mensualidades de', fmt0(r.mensual), 'quote-monthly');
        lines += line('Total', fmt0(r.total), 'quote-total');
        qs('[data-q-note]').textContent = 'Precios de lista al ' + QD.fechaLista + ', sin descuentos ni promociones. Sujetos a cambio y disponibilidad. Un asesor te confirmará el precio final y los descuentos vigentes.';
      }
      qs('[data-q-lines]').innerHTML = lines;
      qs('[data-q-whatsapp]').href = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(summaryText(r));
    };

    quote.addEventListener('change', function (e) {
      if (e.target === engInput) return;
      render();
      if (current) track('cotizador_cambio', { privada: current.privada, plan: current.plan });
    });
    engInput.addEventListener('input', function () {
      var pk = ($('input[name="q-privada"]:checked', quote) || {}).value, plk = ($('input[name="q-plan"]:checked', quote) || {}).value;
      engTouched[pk + '|' + plk] = true; render();
    });
    engInput.addEventListener('blur', function () { var c = parseMoney(engInput.value); if (isFinite(c)) showMoneyInput(c); });
    quote.addEventListener('click', function (e) {
      var chip = e.target.closest && e.target.closest('.q-chip');
      if (!chip) return;
      var pk = ($('input[name="q-privada"]:checked', quote) || {}).value, plk = ($('input[name="q-plan"]:checked', quote) || {}).value;
      engTouched[pk + '|' + plk] = true;
      showMoneyInput(+chip.getAttribute('data-amount')); render();
    });
    qs('[data-q-whatsapp]').addEventListener('click', function (e) {
      if (!current) { e.preventDefault(); return; }
      track('cotizador_whatsapp', { privada: current.privada, plan: current.plan });
    });
    qs('[data-q-amort-link]').addEventListener('click', function () { amort.open = true; });

    // Descargas
    var download = function (blob, name) {
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    };
    var slug = function (r) { return r.privada.replace(/\s+/g, '_').normalize('NFD').replace(/[̀-ͯ]/g, ''); };
    $$('[data-q-csv]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var r = current; if (!r || !r.schedule) return;
        var n = function (c) { return (c / 100).toFixed(2); };
        var rows = [
          ['Cotización Los Senderos Residencial'], ['Privada', r.privada], ['Lote tipo', QD.lote.frente + ' x ' + QD.lote.fondo + ' m (' + QD.lote.m2 + ' m2)'],
          ['Precio de lista', n(r.lista)], ['Enganche (incluye apartado)', n(r.enganche)], ['Apertura de credito', n(r.apertura)],
          ['Saldo a financiar', n(r.principal)], ['Tasa anual %', r.tasaAnual], ['Mensualidad', n(r.mensual)], ['Intereses', n(r.intereses)],
          ['Total con intereses y apertura', n(r.total)], [],
          ['Pago', 'Fecha', 'Saldo inicial', 'Mensualidad', 'Capital', 'Interes', 'Saldo final']
        ].concat(r.schedule.map(function (x) { return [x.n, dShort(x.fecha), n(x.ini), n(x.pago), n(x.capital), n(x.interes), n(x.fin)]; }));
        download(new Blob(['﻿' + rows.map(function (row) { return row.join(','); }).join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'Amortizacion_' + slug(r) + '.csv');
        track('cotizador_csv');
      });
    });

    var jsPdfReady = null;
    var loadJsPdf = function () {
      if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
      if (jsPdfReady) return jsPdfReady;
      jsPdfReady = new Promise(function (ok, fail) {
        var s = document.createElement('script');
        s.src = 'assets/js/vendor/jspdf.umd.min.js'; s.onload = ok; s.onerror = fail;
        document.head.appendChild(s);
      });
      return jsPdfReady;
    };
    var pdfText = function (txt) { return String(txt).replace(/²/g, '2').replace(/−/g, '-'); };
    var buildPdf = function (r) {
      var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'letter' });
      var W = 216, M = 18, page = 1;
      var header = function (title) {
        doc.setFillColor(31, 54, 20); doc.rect(0, 0, W, 30, 'F');
        doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('Los Senderos Residencial', M, 14);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(221, 217, 163);
        doc.text('lossenderosresidencial.com.mx  |  WhatsApp (442) 823 0513  |  Tel. (442) 454 5511', M, 21);
        doc.text('Cotizacion generada el ' + dShort(new Date()), W - M, 14, { align: 'right' });
        doc.setTextColor(60, 99, 40); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(pdfText(title), M, 44);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120, 120, 110);
        doc.text('Pagina ' + page, W - M, 272, { align: 'right' });
      };
      header(r.privada + ' - ' + r.plan);
      var y = 52;
      doc.setFillColor(60, 99, 40); doc.roundedRect(M, y, W - 2 * M, 30, 3, 3, 'F');
      doc.setTextColor(221, 217, 163); doc.setFontSize(9);
      doc.text(r.tipo === 'amortizado' ? 'Mensualidad estimada - ' + r.meses + ' pagos - tasa anual ' + r.tasaAnual + '%' : 'Precio de lista', M + 8, y + 10);
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(24);
      doc.text((r.tipo === 'amortizado' ? fmt2(r.mensual) : fmt2(r.precio)) + ' MXN', M + 8, y + 23);
      y += 42;
      var rows = [['Lote tipo', QD.lote.frente + ' x ' + QD.lote.fondo + ' m (' + QD.lote.m2 + ' m2)'], ['Precio de lista', fmt2(r.lista)]];
      if (r.tipo === 'contado') rows.push(['Apartado', fmt2(r.apartado)], ['Saldo en una sola exhibicion', fmt2(r.saldo)], ['Total', fmt2(r.total)]);
      else if (r.tipo === 'meses') rows.push(['Apartado', fmt2(r.apartado)], [r.meses + ' mensualidades de', fmt2(r.mensual)], ['Total', fmt2(r.total)]);
      else {
        if (r.descuento) rows.push(['Descuento', '-' + fmt2(r.descuento)], ['Precio del terreno', fmt2(r.precio)]);
        rows.push(['Enganche (incluye apartado de ' + fmt0(r.apartado) + ')', fmt2(r.enganche)], ['Apertura de credito (pago unico)', fmt2(r.apertura)],
          ['Enganche + apertura', fmt2(r.inicial)], [(r.nPuente - 1) + ' pagos de enganche y apertura', fmt2(r.pagoPuente)], ['Ultimo pago de enganche y apertura', fmt2(r.ultimoPuente)],
          ['Saldo a financiar', fmt2(r.principal)], ['Primera mensualidad', dShort(r.primera)], ['Ultima mensualidad', dShort(r.ultima) + ' - ' + fmt2(r.ultimoPago)],
          ['Intereses del credito', fmt2(r.intereses)], ['Total con intereses y apertura', fmt2(r.total)]);
      }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      rows.forEach(function (row) {
        doc.setTextColor(76, 85, 70); doc.text(pdfText(row[0]), M, y);
        doc.setTextColor(31, 54, 20); doc.setFont('helvetica', 'bold'); doc.text(pdfText(row[1]), W - M, y, { align: 'right' }); doc.setFont('helvetica', 'normal');
        doc.setDrawColor(230, 226, 210); doc.line(M, y + 3, W - M, y + 3); y += 8.5;
      });
      y += 4; doc.setFontSize(8); doc.setTextColor(110, 110, 100);
      var note = r.tipo === 'amortizado'
        ? 'Credito directo sin revision de buro y sin aval. Simulacion con precio de lista al ' + QD.fechaLista + ', sin descuentos ni promociones. Las fechas son estimadas a partir de hoy. No reserva el lote ni aprueba el credito; un asesor confirmara disponibilidad, fechas y condiciones finales.'
        : 'Precios de lista al ' + QD.fechaLista + ', sin descuentos ni promociones. Sujetos a cambio y disponibilidad. Un asesor confirmara el precio final y los descuentos vigentes.';
      doc.text(doc.splitTextToSize(note, W - 2 * M), M, y);

      if (r.schedule) {
        var per = 36, xs = [M + 2, M + 16, 78, 106, 134, 160, W - M - 2];
        for (var s = 0; s < r.schedule.length; s += per) {
          doc.addPage(); page++; header('Tabla de amortizacion - ' + r.privada);
          doc.setFontSize(8); doc.setTextColor(90, 90, 80);
          doc.text(pdfText('Saldo financiado ' + fmt2(r.principal) + '  |  Mensualidad ' + fmt2(r.mensual) + '  |  Tasa mensual ' + (r.tasaAnual / 12) + '%  |  Importes en MXN'), M, 51);
          doc.setFillColor(239, 233, 214); doc.rect(M, 55, W - 2 * M, 8, 'F');
          doc.setFont('helvetica', 'bold'); doc.setTextColor(31, 54, 20);
          ['Pago', 'Fecha', 'Saldo inicial', 'Mensualidad', 'Capital', 'Interes', 'Saldo final'].forEach(function (h, i) { doc.text(h, xs[i], 60.5, { align: i > 1 ? 'right' : 'left' }); });
          doc.setFont('helvetica', 'normal');
          var ry = 68;
          r.schedule.slice(s, s + per).forEach(function (x) {
            if (x.n % 2 === 0) { doc.setFillColor(247, 244, 234); doc.rect(M, ry - 4.2, W - 2 * M, 5.8, 'F'); }
            doc.setTextColor(60, 66, 55);
            [String(x.n), dShort(x.fecha), fmt2(x.ini), fmt2(x.pago), fmt2(x.capital), fmt2(x.interes), fmt2(x.fin)].forEach(function (v, i) { doc.text(v, xs[i], ry, { align: i > 1 ? 'right' : 'left' }); });
            ry += 5.6;
          });
        }
      }
      return doc;
    };
    $$('[data-q-pdf]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var r = current; if (!r) return;
        var label = btn.innerHTML; btn.disabled = true; btn.textContent = 'Generando…';
        loadJsPdf().then(function () {
          buildPdf(r).save('Cotizacion_' + slug(r) + '_' + r.plan.replace(/\s+/g, '_').normalize('NFD').replace(/[̀-ͯ]/g, '') + '.pdf');
          track('cotizador_pdf', { privada: r.privada, plan: r.plan });
        }).catch(function () {
          alert('No se pudo generar el PDF. Puedes enviar tu cotización por WhatsApp.');
        }).then(function () { btn.disabled = false; btn.innerHTML = label; });
      });
    });

    render();
  }

  /* ---------- Masterplan interactivo ---------- */
  $$('[data-masterplan]').forEach(function (mp) {
    var pins = $$('[data-pin]', mp);
    var cImg = $('[data-pin-img]', mp), cTitle = $('[data-pin-title]', mp), cText = $('[data-pin-text]', mp);
    var auto = null, idx = -1;
    var select = function (i, fromUser) {
      idx = i;
      var pin = pins[i];
      pins.forEach(function (p) { p.setAttribute('aria-expanded', String(p === pin)); });
      cImg.classList.add('is-loading');
      cImg.onload = function () { cImg.classList.remove('is-loading'); };
      cImg.src = pin.getAttribute('data-img');
      cImg.alt = pin.getAttribute('data-alt');
      cTitle.textContent = pin.getAttribute('data-title');
      cText.textContent = pin.getAttribute('data-text');
      if (fromUser) {
        if (auto) { clearInterval(auto); auto = null; }
        track('masterplan_punto', { punto: pin.getAttribute('data-title') });
      }
    };
    pins.forEach(function (pin, i) { pin.addEventListener('click', function () { select(i, true); }); });
    // Recorre los puntos solo mientras el mapa está a la vista, hasta que el visitante toque uno
    if ('IntersectionObserver' in window && !reduceMotion) {
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) {
          if (idx === -1) select(0, false);
          if (!auto && idx !== -2) auto = setInterval(function () { select((idx + 1) % pins.length, false); }, 4500);
        } else if (auto) { clearInterval(auto); auto = null; }
      }, { threshold: 0.4 }).observe(mp);
      mp.addEventListener('pointerdown', function () { if (auto) { clearInterval(auto); auto = null; } idx = idx < 0 ? 0 : idx; }, { passive: true });
    }
  });

  /* ---------- Contadores animados ---------- */
  var counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduceMotion) {
    var fmt = function (n) { return n.toLocaleString('es-MX'); };
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        var el = en.target, end = +el.getAttribute('data-count');
        var pre = el.getAttribute('data-prefix') || '', suf = el.getAttribute('data-suffix') || '';
        var t0 = null, dur = 1400;
        var tick = function (t) {
          if (!t0) t0 = t;
          var k = Math.min((t - t0) / dur, 1);
          var eased = 1 - Math.pow(1 - k, 3);
          el.textContent = pre + fmt(Math.round(end * eased)) + suf;
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- Parallax suave ---------- */
  var parallax = $$('[data-parallax]');
  if (parallax.length && !reduceMotion) {
    var ticking = false;
    var update = function () {
      ticking = false;
      parallax.forEach(function (img) {
        var r = img.parentNode.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        var progress = (r.top + r.height / 2 - innerHeight / 2) / (innerHeight + r.height);
        img.style.transform = 'translate3d(0,' + (progress * -22).toFixed(2) + '%,0)';
      });
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

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
      wrap.classList.add('is-loaded');
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
      var submitLabel = $('[data-submit-label]', submitBtn) || submitBtn;
      submitLabel.textContent = 'Enviando…';
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
          submitLabel.textContent = 'Enviar solicitud';
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
