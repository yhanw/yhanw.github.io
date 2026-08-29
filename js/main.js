/* ============================================================
   yhw · 个人主页 — 交互脚本
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 明暗主题（Material You） ---------- */
  function applyTheme(t) {
    document.documentElement.classList.toggle('dark', t === 'dark');
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

  /* ---------- GitHub 项目 ---------- */
  var ghBox = document.getElementById('gh-projects');
  if (ghBox) {
    var LANG_COLORS = {
      'JavaScript': '#f1e05a', 'TypeScript': '#3178c6', 'Python': '#3572A5',
      'HTML': '#e34c26', 'CSS': '#563d7c', 'C': '#555555', 'C++': '#f34b7d',
      'Vue': '#41b883', 'Shell': '#89e051', 'Go': '#00ADD8', 'Rust': '#dea584',
      'Jupyter Notebook': '#DA5B0B'
    };
    function ghEsc(s) {
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function ghEmpty(icon, msg) {
      ghBox.innerHTML = '<div class="blog-empty" style="grid-column:1/-1"><div class="big">' + icon + '</div><p>' + msg + '</p></div>';
    }
    fetch('https://api.github.com/users/yhanw/repos?type=owner&sort=updated&per_page=6')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (repos) {
        repos = (repos || []).slice();
        if (!repos.length) { ghEmpty('📦', '仓库整理中，之后会在这里展示。'); return; }
        ghBox.innerHTML = '';
        repos.forEach(function (r) {
          var color = LANG_COLORS[r.language] || '#9E8C95';
          var card = document.createElement('article');
          card.className = 'project-card reveal in';
          card.innerHTML =
            '<div class="project-body">' +
            '<h3><a href="' + ghEsc(r.html_url) + '" target="_blank" rel="noopener">' + ghEsc(r.name) + ' ↗</a></h3>' +
            '<div class="proj-tag"><span class="lang-dot" style="background:' + color + '"></span>' + ghEsc(r.language || '未知语言') + '</div>' +
            '<p>' + ghEsc(r.description || '暂无描述') + '</p>' +
            '<div class="project-tags"><span>⭐ ' + r.stargazers_count + '</span><span>⑂ ' + r.forks_count + '</span>' + (r.fork ? '<span>Fork</span>' : '') + '</div>' +
            '</div>';
          ghBox.appendChild(card);
        });
      })
      .catch(function () {
        ghEmpty('⚠️', 'GitHub 项目加载失败，请稍后再试。');
      });
  }
})();
