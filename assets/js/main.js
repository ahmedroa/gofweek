(() => {
  'use strict';

  const doc = document.documentElement;
  const isStatic = doc.classList.contains('static');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;

  /* ---------- الهيدر والقائمة ---------- */
  const header = document.querySelector('.site-header');
  const menuBtn = header.querySelector('.menu-btn');
  const nav = document.getElementById('site-nav');

  const setSolid = () => header.classList.toggle('is-solid', window.scrollY > 24);
  setSolid();
  window.addEventListener('scroll', setSolid, { passive: true });

  const setMenu = (open) => {
    header.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
  };
  menuBtn.addEventListener('click', () => setMenu(!header.classList.contains('menu-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); }
  });
  window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- الرابط النشط ---------- */
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  if (hasIO) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = '#' + entry.target.id;
        links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main > section[id]').forEach((s) => spy.observe(s));
  }

  /* ---------- الظهور التدريجي ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if (isStatic || reduceMotion || !hasIO) {
    reveals.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      let i = 0;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.style.transitionDelay = (i++ * 70) + 'ms';
        el.classList.add('in');
        el.addEventListener('transitionend', () => { el.style.transitionDelay = ''; }, { once: true });
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- العدّادات ---------- */
  if (!isStatic && !reduceMotion && hasIO) {
    const fmt = (n, d) => new Intl.NumberFormat('ar-u-nu-arab', {
      minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false,
    }).format(n);
    const co = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        co.unobserve(entry.target);
        const el = entry.target;
        const to = parseFloat(el.dataset.count);
        const d = parseInt(el.dataset.decimals || '0', 10);
        const t0 = performance.now();
        const dur = 1400;
        const tick = (t) => {
          const p = Math.min(1, (t - t0) / dur);
          el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)), d);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('[data-count]').forEach((el) => co.observe(el));
  }

  /* ---------- التبويبات ---------- */
  document.querySelectorAll('[role="tablist"]').forEach((list) => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (e) => {
        // الصفحة من اليمين لليسار: السهم الأيسر يتقدّم
        const n = tabs.length;
        const j = { ArrowLeft: (i + 1) % n, ArrowRight: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
        if (j === undefined) return;
        e.preventDefault();
        select(tabs[j], true);
      });
    });
  });

  /* ---------- عارض الصور ---------- */
  const lb = document.getElementById('lightbox');
  if (lb && typeof lb.showModal === 'function') {
    const lbImg = lb.querySelector('img');
    const lbCap = lb.querySelector('figcaption');
    let items = [];
    let idx = 0;
    let opener = null;

    const show = (i) => {
      idx = (i + items.length) % items.length;
      const btn = items[idx];
      const img = btn.querySelector('img');
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lbCap.textContent = btn.dataset.caption || img.alt;
    };

    document.querySelectorAll('[data-gallery]').forEach((group) => {
      const tiles = [...group.querySelectorAll('button.tile')];
      tiles.forEach((btn, i) => btn.addEventListener('click', () => {
        items = tiles;
        opener = btn;
        lb.classList.toggle('single', tiles.length < 2);
        show(i);
        lb.showModal();
        doc.classList.add('lb-open');
      }));
    });

    lb.querySelector('.lb-prev').addEventListener('click', () => show(idx - 1));
    lb.querySelector('.lb-next').addEventListener('click', () => show(idx + 1));
    lb.querySelector('.lb-close').addEventListener('click', () => lb.close());
    lb.addEventListener('click', (e) => {
      if (e.target === lb || e.target.tagName === 'FIGURE') lb.close();
    });
    lb.addEventListener('keydown', (e) => {
      if (items.length < 2) return;
      if (e.key === 'ArrowLeft') show(idx + 1);
      if (e.key === 'ArrowRight') show(idx - 1);
    });
    lb.addEventListener('close', () => {
      doc.classList.remove('lb-open');
      lbImg.removeAttribute('src');
      if (opener) opener.focus();
    });
  }

  /* ---------- نموذج الرعاية ---------- */
  const form = document.getElementById('sponsor-form');
  if (!form) return;
  const pkgSelect = form.querySelector('#f-pkg');
  const status = form.querySelector('.form-status');
  const PHONE = '966554337331';
  const EMAIL = 'Info@gofweek.com';

  document.querySelectorAll('[data-package]').forEach((a) => a.addEventListener('click', () => {
    pkgSelect.value = a.dataset.package;
    setTimeout(() => form.querySelector('#f-name').focus({ preventScroll: true }), 700);
  }));

  form.addEventListener('input', (e) => {
    const field = e.target.closest('.field');
    if (field) field.classList.remove('is-invalid');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const via = (e.submitter && e.submitter.value) || 'wa';
    const data = Object.fromEntries(new FormData(form));
    const name = String(data.name || '').trim();
    const org = String(data.org || '').trim();
    const message = String(data.message || '').trim();

    const missing = [['name', name], ['org', org]].filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) {
      missing.forEach((k) => form.querySelector(`[name="${k}"]`).closest('.field').classList.add('is-invalid'));
      status.textContent = 'فضلًا اكتب الاسم والجهة.';
      status.className = 'form-status is-error';
      form.querySelector(`[name="${missing[0]}"]`).focus();
      return;
    }

    const lines = [
      'السلام عليكم فريق ضيف الأسبوع،',
      `أنا ${name} من ${org}.`,
      `نوع الشراكة: ${data.package}`,
    ];
    if (message) lines.push('', message);
    const text = lines.join('\n');

    if (via === 'mail') {
      const subject = `طلب رعاية — ${org}`;
      location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
      status.textContent = 'جهّزنا لك رسالة البريد، أرسلها من تطبيق البريد.';
    } else {
      window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      status.textContent = 'فتحنا لك واتساب برسالة جاهزة، اضغط إرسال هناك.';
    }
    status.className = 'form-status is-ok';
  });
})();
