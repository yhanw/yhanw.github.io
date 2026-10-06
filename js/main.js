/* ============================================================
   yhw · 个人主页 — 交互脚本
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 明暗主题（Material You） ---------- */
  function applyTheme(t) {
    document.documentElement.classList.toggle('dark', t === 'dark');
    var tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', t === 'dark' ? '#171216' : '#FFF8FA');
    /* giscus 评论区主题同步 */
    var iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) {
      try {
        iframe.contentWindow.postMessage({
          giscus: { setConfig: { theme: t === 'dark' ? 'dark' : 'light' } }
        }, 'https://giscus.app');
      } catch (e) { /* 忽略 */ }
    }
  }
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('theme'); } catch (e) { /* 隐私模式忽略 */ }
    if (!saved) {
      saved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    applyTheme(saved);
  }
  initTheme();
  var themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var dark = document.documentElement.classList.contains('dark');
      var next = dark ? 'light' : 'dark';
      try { localStorage.setItem('theme', next); } catch (e) { /* 忽略 */ }
      applyTheme(next);
    });
  }

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 移动端导航 ---------- */
  var burger = document.querySelector('.nav-burger');
  var links = document.querySelector('.nav-links');
  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        links.classList.remove('is-open');
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- 导航滚动状态 ---------- */
  var nav = document.querySelector('.nav');
  if (nav) {
    var onScrollNav = function () {
      nav.classList.toggle('is-scrolled', window.scrollY > 30);
    };
    window.addEventListener('scroll', onScrollNav, { passive: true });
    onScrollNav();
  }

  /* ---------- 返回顶部 ---------- */
  var toTop = document.querySelector('.to-top');
  if (toTop) {
    var onScrollTop = function () {
      toTop.classList.toggle('show', window.scrollY > 480);
    };
    window.addEventListener('scroll', onScrollTop, { passive: true });
    onScrollTop();
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    });
  }

  /* ---------- 滚动显现 + 进度条动画 ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  var barEls = document.querySelectorAll('.skill-bar-fill, .attr-fill');
  var gaugeArc = document.querySelector('.gauge .arc');

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      el.classList.add('in');

      /* 进度条：读到 --w 变量后填充 */
      el.querySelectorAll('.skill-bar-fill, .attr-fill').forEach(function (bar) {
        var w = bar.dataset.w || bar.style.getPropertyValue('--w');
        if (w) bar.style.width = w;
      });
      if (gaugeArc && el.contains(gaugeArc)) {
        gaugeArc.style.strokeDashoffset = gaugeArc.dataset.off || '56.5';
      }
      io.unobserve(el);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach(function (el) { io.observe(el); });

  /* 无需 reveal 容器时，直接由自身触发 */
  if (barEls.length) {
    barEls.forEach(function (bar) {
      if (bar.closest('.reveal')) return;
      var w = bar.dataset.w || bar.style.getPropertyValue('--w');
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (w) bar.style.width = w;
            observer.unobserve(bar);
          }
        });
      }, { threshold: 0.4 });
      observer.observe(bar);
    });
  }
  if (gaugeArc) {
    var gObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          gaugeArc.style.strokeDashoffset = gaugeArc.dataset.off || '56.5';
          gObs.disconnect();
        }
      });
    }, { threshold: 0.4 });
    gObs.observe(gaugeArc);
  }

  /* ---------- Hero 词语轮换 ---------- */
  var rotateEl = document.querySelector('.hero-rotate');
  if (rotateEl) {
    var phrases = [];
    var items = rotateEl.querySelectorAll('[data-phrase]');
    items.forEach(function (it) { phrases.push(it.textContent); });
    if (phrases.length > 1) {
      items.forEach(function (it, i) {
        if (i > 0) { it.style.display = 'none'; }
      });
      var idx = 0;
      setInterval(function () {
        items[idx].style.display = 'none';
        idx = (idx + 1) % phrases.length;
        items[idx].style.display = '';
      }, prefersReduced ? 8000 : 2800);
    }
  }

  /* ---------- 页脚年份 ---------- */
  var yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- 网站运行天数 ---------- */
  var launchDate = new Date('2026-08-29'); /* ✏️ 网站正式上线日期 */
  var daysEl = document.getElementById('site-days');
  if (daysEl && !isNaN(launchDate.getTime())) {
    daysEl.textContent = Math.max(1, Math.floor((Date.now() - launchDate.getTime()) / 86400000));
  }

  /* ---------- 本地预览不显示访问统计（localhost 共享计数，数据不准） ---------- */
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    document.querySelectorAll('.bz-wrap').forEach(function (el) { el.remove(); });
  }

  /* ---------- 顶部阅读进度条 ---------- */
  var prog = document.createElement('div');
  prog.className = 'scroll-progress';
  prog.setAttribute('aria-hidden', 'true');
  document.body.appendChild(prog);
  var onScrollProg = function () {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    prog.style.width = (max > 0 ? (doc.scrollTop / max) * 100 : 0) + '%';
  };
  window.addEventListener('scroll', onScrollProg, { passive: true });
  onScrollProg();

  /* ---------- 键盘快捷键（/ 聚焦搜索，T 切换主题） ---------- */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '/') {
      e.preventDefault();
      var sb = document.getElementById('blog-search');
      if (sb) sb.focus();
    } else if (e.key === 't' || e.key === 'T') {
      var tb = document.getElementById('theme-toggle');
      if (tb) tb.click();
    }
  });
  /* ---------- Hero 打字机 ---------- */
  var typingEl = document.getElementById('hero-typing');
  if (typingEl) {
    var fullText = typingEl.getAttribute('data-text') || typingEl.textContent;
    if (!prefersReduced) {
      typingEl.textContent = '';
      var ti = 0;
      var typeNext = function () {
        if (ti <= fullText.length) {
          typingEl.textContent = fullText.slice(0, ti);
          ti++;
          setTimeout(typeNext, 65 + Math.random() * 70);
        }
      };
      setTimeout(typeNext, 350);
    }
  }

  /* ---------- 卡片鼠标光晕 ---------- */
  if (!prefersReduced) {
    document.querySelectorAll('.project-card, .skill-card, .friend-card, .tl-card, .steam-card').forEach(function (el) {
      el.classList.add('spotlight');
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });
  }

  /* ---------- 网易云播放器切换 ---------- */
  var musicFrame = document.getElementById('music-frame');
  var musicTabs = document.querySelectorAll('.music-tab');
  if (musicFrame && musicTabs.length) {
    musicTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        musicTabs.forEach(function (t) { t.classList.remove('is-active'); });
        tab.classList.add('is-active');
        musicFrame.src = 'https://music.163.com/outchain/player?type=2&id=' + tab.dataset.song + '&auto=0&height=66';
      });
    });
  }

  /* ---------- 彩蛋：↑↑↓↓←→←→BA ---------- */
  var KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  var konamiPos = 0;
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === KONAMI[konamiPos]) {
      konamiPos++;
      if (konamiPos === KONAMI.length) {
        konamiPos = 0;
        var toast = document.createElement('div');
        toast.className = 'egg-toast';
        toast.textContent = '✨ 彩蛋解锁：四叶草的天使';
        document.body.appendChild(toast);
        requestAnimationFrame(function () { toast.classList.add('show'); });
        document.querySelectorAll('.oshi-avatar, .avatar-y, .brand-mark').forEach(function (el, i) {
          setTimeout(function () {
            el.classList.add('spin-once');
            setTimeout(function () { el.classList.remove('spin-once'); }, 1200);
          }, i * 90);
        });
        setTimeout(function () { toast.classList.remove('show'); }, 2600);
        setTimeout(function () { toast.remove(); }, 3300);
      }
    } else {
      konamiPos = (key === KONAMI[0]) ? 1 : 0;
    }
  });

  /* ---------- 项目：GitHub Overview 风格仓库小卡片 ---------- */
  var repoGrid = document.getElementById('repo-grid');
  if (repoGrid) {
    var GH_USER = 'yhanw';
    var REPO_API = 'https://api.github.com/users/' + GH_USER + '/repos?per_page=100&sort=pushed';
    var LANG_COLOR = {
      JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', C: '#555555',
      'C++': '#f34b7d', 'C#': '#178600', HTML: '#e34c26', CSS: '#563d7c', SCSS: '#c6538c',
      Vue: '#41b883', Astro: '#ff5a03', Svelte: '#ff3e00', Shell: '#89e051', Batchfile: '#C1F12E',
      Java: '#b07219', Kotlin: '#A97BFF', Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516',
      PHP: '#4F5D95', Lua: '#000080', MDX: '#fcb32c', Jupyter: '#DA5B0B', 'Jupyter Notebook': '#DA5B0B',
      PowerShell: '#012456', Dockerfile: '#384d54', Makefile: '#427819'
    };
    var ICON_REPO = '<svg class="repo-ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"/></svg>';
    var ICON_STAR = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>';
    var ICON_FORK = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 11.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"/></svg>';

    function esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
      });
    }
    function relTime(iso) {
      var t = new Date(iso).getTime();
      if (!t) return '';
      var days = Math.floor((Date.now() - t) / 86400000);
      if (days <= 0) return '今天更新';
      if (days === 1) return '昨天更新';
      if (days < 30) return days + ' 天前更新';
      if (days < 365) return Math.floor(days / 30) + ' 个月前更新';
      return Math.floor(days / 365) + ' 年前更新';
    }
    function cardHTML(r) {
      var lang = r.language
        ? '<span class="repo-lang"><i class="lang-dot" style="background:' +
          (LANG_COLOR[r.language] || '#8b949e') + '"></i>' + esc(r.language) + '</span>'
        : '';
      var stars = r.stargazers_count ? '<span class="repo-stat">' + ICON_STAR + esc(r.stargazers_count) + '</span>' : '';
      var forks = r.forks_count ? '<span class="repo-stat">' + ICON_FORK + esc(r.forks_count) + '</span>' : '';
      var when = r.pushed_at ? '<span class="repo-stat">' + relTime(r.pushed_at) + '</span>' : '';
      return '<a class="repo-card" href="' + esc(r.html_url) + '" target="_blank" rel="noopener">' +
        '<div class="repo-top">' + ICON_REPO +
        '<span class="repo-name">' + esc(r.name) + '</span>' +
        '<span class="repo-badge">' + (r.fork ? 'Fork' : 'Public') + '</span></div>' +
        '<p class="repo-desc">' + esc(r.description || '暂无描述') + '</p>' +
        '<div class="repo-meta">' + lang + stars + forks + when + '</div></a>';
    }
    function fallbackCard() {
      repoGrid.innerHTML = '<a class="repo-card" href="https://github.com/' + GH_USER +
        '?tab=repositories" target="_blank" rel="noopener">' +
        '<div class="repo-top">' + ICON_REPO +
        '<span class="repo-name">' + GH_USER + '</span>' +
        '<span class="repo-badge">GitHub</span></div>' +
        '<p class="repo-desc">前往 GitHub 查看全部仓库与提交记录。</p>' +
        '<div class="repo-meta"><span class="repo-stat">github.com/' + GH_USER + '</span></div></a>';
    }
    function render(list) {
      var repos = list
        .filter(function (r) { return !r.archived; })
        .sort(function (a, b) {
          if (!!a.fork !== !!b.fork) return a.fork ? 1 : -1;
          return new Date(b.pushed_at) - new Date(a.pushed_at);
        })
        .slice(0, 6);
      if (!repos.length) { fallbackCard(); return; }
      repoGrid.innerHTML = repos.map(cardHTML).join('');
    }
    var cached = null;
    try {
      var raw = sessionStorage.getItem('gh-repos');
      if (raw) {
        var box = JSON.parse(raw);
        if (box && box.at && Date.now() - box.at < 600000 && box.list) cached = box.list;
      }
    } catch (e) { /* 忽略 */ }
    if (cached) {
      render(cached);
    } else {
      fetch(REPO_API, { headers: { Accept: 'application/vnd.github+json' } })
        .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then(function (list) {
          if (!Array.isArray(list)) throw new Error('bad payload');
          try { sessionStorage.setItem('gh-repos', JSON.stringify({ at: Date.now(), list: list })); } catch (e) { /* 忽略 */ }
          render(list);
        })
        .catch(function () { fallbackCard(); });
    }
  }
})();
