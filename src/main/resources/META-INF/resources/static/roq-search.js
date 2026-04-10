(function () {
  function n(text) { return String(text || '').replace(/\s+/g, ' ').trim(); }
  function esc(text) { return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function toAbs(url) { var u = new URL(url, window.location.href); u.hash = ''; u.search = ''; return u.href; }
  function dedupe(items) {
    var seen = new Set();
    return items.filter(function (x) { if (!x.url || seen.has(x.url)) return false; seen.add(x.url); return true; });
  }

  function docs() {
    var nodes = Array.prototype.slice.call((document.getElementById('roq-search-docs') || document).querySelectorAll('#roq-search-docs [data-url]'));
    var out = nodes.map(function (node) { return { title: n(node.getAttribute('data-title') || node.getAttribute('data-url')), url: toAbs(node.getAttribute('data-url') || '') }; });
    out.push({ title: document.title || 'Current page', url: toAbs(window.location.href) });
    return dedupe(out).filter(function (d) { return d.title && d.url; });
  }

  function snippet(node) {
    if (!node) return '';
    var clone = node.cloneNode(true);
    Array.prototype.slice.call(clone.querySelectorAll('code')).forEach(function (c) { c.replaceWith(document.createTextNode('`' + (c.textContent || '') + '`')); });
    var text = n(clone.textContent || '');
    return text.length <= 220 ? text : text.substring(0, 217) + '...';
  }

  function records(doc, pageUrl, pageTitle) {
    var article = doc.querySelector('.md-content__inner.md-typeset') || doc.querySelector('article') || doc.body;
    if (!article) return [];
    var title = n(pageTitle || doc.title || 'Page');
    var list = [{ pageTitle: title, sectionTitle: '', title: title, url: pageUrl, text: snippet(article.querySelector('p') || article), searchText: n(article.textContent || '') }];
    Array.prototype.slice.call(article.querySelectorAll('h2, h3, h4')).forEach(function (h) {
      if (!h.id) return;
      var next = h.nextElementSibling;
      while (next && /^(H2|H3|H4)$/i.test(next.tagName)) next = next.nextElementSibling;
      var parts = [n(h.textContent || '')], w = h.nextElementSibling;
      while (w && !/^(H2|H3|H4)$/i.test(w.tagName)) { parts.push(n(w.textContent || '')); w = w.nextElementSibling; }
      list.push({ pageTitle: title, sectionTitle: n(h.textContent || ''), title: title, url: pageUrl + '#' + h.id, text: snippet(next || h), searchText: n(parts.join(' ')) });
    });
    return list;
  }

  var input = document.querySelector('[data-md-component="search-query"]');
  var root = document.querySelector('[data-md-component="search-result"]');
  if (!input || !root) return;
  var status = root.querySelector('.md-search-result__meta');
  var listEl = root.querySelector('.md-search-result__list');
  if (!status || !listEl) return;

  var cache = { rows: [], ready: false, loading: null };
  function ensureIndex() {
    if (cache.ready) return Promise.resolve(cache.rows);
    if (cache.loading) return cache.loading;
    cache.loading = Promise.all(docs().map(function (d) {
      return fetch(d.url).then(function (res) { return res.ok ? res.text() : ''; }).then(function (html) {
        if (!html) return [];
        return records(new DOMParser().parseFromString(html, 'text/html'), d.url, d.title);
      }).catch(function () { return []; });
    })).then(function (all) {
      cache.rows = dedupe([].concat.apply([], all));
      cache.ready = true;
      return cache.rows;
    });
    return cache.loading;
  }

  function runSearch(q) {
    var query = n(q).toLowerCase();
    var terms = query.split(/\s+/).filter(Boolean);
    var analyzed = cache.rows.map(function (r) {
      var title = n(r.title).toLowerCase();
      var text = n(r.searchText || r.text).toLowerCase();
      var hay = title + ' ' + text;
      var missing = terms.filter(function (t) { return hay.indexOf(t) === -1; });
      return { item: r, phrase: hay.indexOf(query) !== -1, matched: terms.length - missing.length, missing: missing, title: title, text: text };
    });

    var phrase = analyzed.filter(function (x) { return x.phrase; }).map(function (x) {
      return { score: 100 + (x.title.indexOf(query) !== -1 ? 10 : 0) + (x.text.indexOf(query) !== -1 ? 6 : 0), item: Object.assign({}, x.item, { missingTerms: [] }) };
    }).sort(function (a, b) { return b.score - a.score; }).map(function (x) { return x.item; });
    if (phrase.length) return phrase.slice(0, 30);

    return analyzed.filter(function (x) { return x.matched > 0; }).map(function (x) {
      return { score: x.matched * 10 - x.missing.length * 2, item: Object.assign({}, x.item, { missingTerms: x.missing }) };
    }).sort(function (a, b) { return b.score - a.score; }).map(function (x) { return x.item; }).slice(0, 30);
  }

  function mark(text, q) {
    var safe = esc(text || '');
    var terms = n(q).toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return safe.replace(/`([^`]+)`/g, '<code>$1</code>');
    var alt = terms.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|');
    safe = safe.replace(new RegExp('\\b[\\w-]*(?:' + alt + ')[\\w-]*\\b', 'ig'), '<mark>$&</mark>');
    return safe.replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function missingHtml(terms) {
    return (Array.isArray(terms) && terms.length) ? '<em>Missing: ' + terms.map(function (t) { return '<s>' + esc(t) + '</s>'; }).join(', ') + '</em>' : '';
  }

  function focusSnippet(item, q) {
    var query = n(q).toLowerCase();
    var preview = n(item.text || item.searchText || item.url || '');
    if (!query || !preview) return preview;
    if (preview.toLowerCase().indexOf(query) !== -1) return preview;
    var source = n(item.searchText || preview), src = source.toLowerCase();
    var idx = src.indexOf(query);
    if (idx === -1) {
      var terms = query.split(/\s+/).filter(Boolean).map(function (t) { return src.indexOf(t); }).filter(function (i) { return i >= 0; });
      idx = terms.length ? Math.min.apply(null, terms) : -1;
    }
    if (idx === -1) return preview;
    var start = Math.max(0, idx - 90), end = Math.min(source.length, start + 220);
    if (end - start < 220) start = Math.max(0, end - 220);
    return (start > 0 ? '... ' : '') + source.substring(start, end).trim() + (end < source.length ? ' ...' : '');
  }

  function group(items) {
    var map = new Map();
    items.forEach(function (it) {
      var key = toAbs(it.url), g = map.get(key);
      if (!g) map.set(key, { primary: it, extras: [] });
      else g.extras.push(it);
    });
    return Array.from(map.values());
  }

  function resultArticle(item, q, extra) {
    var article = document.createElement('article');
    article.className = 'md-search-result__article md-typeset';
    var icon = document.createElement('div'); icon.className = 'md-search-result__icon md-icon'; article.appendChild(icon);
    var hMain = document.createElement(extra ? 'h2' : 'h1');
    hMain.innerHTML = mark(extra ? (item.sectionTitle || item.pageTitle || item.title) : (item.pageTitle || item.title), q);
    article.appendChild(hMain);
    if (!extra && item.sectionTitle) {
      var h2 = document.createElement('h2'); h2.innerHTML = mark(item.sectionTitle, q); article.appendChild(h2);
    }
    var p = document.createElement('p'); p.innerHTML = mark(focusSnippet(item, q) || item.url, q); article.appendChild(p);
    var miss = missingHtml(item.missingTerms); if (miss) { var pm = document.createElement('p'); pm.innerHTML = miss; article.appendChild(pm); }
    return article;
  }

  function render(items, q) {
    listEl.innerHTML = '';
    group(items).forEach(function (g) {
      var li = document.createElement('li'); li.className = 'md-search-result__item';
      var a = document.createElement('a'); a.className = 'md-search-result__link'; a.href = g.primary.url; a.appendChild(resultArticle(g.primary, q, false));
      li.appendChild(a);
      if (g.extras.length) {
        var more = document.createElement('details'); more.className = 'md-search-result__more';
        var summary = document.createElement('summary'); var div = document.createElement('div'); div.textContent = g.extras.length + ' more on this page'; summary.appendChild(div); more.appendChild(summary);
        g.extras.forEach(function (e) { var ea = document.createElement('a'); ea.className = 'md-search-result__link'; ea.href = e.url; ea.appendChild(resultArticle(e, q, true)); more.appendChild(ea); });
        li.appendChild(more);
      }
      listEl.appendChild(li);
    });
  }

  function onSearch() {
    var q = n(input.value).toLowerCase();
    if (!q) { status.textContent = 'Type to start searching'; listEl.innerHTML = ''; return; }
    status.textContent = 'Initializing search';
    ensureIndex().then(function () {
      var matches = runSearch(q);
      if (!matches.length) { status.textContent = 'No matching documents'; listEl.innerHTML = ''; return; }
      status.textContent = matches.length + ' matching document' + (matches.length === 1 ? '' : 's');
      render(matches, q);
    });
  }

  input.addEventListener('input', onSearch);
  var form = input.closest('form');
  if (form) form.addEventListener('reset', function () { setTimeout(onSearch, 0); });
})();
