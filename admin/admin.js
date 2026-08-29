/* ============================================================
   yhw · 个人主页 — 管理后台（GitHub Contents API）
   ============================================================ */
(function () {
  'use strict';

  var API = 'https://api.github.com';
  var KEY_REPO = 'moe_admin_repo';
  var KEY_TOKEN = 'moe_admin_token';

  var repo = localStorage.getItem(KEY_REPO) || 'yhanw/yhanw.github.io';
  var token = localStorage.getItem(KEY_TOKEN) || '';

  var DATA_PATH = 'blog/data/posts.json';
  var POSTS_DIR = 'blog/posts/';

  var posts = [];            /* 当前索引中的文章 */
  var shaMap = {};           /* path -> sha（GitHub 文件版本号） */
  var editingId = null;      /* 正在编辑的文章 id */

  /* ---------- DOM ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var viewLogin = $('view-login'), viewMain = $('view-main'), viewEditor = $('view-editor');

  /* ---------- 工具 ---------- */
  function toB64(str) { return btoa(unescape(encodeURIComponent(str))); }
  function fromB64(b64) { return decodeURIComponent(escape(atob(b64))); }
  function toast(msg, isErr) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.toggle('err', !!isErr);
    t.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  function showError(box, msg) {
    if (!msg) { box.classList.remove('show'); box.textContent = ''; return; }
    box.textContent = msg;
    box.classList.add('show');
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ---------- GitHub API ---------- */
  function api(path, method, body) {
    return fetch(API + path, {
      method: method || 'GET',
      headers: {
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github+json'
      },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      if (r.status === 404) return null;
      return r.json().then(function (j) {
        if (!r.ok) {
          var msg = j.message || ('HTTP ' + r.status);
          if (j.errors && j.errors[0] && j.errors[0].message) msg += '（' + j.errors[0].message + '）';
          throw new Error(msg);
        }
        return j;
      });
    });
  }

  function getFile(path) {
    return api('/repos/' + repo + '/contents/' + path).then(function (j) {
      if (!j) return null;
      shaMap[path] = j.sha;
      return { content: fromB64(j.content), sha: j.sha };
    });
  }

  function putFile(path, content, message) {
    var body = { message: message, content: toB64(content) };
    if (shaMap[path]) body.sha = shaMap[path];
    return api('/repos/' + repo + '/contents/' + path, 'PUT', body).then(function (j) {
      if (j && j.content) shaMap[path] = j.content.sha;
      return j;
    }, function (err) {
      /* sha 过期：重新读取后重试一次 */
      if (/sha|422|conflict/i.test(err.message)) {
        return api('/repos/' + repo + '/contents/' + path).then(function (j) {
          if (!j) throw err;
          shaMap[path] = j.sha;
          body.sha = j.sha;
          return api('/repos/' + repo + '/contents/' + path, 'PUT', body).then(function (j2) {
            if (j2 && j2.content) shaMap[path] = j2.content.sha;
            return j2;
          });
        });
      }
      throw err;
    });
  }

  function delFile(path, message) {
    if (!shaMap[path]) return Promise.resolve(null);
    return api('/repos/' + repo + '/contents/' + path, 'DELETE', {
      message: message,
      sha: shaMap[path]
    }).then(function (j) { delete shaMap[path]; return j; });
  }

  /* ---------- 加载数据 ---------- */
  function loadAll() {
    showError($('main-error'), '');
    return getFile(DATA_PATH).then(function (f) {
      if (!f) { posts = []; return; }
      try { posts = JSON.parse(f.content).posts || []; }
      catch (e) { posts = []; }
    }).then(function () {
      /* 读取每篇文章 md 的 sha */
      return Promise.all(posts.map(function (p) {
        return getFile(POSTS_DIR + p.id + '.md').catch(function () { return null; });
      }));
    });
  }

  function renderList() {
    var box = $('post-list');
    $('repo-label').textContent = repo + ' · 共 ' + posts.length + ' 篇';
    if (!posts.length) {
      box.innerHTML = '<div class="admin-loading">还没有文章，点击「写新文章」发布第一篇。</div>';
      return;
    }
    box.innerHTML = '';
    var sorted = posts.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    sorted.forEach(function (p) {
      var row = document.createElement('div');
      row.className = 'post-row';
      var badge = p.draft
        ? '<span class="pr-badge draft">草稿</span>'
        : '<span class="pr-badge pub">已发布</span>';
      row.innerHTML =
        '<div class="pr-title">' + esc(p.title) +
        '<small>' + esc(p.id) + ' · ' + esc(p.date) + ' · ' + esc(p.category || '随笔') + '</small></div>' +
        badge +
        '<a class="pr-btn" href="../blog/post.html?id=' + encodeURIComponent(p.id) + '" target="_blank" rel="noopener">查看</a>' +
        '<button class="pr-btn" data-act="edit" data-id="' + esc(p.id) + '">编辑</button>' +
        '<button class="pr-btn del" data-act="del" data-id="' + esc(p.id) + '">删除</button>';
      box.appendChild(row);
    });
    box.querySelectorAll('[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.id;
        if (btn.dataset.act === 'edit') openEditor(id);
        else deletePost(id);
      });
    });
  }

  /* ---------- 登录 / 退出 ---------- */
  function connect() {
    repo = ($('f-repo').value.trim() || 'yhanw/yhanw.github.io').replace(/^https?:\/\/github\.com\//, '');
    token = $('f-token').value.trim();
    if (!token) { showError($('login-error'), '请填写 GitHub 个人访问令牌（PAT）。'); return; }
    localStorage.setItem(KEY_REPO, repo);
    localStorage.setItem(KEY_TOKEN, token);
    showError($('login-error'), '');
    $('btn-connect').textContent = '连接中…';
    $('btn-connect').disabled = true;
    api('/repos/' + repo).then(function (j) {
      $('btn-connect').textContent = '🔗 连接';
      $('btn-connect').disabled = false;
      if (!j) { showError($('login-error'), '仓库不存在：' + repo + '。请检查 owner/repo 是否正确。'); return; }
      enterMain();
    }).catch(function (err) {
      $('btn-connect').textContent = '🔗 连接';
      $('btn-connect').disabled = false;
      showError($('login-error'), '连接失败：' + err.message);
    });
  }

  function enterMain() {
    viewLogin.style.display = 'none';
    viewEditor.style.display = 'none';
    viewMain.style.display = 'block';
    $('post-list').innerHTML = '<div class="admin-loading">加载中…</div>';
    loadAll().then(renderList).catch(function (err) {
      showError($('main-error'), '加载失败：' + err.message + '（请确认 Token 有本仓库 Contents 读写权限）');
    });
  }

  function logout() {
    localStorage.removeItem(KEY_TOKEN);
    token = '';
    viewMain.style.display = 'none';
    viewEditor.style.display = 'none';
    viewLogin.style.display = 'block';
    $('f-token').value = '';
  }

  /* ---------- 编辑器 ---------- */
  function openEditor(id) {
    editingId = id || null;
    showError($('edit-error'), '');
    if (!id) {
      $('editor-title').textContent = '写新文章';
      $('f-orig-id').value = '';
      $('f-id').value = '';
      $('f-title').value = '';
      $('f-category').value = '随笔';
      $('f-date').value = new Date().toISOString().slice(0, 10);
      $('f-tags').value = '';
      $('f-summary').value = '';
      $('f-body').value = '';
      $('f-draft').checked = false;
      $('preview').classList.remove('show');
      viewMain.style.display = 'none';
      viewEditor.style.display = 'block';
      return;
    }
    var p = null;
    posts.forEach(function (x) { if (x.id === id) p = x; });
    if (!p) { toast('文章不存在', true); return; }
    $('editor-title').textContent = '编辑：' + p.title;
    $('f-orig-id').value = p.id;
    $('f-id').value = p.id;
    $('f-title').value = p.title;
    $('f-category').value = p.category || '随笔';
    $('f-date').value = (p.date || '').slice(0, 10);
    $('f-tags').value = (p.tags || []).join(', ');
    $('f-summary').value = p.summary || '';
    $('f-draft').checked = !!p.draft;
    $('preview').classList.remove('show');
    viewMain.style.display = 'none';
    viewEditor.style.display = 'block';
    $('f-body').value = '加载中…';
    getFile(POSTS_DIR + p.id + '.md').then(function (f) {
      $('f-body').value = f ? f.content : '';
    }).catch(function () {
      $('f-body').value = '';
      toast('正文加载失败', true);
    });
  }

  function backToList() {
    viewEditor.style.display = 'none';
    viewMain.style.display = 'block';
    renderList();
  }

  function togglePreview() {
    var box = $('preview');
    if (box.classList.contains('show')) {
      box.classList.remove('show');
      $('btn-preview').textContent = '👁️ 预览';
      return;
    }
    box.innerHTML = window.MoeBlog.renderMarkdown($('f-body').value || '*（正文还是空的哦）*');
    box.classList.add('show');
    $('btn-preview').textContent = '✏️ 编辑';
  }

  /* ---------- 保存 / 删除 ---------- */
  function buildFeed(posts) {
    var base = 'https://yhanw.github.io';
    var items = posts.filter(function (p) { return !p.draft; })
      .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); })
      .map(function (p) {
        var d = new Date(p.date + 'T00:00:00Z');
        return '<item>' +
          '<title>' + esc(p.title) + '</title>' +
          '<link>' + base + '/blog/post.html?id=' + encodeURIComponent(p.id) + '</link>' +
          '<guid isPermaLink="false">' + esc(p.id) + '</guid>' +
          '<pubDate>' + (isNaN(d.getTime()) ? '' : d.toUTCString()) + '</pubDate>' +
          '<description>' + esc(p.summary || '') + '</description>' +
          '</item>';
      }).join('');
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<rss version="2.0"><channel>' +
      '<title>yhw 的博客</title>' +
      '<link>' + base + '/blog/index.html</link>' +
      '<description>开发、音游与日常记录。</description>' +
      '<language>zh-CN</language>' +
      items +
      '</channel></rss>';
  }

  function validate() {
    var id = $('f-id').value.trim();
    var title = $('f-title').value.trim();
    if (!id) return '请填写文章 ID（slug）。';
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) return '文章 ID 只能包含小写字母、数字和连字符。';
    if (!title) return '请填写标题。';
    return null;
  }

  function savePost() {
    var err = validate();
    showError($('edit-error'), err);
    if (err) return;

    var origId = $('f-orig-id').value;
    var id = $('f-id').value.trim();
    var title = $('f-title').value.trim();
    var meta = {
      id: id,
      title: title,
      date: $('f-date').value || new Date().toISOString().slice(0, 10),
      category: $('f-category').value.trim() || '随笔',
      tags: $('f-tags').value.split(/[,，]/).map(function (t) { return t.trim(); }).filter(Boolean),
      draft: $('f-draft').checked,
      summary: $('f-summary').value.trim()
    };
    var body = $('f-body').value;

    $('btn-save').disabled = true;
    $('btn-save').textContent = '保存中…';

    /* 若改了 id，先删除旧文件 */
    var chain = Promise.resolve();
    if (origId && origId !== id && shaMap[POSTS_DIR + origId + '.md']) {
      chain = delFile(POSTS_DIR + origId + '.md', 'blog: 重命名 ' + origId + ' → ' + id);
    }

    chain
      .then(function () {
        return putFile(POSTS_DIR + id + '.md', body, 'blog: ' + title);
      })
      .then(function () {
        var exists = false;
        posts = posts.filter(function (p) {
          if (p.id === origId) { exists = true; return false; }
          return true;
        });
        if (!exists) posts = posts.filter(function (p) { return p.id !== id; });
        posts.push(meta);
        return putFile(DATA_PATH, JSON.stringify({ posts: posts }, null, 2) + '\n', 'blog: 更新索引（' + title + '）');
      })
      .then(function () {
        return putFile('blog/feed.xml', buildFeed(posts), 'blog: 更新 RSS（' + title + '）');
      })
      .then(function () {
        toast(meta.draft ? '已保存为草稿 🌙' : '发布成功！✨');
        $('btn-save').disabled = false;
        $('btn-save').textContent = '💾 保存并发布';
        backToList();
      })
      .catch(function (e) {
        $('btn-save').disabled = false;
        $('btn-save').textContent = '💾 保存并发布';
        showError($('edit-error'), '保存失败：' + e.message);
        toast('保存失败', true);
      });
  }

  function deletePost(id) {
    if (!window.confirm('确定删除《' + (posts.find(function (p) { return p.id === id; }) || {}).title + '》吗？此操作不可撤销。')) return;
    var chain = Promise.resolve();
    if (shaMap[POSTS_DIR + id + '.md']) {
      chain = delFile(POSTS_DIR + id + '.md', 'blog: 删除 ' + id);
    }
    chain
      .then(function () {
        posts = posts.filter(function (p) { return p.id !== id; });
        return putFile(DATA_PATH, JSON.stringify({ posts: posts }, null, 2) + '\n', 'blog: 删除 ' + id);
      })
      .then(function () {
        return putFile('blog/feed.xml', buildFeed(posts), 'blog: 更新 RSS（删除 ' + id + '）');
      })
      .then(function () {
        toast('已删除 🗑️');
        renderList();
      })
      .catch(function (e) {
        showError($('main-error'), '删除失败：' + e.message);
      });
  }

  /* ---------- 事件绑定 ---------- */
  $('btn-connect').addEventListener('click', connect);
  $('btn-logout').addEventListener('click', logout);
  $('btn-new').addEventListener('click', function () { openEditor(null); });
  $('btn-back').addEventListener('click', backToList);
  $('btn-preview').addEventListener('click', togglePreview);
  $('btn-save').addEventListener('click', savePost);
  $('f-token').addEventListener('keydown', function (e) { if (e.key === 'Enter') connect(); });

  /* 启动：已有 token 则直接进入主界面 */
  if (token) {
    $('f-token').value = token;
    $('f-repo').value = repo;
    enterMain();
  } else {
    $('f-repo').value = repo;
  }
})();
