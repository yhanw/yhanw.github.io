/* ============================================================
   yhw · 个人主页 — 博客脚本（列表 / 文章 / Markdown 渲染）
   ============================================================ */
(function () {
  'use strict';

  var DATA_URL = 'data/posts.json';
  var POSTS_DIR = 'posts/';

  /* ---------- 工具 ---------- */
  function escapeHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtDate(d) {
    return String(d).slice(0, 10);
  }

  /* ---------- Markdown 渲染（先转义再转换，天然防 XSS） ---------- */
  function renderMarkdown(src) {
    if (typeof src !== 'string') return '';
    var blocks = [];

    /* 围栏代码块：先提取为占位符，最后还原 */
    src = src.replace(/```([\w+-]*)\n?([\s\S]*?)```/g, function (m, lang, code) {
      blocks.push('<pre class="code-block"><code>' + escapeHtml(code.replace(/\n$/, '')) + '</code></pre>');
      return '\u0000' + (blocks.length - 1) + '\u0000';
    });

    src = escapeHtml(src);

    /* 标题 */
    src = src.replace(/^###### (.*)$/gm, '<h6>$1</h6>');
    src = src.replace(/^##### (.*)$/gm, '<h5>$1</h5>');
    src = src.replace(/^#### (.*)$/gm, '<h4>$1</h4>');
    src = src.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    src = src.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    src = src.replace(/^# (.*)$/gm, '<h1>$1</h1>');

    /* 分割线 */
    src = src.replace(/^-{3,}$/gm, '<hr>');

    /* 引用 */
    src = src.replace(/^&gt; ?(.*)$/gm, '<blockquote>$1</blockquote>');

    /* 无序列表 */
    src = src.replace(/(?:^|\n)((?:[-*] .*(?:\n|$))+)/g, function (m, list) {
      var items = list.trim().split('\n').map(function (l) {
        return '<li>' + l.replace(/^[-*] /, '') + '</li>';
      }).join('');
      return '\n<ul>' + items + '</ul>\n';
    });
    /* 有序列表 */
    src = src.replace(/(?:^|\n)((?:\d+\. .*(?:\n|$))+)/g, function (m, list) {
      var items = list.trim().split('\n').map(function (l) {
        return '<li>' + l.replace(/^\d+\. /, '') + '</li>';
      }).join('');
      return '\n<ol>' + items + '</ol>\n';
    });

    /* 行内：图片 → 链接 → 行内代码 → 加粗 → 斜体 */
    src = src.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
    src = src.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    src = src.replace(/`([^`]+)`/g, '<code>$1</code>');
    src = src.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    src = src.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

    /* 段落（含代码块占位符的块不包裹，避免 <p><pre> 无效结构） */
    src = src.split(/\n{2,}/).map(function (block) {
      block = block.trim();
      if (!block) return '';
      if (/^(<h[1-6]|<ul|<ol|<pre|<blockquote|<hr|<img)/.test(block)) return block;
      if (block.indexOf('\u0000') >= 0) return block;
      return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');

    /* 还原代码块 */
    src = src.replace(/\u0000(\d+)\u0000/g, function (m, i) {
      return blocks[+i] || '';
    });

    return src;
  }

  /* ---------- 博客列表页 ---------- */
  function initList() {
    var grid = document.querySelector('.blog-grid');
    var empty = document.querySelector('.blog-empty');
    var catBar = document.querySelector('.cat-bar');
    if (!grid || !empty) return;

    var allPosts = [];

    function showEmpty(msg) {
      grid.style.display = 'none';
      empty.style.display = 'block';
      empty.querySelector('.empty-msg').textContent = msg;
    }

    function renderList(posts) {
      grid.innerHTML = '';
      posts.forEach(function (p) {
        var card = document.createElement('a');
        card.className = 'post-card reveal in';
        card.href = 'post.html?id=' + encodeURIComponent(p.id);
        card.innerHTML =
          '<div class="post-meta">' +
          '<span class="post-cat">' + escapeHtml(p.category || '随笔') + '</span>' +
          '<span>' + fmtDate(p.date) + '</span>' +
          '</div>' +
          '<h3 class="post-title">' + escapeHtml(p.title) + '</h3>' +
          '<p class="post-summary">' + escapeHtml(p.summary || '') + '</p>' +
          (p.tags && p.tags.length
            ? '<div class="post-tags">' + p.tags.map(function (t) { return '<span>#' + escapeHtml(t) + '</span>'; }).join('') + '</div>'
            : '') +
          '<span class="post-more">阅读全文 →</span>';
        grid.appendChild(card);
      });
      if (!posts.length) showEmpty('还没有文章。');
    }

    function catOf(p) { return p.category || '随笔'; }

    function countBy(posts, fn) {
      var m = {};
      posts.forEach(function (p) {
        var k = fn(p);
        m[k] = (m[k] || 0) + 1;
      });
      return m;
    }

    function selectCat(cat) {
      catBar.querySelectorAll('.cat-btn').forEach(function (b) {
        b.classList.toggle('is-active', (b.dataset.cat || '') === cat);
      });
      var sideCats = document.getElementById('widget-cats');
      if (sideCats) {
        sideCats.querySelectorAll('button').forEach(function (b) {
          b.classList.toggle('is-active', (b.dataset.cat || '') === cat);
        });
      }
      renderList(cat ? allPosts.filter(function (p) { return catOf(p) === cat; }) : allPosts);
    }

    function renderCats(posts) {
      if (!catBar) return;
      var catM = countBy(posts, catOf);
      var frag = document.createDocumentFragment();
      var all = document.createElement('button');
      all.className = 'cat-btn is-active';
      all.innerHTML = '全部 <span class="cnt">' + posts.length + '</span>';
      frag.appendChild(all);
      Object.keys(catM).sort().forEach(function (c) {
        var b = document.createElement('button');
        b.className = 'cat-btn';
        b.innerHTML = escapeHtml(c) + ' <span class="cnt">' + catM[c] + '</span>';
        b.dataset.cat = c;
        frag.appendChild(b);
      });
      catBar.appendChild(frag);
      catBar.addEventListener('click', function (e) {
        var btn = e.target.closest('.cat-btn');
        if (!btn) return;
        selectCat(btn.dataset.cat || '');
      });
    }

    /* 侧边栏 widgets：分类 / 标签 / 归档 */
    function renderSidebar(posts) {
      var catsBox = document.getElementById('widget-cats');
      var tagsBox = document.getElementById('widget-tags');
      var archBox = document.getElementById('widget-archives');
      var catM = countBy(posts, catOf);
      var tagM = {};
      var yearM = {};
      posts.forEach(function (p) {
        (p.tags || []).forEach(function (t) { tagM[t] = (tagM[t] || 0) + 1; });
        var y = String(p.date || '').slice(0, 4);
        if (y) yearM[y] = (yearM[y] || 0) + 1;
      });

      if (catsBox) {
        catsBox.innerHTML = Object.keys(catM).sort().map(function (c) {
          return '<button data-cat="' + escapeHtml(c) + '"><span>' + escapeHtml(c) + '</span><span class="cnt">' + catM[c] + '</span></button>';
        }).join('') || '<span class="widget-empty">暂无分类</span>';
        catsBox.addEventListener('click', function (e) {
          var btn = e.target.closest('button');
          if (!btn) return;
          selectCat(btn.dataset.cat || '');
        });
      }
      if (tagsBox) {
        tagsBox.innerHTML = Object.keys(tagM).sort().map(function (t) {
          return '<span>#' + escapeHtml(t) + '</span>';
        }).join('') || '<span class="widget-empty">暂无标签</span>';
      }
      if (archBox) {
        archBox.innerHTML = Object.keys(yearM).sort().reverse().map(function (y) {
          return '<div class="arch"><span>' + y + '</span><span class="cnt">' + yearM[y] + ' 篇</span></div>';
        }).join('') || '<span class="widget-empty">暂无归档</span>';
      }
    }

    fetch(DATA_URL)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        allPosts = (data.posts || []).filter(function (p) { return !p.draft; })
          .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
        renderCats(allPosts);
        renderSidebar(allPosts);
        renderList(allPosts);
      })
      .catch(function () {
        showEmpty('加载失败，请稍后再试。');
      });
  }

  /* ---------- 文章页 ---------- */
  function initPost() {
    var hero = document.querySelector('.post-hero-card');
    var body = document.querySelector('.post-body');
    var nav = document.querySelector('.post-nav');
    if (!hero || !body) return;

    var params = new URLSearchParams(location.search);
    var id = params.get('id');
    if (!id) { body.innerHTML = '<p>没有找到这篇文章。</p>'; return; }

    fetch(DATA_URL)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        var posts = (data.posts || []).filter(function (p) { return !p.draft; })
          .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
        var post = null;
        posts.forEach(function (p) { if (p.id === id) post = p; });
        if (!post) { body.innerHTML = '<p>这篇文章不存在或已删除。</p>'; return; }

        document.title = post.title + ' · yhw';
        hero.querySelector('.post-hero-cat').textContent = post.category || '随笔';
        hero.querySelector('.post-hero-date').textContent = fmtDate(post.date);
        var tagBox = hero.querySelector('.post-hero-tags');
        if (post.tags && post.tags.length) {
          tagBox.innerHTML = post.tags.map(function (t) { return '<span class="chip chip-pink">#' + escapeHtml(t) + '</span>'; }).join('');
        }
        hero.querySelector('.post-hero-title').textContent = post.title;

        /* 上一篇 / 下一篇 */
        var idx = posts.indexOf(post);
        var prev = idx > 0 ? posts[idx - 1] : null;
        var next = idx < posts.length - 1 ? posts[idx + 1] : null;
        var prevLink = nav.querySelector('.post-prev');
        var nextLink = nav.querySelector('.post-next');
        if (prev) {
          prevLink.setAttribute('href', 'post.html?id=' + encodeURIComponent(prev.id));
          prevLink.querySelector('.nav-title').textContent = prev.title;
        } else {
          prevLink.remove();
        }
        if (next) {
          nextLink.setAttribute('href', 'post.html?id=' + encodeURIComponent(next.id));
          nextLink.querySelector('.nav-title').textContent = next.title;
        } else {
          nextLink.remove();
        }

        return fetch(POSTS_DIR + post.id + '.md').then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        }).then(function (md) {
          body.innerHTML = renderMarkdown(md);
        });
      })
      .catch(function () {
        body.innerHTML = '<p>文章加载失败，请稍后再试。</p>';
      });
  }

  /* ---------- 按页面自动初始化 ---------- */
  if (document.querySelector('.blog-grid')) initList();
  if (document.querySelector('.post-hero-card')) initPost();

  /* 导出给管理后台做实时预览 */
  window.MoeBlog = { renderMarkdown: renderMarkdown, escapeHtml: escapeHtml };
})();
