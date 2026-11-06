(function () {
  'use strict';

  /* Sticky header: solid shadow once the page scrolls */
  var header = document.querySelector('[data-header]');
  if (header) {
    var onScroll = function () { header.setAttribute('data-scrolled', window.scrollY > 10 ? 'true' : 'false'); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* Mobile menu */
  var toggle = document.querySelector('[data-menu-toggle]');
  var menu = document.querySelector('[data-menu]');
  if (header && toggle && menu) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      header.setAttribute('data-menu-open', open ? 'true' : 'false');
    };
    toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setOpen(false); toggle.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (toggle.getAttribute('aria-expanded') === 'true' && !header.contains(e.target)) setOpen(false);
    });
    window.matchMedia('(min-width: 1025px)').addEventListener('change', function (mq) { if (mq.matches) setOpen(false); });
  }

  /* Mark the current page in the primary nav */
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.primary-nav a, .portal-nav a').forEach(function (a) {
    if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page');
  });

  /* Accordions: [data-component="accordion"] > button[aria-controls] */
  document.querySelectorAll('[data-component="accordion"]').forEach(function (root) {
    var single = root.getAttribute('data-single') === 'true';
    var buttons = root.querySelectorAll('[data-accordion-trigger]');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') !== 'true';
        if (single && open) buttons.forEach(function (b) { if (b !== btn) b.setAttribute('aria-expanded', 'false'); });
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  });

  /* Tabs: [data-component="tabs"] with role=tab / role=tabpanel */
  document.querySelectorAll('[data-component="tabs"]').forEach(function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') n = tabs[0];
        if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
  });

  /* Timeline: single-open horizontal accordion with prev / next */
  document.querySelectorAll('[data-component="timeline"]').forEach(function (root) {
    var items = Array.prototype.slice.call(root.querySelectorAll('.timeline__years > li'));
    var buttons = items.map(function (li) { return li.querySelector('button'); });
    var cellsWrap = root.querySelector('.timeline__cells');
    var thumb = root.querySelector('.timeline__thumb');
    var prev = root.querySelector('[data-timeline-prev]');
    var next = root.querySelector('[data-timeline-next]');
    var cells = items.map(function () { var c = document.createElement('span'); cellsWrap.appendChild(c); return c; });
    var select = function (idx) {
      buttons.forEach(function (b, i) {
        b.setAttribute('aria-expanded', i === idx ? 'true' : 'false');
        var d = Math.abs(i - idx);
        items[i].setAttribute('data-dist', String(Math.min(d, 3)));
        cells[i].setAttribute('data-active', i === idx ? 'true' : 'false');
      });
      cells[idx].appendChild(thumb);
      prev.disabled = idx === 0;
      next.disabled = idx === items.length - 1;
      root.setAttribute('data-active-index', String(idx));
    };
    var current = function () { return buttons.findIndex(function (b) { return b.getAttribute('aria-expanded') === 'true'; }); };
    buttons.forEach(function (b, i) { b.addEventListener('click', function () { select(i); }); });
    prev.addEventListener('click', function () { select(Math.max(0, current() - 1)); });
    next.addEventListener('click', function () { select(Math.min(items.length - 1, current() + 1)); });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); select(Math.max(0, current() - 1)); }
      if (e.key === 'ArrowRight') { e.preventDefault(); select(Math.min(items.length - 1, current() + 1)); }
    });
    var start = current(); select(start < 0 ? 0 : start);
  });

  /* Carousel: scroll-snap track, arrows scroll one card, disabled at the ends */
  document.querySelectorAll('[data-component="carousel"]').forEach(function (root) {
    var track = root.querySelector('[data-carousel-track]');
    var prev = root.querySelector('[data-carousel-prev]');
    var next = root.querySelector('[data-carousel-next]');
    var step = function () { var c = track.firstElementChild; return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0) : track.clientWidth; };
    var update = function () {
      var max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
    };
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* Product filter: checkboxes (OR within a group, AND across groups) + text search + chips */
  document.querySelectorAll('[data-component="product-filter"]').forEach(function (root) {
    var boxes = Array.prototype.slice.call(root.querySelectorAll('.filters input[type="checkbox"]'));
    var cards = Array.prototype.slice.call(root.querySelectorAll('[data-filter-grid] > li'));
    var count = root.querySelector('[data-filter-count]');
    var chips = root.querySelector('[data-filter-chips]');
    var empty = root.querySelector('[data-filter-empty]');
    var searchForm = root.querySelector('[data-filter-search]');
    var search = searchForm ? searchForm.querySelector('input') : null;
    var query = '';
    var apply = function () {
      var groups = {};
      boxes.forEach(function (b) { if (b.checked) (groups[b.name] = groups[b.name] || []).push(b.value); });
      var shown = 0;
      cards.forEach(function (card) {
        var ok = Object.keys(groups).every(function (g) {
          var have = (card.getAttribute('data-' + g) || '').split(' ');
          return groups[g].some(function (v) { return have.indexOf(v) > -1; });
        });
        if (ok && query) ok = card.textContent.toLowerCase().indexOf(query) > -1;
        card.hidden = !ok;
        if (ok) shown++;
      });
      count.textContent = String(shown);
      if (empty) empty.hidden = shown > 0;
      chips.innerHTML = '';
      boxes.filter(function (b) { return b.checked; }).forEach(function (b) {
        var li = document.createElement('li'); li.className = 'chip';
        var label = document.createElement('span'); label.textContent = b.getAttribute('data-chip');
        var x = document.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', 'Remove filter ' + b.getAttribute('data-chip')); x.textContent = '✕';
        x.addEventListener('click', function () { b.checked = false; apply(); b.focus(); });
        li.appendChild(label); li.appendChild(x); chips.appendChild(li);
      });
      if (query) {
        var li = document.createElement('li'); li.className = 'chip';
        var label = document.createElement('span'); label.textContent = '“' + query + '”';
        var x = document.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', 'Clear search'); x.textContent = '✕';
        x.addEventListener('click', function () { query = ''; search.value = ''; apply(); search.focus(); });
        li.appendChild(label); li.appendChild(x); chips.appendChild(li);
      }
    };
    boxes.forEach(function (b) { b.addEventListener('change', apply); });
    root.querySelectorAll('[data-filter-clear]').forEach(function (btn) {
      btn.addEventListener('click', function () { boxes.forEach(function (b) { b.checked = false; }); query = ''; if (search) search.value = ''; apply(); });
    });
    if (searchForm) searchForm.addEventListener('submit', function (e) { e.preventDefault(); query = search.value.trim().toLowerCase(); apply(); });
    var sort = root.querySelector('[data-filter-sort]');
    if (sort) sort.addEventListener('change', function () {
      var grid = root.querySelector('[data-filter-grid]');
      cards.slice().sort(function (x, y) {
        var r = (x.getAttribute('data-title') || '').localeCompare(y.getAttribute('data-title') || '');
        return sort.value === 'za' ? -r : r;
      }).forEach(function (c) { grid.appendChild(c); });
    });
    apply();
  });

  /* Product gallery: thumbnails swap the main image */
  document.querySelectorAll('[data-component="gallery"]').forEach(function (root) {
    var main = root.querySelector('[data-gallery-main]');
    var orig = { src: main.getAttribute('src'), alt: main.getAttribute('alt') };
    var thumbs = Array.prototype.slice.call(root.querySelectorAll('.gallery__thumb'));
    thumbs.forEach(function (t) {
      t.addEventListener('click', function () {
        var on = t.getAttribute('aria-pressed') !== 'true';
        thumbs.forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        t.setAttribute('aria-pressed', on ? 'true' : 'false');
        main.setAttribute('src', on ? t.getAttribute('data-src') : orig.src);
        main.setAttribute('alt', on ? t.getAttribute('data-alt') : orig.alt);
      });
    });
  });

  /* Section sub-navigation: mark the clicked tab */
  document.querySelectorAll('[data-component="subnav"]').forEach(function (root) {
    var links = root.querySelectorAll('a');
    links.forEach(function (a) {
      a.addEventListener('click', function () {
        links.forEach(function (o) { o.removeAttribute('aria-current'); });
        a.setAttribute('aria-current', 'true');
      });
    });
  });

  /* Blade size selector: updates the part number, specs and size-guide row */
  document.querySelectorAll('[data-size-select]').forEach(function (select) {
    var table = document.querySelector('[data-size-table]');
    var page = select.closest('.pp-hero') || document;
    var update = function () {
      var row = table && table.querySelector('tr[data-size="' + select.value + '"]');
      if (!row) return;
      table.querySelectorAll('tbody tr').forEach(function (r) { r.removeAttribute('aria-current'); });
      row.setAttribute('aria-current', 'true');
      var cells = row.children;
      var set = function (k, v) { page.querySelectorAll('[data-spec="' + k + '"]').forEach(function (el) { el.textContent = v; }); };
      set('part', cells[1].textContent);
      set('width', select.value + ' mm');
      set('length', cells[2].textContent);
      set('handle', cells[3].textContent + ' scalpel handle');
    };
    select.addEventListener('change', update);
    update();
  });

  /* Forms: client-side validation, no endpoint in the design */
  document.querySelectorAll('form[data-validate]').forEach(function (form) {
    var status = form.querySelector('[data-form-status]');
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var invalid = Array.prototype.filter.call(form.elements, function (el) { return el.willValidate && !el.checkValidity(); });
      Array.prototype.forEach.call(form.elements, function (el) {
        if (el.willValidate) el.setAttribute('aria-invalid', el.checkValidity() ? 'false' : 'true');
      });
      if (invalid.length) {
        if (status) status.textContent = 'Please complete the ' + invalid.length + ' highlighted field' + (invalid.length > 1 ? 's' : '') + '.';
        invalid[0].focus();
        return;
      }
      var next = form.getAttribute('data-next');
      if (next) { location.href = next; return; }
      if (status) status.textContent = 'Thank you — your message is ready to send.';
      form.reset();
    });
  });
})();
