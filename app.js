/**
 * V2Note - V2EX Style Knowledge Base & Blog
 * Supports:
 * 1. LocalStorage Mode (Immediate out-of-the-box preview & recording)
 * 2. GitHub Private Repository Issues API Mode (Route 2: Issues = Topics, Labels = Categories, Comments = Records)
 */

const STORAGE_KEYS = {
  CATEGORIES: 'v2note_categories',
  TOPICS: 'v2note_topics',
  GH_CONFIG: 'v2note_gh_config'
};

const DEFAULT_CATEGORIES = [
  { id: 'all', name: '全部', desc: '所有分类下的最新记录与帖子' },
  { id: '问与答', name: '问与答', desc: '遇到的问题、排查过程与最终解决方案' },
  { id: '技术笔记', name: '技术笔记', desc: '代码片段、架构思考与踩坑记录' },
  { id: '项目日志', name: '项目日志', desc: '新项目灵感、开发进度与迭代复盘' },
  { id: '日常随笔', name: '日常随笔', desc: '读书摘要、生活思考与碎片想法' }
];

const INITIAL_DEMO_TOPICS = [
  {
    id: 101,
    category: '问与答',
    title: '如何把个人博客做成 V2EX 的极简问答与盖楼记录样式？',
    author: 'me',
    createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
    body: `我想要做一个简单一点的博客，像 \`v2ex.com/?tab=qna\` 一样：\n\n1. 顶部有几大类（Tabs）可以切换\n2. 每个类别下可以随时新增帖子\n3. **最关键的是**：帖子里面可以不断追加后续记录（就像 V2EX 的附言和回复楼层一样），方便按时间线跟进同一个问题。`,
    records: [
      {
        id: 1,
        createdAt: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
        body: `**第一条记录**：确定采用路线 2（GitHub Private 仓库 Issues 驱动）。\n- 大类 Tab 对应 Issue 的 \`Label\`\n- 帖子对应一个 \`Issue\`\n- 帖子里的追加记录对应 \`Issue Comment\``
      },
      {
        id: 2,
        createdAt: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
        body: `**第二条记录**：前端原型已就绪！不仅可以直接在网页上发帖、盖楼追加记录，还可以随时点击右上角 **「GitHub 设置」** 绑定自己的 Private 仓库。`
      }
    ]
  },
  {
    id: 102,
    category: '项目日志',
    title: 'V2Note 私有知识库开发与使用记录',
    author: 'me',
    createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    body: `这里用来记录本博客系统的后续优化点。你可以点击进入本帖，在最下方输入框直接体验 **「追加记录」** 的盖楼效果。`,
    records: [
      {
        id: 1,
        createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
        body: `支持 Markdown 代码高亮与快捷键 \`Ctrl + Enter\` 快速提交记录。`
      }
    ]
  }
];

// Application State
let state = {
  categories: [],
  topics: [],
  activeCategory: 'all',
  activeTopicId: null,
  searchQuery: '',
  ghConfig: null, // { owner, repo, token }
  isLoading: false
};

// Initialize App
let initialized = false;
function init() {
  if (initialized) return;
  initialized = true;
  loadLocalData();
  bindEvents();
  renderAll();

  // If GitHub config exists, sync from GitHub Private Repo automatically
  if (isGitHubConfigured()) {
    syncFromGitHub();
  }
}

function loadLocalData() {
  try {
    const savedCats = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES));
    state.categories = (Array.isArray(savedCats) && savedCats.length > 0) ? savedCats : DEFAULT_CATEGORIES;
  } catch (e) {
    state.categories = DEFAULT_CATEGORIES;
  }

  try {
    const savedTopics = JSON.parse(localStorage.getItem(STORAGE_KEYS.TOPICS));
    state.topics = (Array.isArray(savedTopics) && savedTopics.length > 0) ? savedTopics : INITIAL_DEMO_TOPICS;
  } catch (e) {
    state.topics = INITIAL_DEMO_TOPICS;
  }

  // Auto-connect if URL has ?token=ghp_xxx
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('token');
  if (urlToken) {
    state.ghConfig = {
      owner: urlParams.get('owner') || 'lemon-Star',
      repo: urlParams.get('repo') || 'v2note',
      token: urlToken.trim()
    };
    localStorage.setItem(STORAGE_KEYS.GH_CONFIG, JSON.stringify(state.ghConfig));
    // Clean URL so token isn't exposed in address bar
    window.history.replaceState({}, document.title, window.location.pathname);
  } else {
    const savedGh = localStorage.getItem(STORAGE_KEYS.GH_CONFIG);
    state.ghConfig = savedGh ? JSON.parse(savedGh) : { owner: 'lemon-Star', repo: 'v2note', token: '' };
  }
}

function saveLocalData() {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(state.categories));
  localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(state.topics));
}

function isGitHubConfigured() {
  return !!(state.ghConfig && state.ghConfig.owner && state.ghConfig.repo && state.ghConfig.token);
}

// ==========================================
// GitHub Private Repo API Integration (Route 2)
// ==========================================
async function ghFetch(endpoint, options = {}) {
  const { owner, repo, token } = state.ghConfig;
  const url = `https://api.github.com/repos/${owner}/${repo}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `GitHub API Error (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

async function syncFromGitHub() {
  if (!isGitHubConfigured()) return;
  const statusEl = document.getElementById('sync-status');
  statusEl.textContent = '同步 GitHub 中...';

  try {
    // 1. Fetch all labels from repo as categories
    const defaultGhLabels = ['bug', 'documentation', 'duplicate', 'enhancement', 'good first issue', 'help wanted', 'invalid', 'question', 'wontfix'];
    const labels = await ghFetch('/labels?per_page=100');
    const customLabels = labels.filter(lb => !defaultGhLabels.includes(lb.name.toLowerCase()));
    if (customLabels.length > 0) {
      state.categories = [
        { id: 'all', name: '全部', desc: '所有分类下的最新记录与帖子' },
        ...customLabels.map(lb => ({
          id: lb.name,
          name: lb.name,
          desc: lb.description || `${lb.name} 分类下的所有帖子与记录`
        }))
      ];
    }

    // 2. Fetch issues (excluding pull requests)
    const issues = await ghFetch('/issues?state=open&per_page=100&sort=updated');
    const pureIssues = issues.filter(item => !item.pull_request);

    // Extract labels into categories dynamically
    const catSet = new Set(state.categories.map(c => c.id));
    pureIssues.forEach(iss => {
      iss.labels.forEach(lb => {
        if (!catSet.has(lb.name)) {
          catSet.add(lb.name);
          state.categories.push({ id: lb.name, name: lb.name, desc: lb.description || `${lb.name} 分类下的主题` });
        }
      });
    });

    // Convert GitHub Issues to Topics
    state.topics = pureIssues.map(iss => {
      const cat = iss.labels.length > 0 ? iss.labels[0].name : '未分类';
      return {
        id: iss.number,
        ghNumber: iss.number,
        ghUrl: iss.html_url,
        category: cat,
        title: iss.title,
        author: iss.user.login,
        createdAt: iss.created_at,
        updatedAt: iss.updated_at,
        body: iss.body || '',
        commentsCount: iss.comments,
        records: [] // Loaded on detail click
      };
    });

    saveLocalData();
    renderAll();
    statusEl.textContent = `已连接私有库: ${state.ghConfig.owner}/${state.ghConfig.repo}`;
    statusEl.classList.add('online');
  } catch (err) {
    statusEl.textContent = 'GitHub 同步失败';
    statusEl.classList.remove('online');
    alert(`连接 GitHub 私有仓库失败：${err.message}\n请检查仓库名是否正确、是否已创建，以及 Token 是否拥有 repo 权限。`);
  }
}

async function loadTopicRecordsFromGitHub(topic) {
  if (!isGitHubConfigured() || !topic.ghNumber) return;
  try {
    const comments = await ghFetch(`/issues/${topic.ghNumber}/comments?per_page=100`);
    topic.records = comments.map(c => ({
      id: c.id,
      createdAt: c.created_at,
      body: c.body,
      author: c.user.login
    }));
    topic.commentsCount = topic.records.length;
    renderDetailView();
  } catch (err) {
    console.error('Failed to fetch issue comments:', err);
  }
}

// ==========================================
// Rendering Functions
// ==========================================
function renderAll() {
  renderSyncStatus();
  renderSidebar();
  renderCategoryTabs();
  if (state.activeTopicId !== null) {
    renderDetailView();
  } else {
    renderTopicList();
  }
}

function renderSyncStatus() {
  const statusEl = document.getElementById('sync-status');
  const repoEl = document.getElementById('profile-repo');
  const nameEl = document.getElementById('profile-name');
  if (isGitHubConfigured()) {
    statusEl.textContent = `GitHub 私有库: ${state.ghConfig.repo}`;
    statusEl.classList.add('online');
    nameEl.textContent = state.ghConfig.owner;
    repoEl.textContent = `Private: ${state.ghConfig.owner}/${state.ghConfig.repo}`;
  } else {
    statusEl.textContent = '本地模式 (未绑 GitHub)';
    statusEl.classList.remove('online');
    nameEl.textContent = '我的私有知识库';
    repoEl.textContent = '本地存储 · 随时可绑 GitHub';
  }
}

function renderSidebar() {
  const realCategories = state.categories.filter(c => c.id !== 'all');
  const totalRecords = state.topics.reduce((acc, t) => acc + (t.records ? t.records.length : (t.commentsCount || 0)), 0);

  document.getElementById('stat-categories').textContent = realCategories.length;
  document.getElementById('stat-topics').textContent = state.topics.length;
  document.getElementById('stat-records').textContent = totalRecords;

  const nodeCloud = document.getElementById('side-node-list');
  nodeCloud.innerHTML = realCategories.map(c => `
    <a href="javascript:void(0)" class="node-tag" data-cat="${escapeHtml(c.id)}">${escapeHtml(c.name)}</a>
  `).join('');
}

function renderCategoryTabs() {
  const container = document.getElementById('category-tabs');
  const tabsHtml = state.categories.map(cat => `
    <a href="javascript:void(0)" 
       class="tab-item ${state.activeCategory === cat.id ? 'active' : ''}" 
       data-cat="${escapeHtml(cat.id)}">
      ${escapeHtml(cat.name)}
    </a>
  `).join('');

  container.innerHTML = tabsHtml + `
    <a href="javascript:void(0)" class="tab-manage-btn" data-open-cat-manager="true" title="新建、修改或删除顶部大类">
      ⚙️ 管理大类
    </a>
  `;

  const currentCat = state.categories.find(c => c.id === state.activeCategory) || state.categories[0];
  document.getElementById('current-category-desc').textContent = currentCat ? currentCat.desc : '';
}

function renderCategoryManagerModal() {
  const listEl = document.getElementById('cat-manage-list');
  const realCats = state.categories.filter(c => c.id !== 'all');
  if (realCats.length === 0) {
    listEl.innerHTML = `<div class="empty-state" style="padding: 20px;">暂无自定义大类，请在上方新建。</div>`;
    return;
  }

  listEl.innerHTML = realCats.map(cat => {
    const count = state.topics.filter(t => t.category === cat.id).length;
    return `
      <div class="cat-manage-item">
        <div class="cat-manage-info">
          <div class="cat-manage-name">${escapeHtml(cat.name)} <span style="font-weight:normal;color:#999;font-size:12px;">(${count} 篇帖子)</span></div>
          <div class="cat-manage-desc">${escapeHtml(cat.desc || '')}</div>
        </div>
        <div class="cat-manage-actions">
          <button class="btn btn-sm" data-edit-cat="${escapeHtml(cat.id)}">修改</button>
          <button class="btn btn-sm danger-text" data-del-cat="${escapeHtml(cat.id)}">删除</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderTopicList() {
  document.getElementById('view-list').classList.remove('hidden');
  document.getElementById('view-detail').classList.add('hidden');

  const listEl = document.getElementById('topic-list');
  let filtered = [...state.topics];

  if (state.activeCategory !== 'all') {
    filtered = filtered.filter(t => t.category === state.activeCategory);
  }

  if (state.searchQuery.trim() !== '') {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.body && t.body.toLowerCase().includes(q)) ||
      (t.records && t.records.some(r => r.body.toLowerCase().includes(q)))
    );
  }

  // Sort by updatedAt descending
  filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="empty-state">当前分类下还没有帖子，点击右上角「+ 新建帖子」开始第一条记录吧。</div>`;
    return;
  }

  listEl.innerHTML = filtered.map(topic => {
    const count = topic.commentsCount !== undefined ? topic.commentsCount : (topic.records ? topic.records.length : 0);
    return `
      <div class="topic-item">
        <div class="topic-item-main">
          <div class="topic-item-title-row">
            <a href="javascript:void(0)" class="topic-item-title" data-topic-id="${topic.id}">
              ${escapeHtml(topic.title)}
            </a>
          </div>
          <div class="topic-item-meta">
            <a href="javascript:void(0)" class="node-tag" data-cat="${escapeHtml(topic.category)}">${escapeHtml(topic.category)}</a>
            <span>•</span>
            <span class="meta-author">${escapeHtml(topic.author || 'me')}</span>
            <span>•</span>
            <span class="meta-text">最后更新于 ${formatTimeAgo(topic.updatedAt)}</span>
          </div>
        </div>
        <a href="javascript:void(0)" class="count-livid" data-topic-id="${topic.id}" title="${count} 条记录">
          ${count}
        </a>
      </div>
    `;
  }).join('');
}

function renderDetailView() {
  const topic = state.topics.find(t => String(t.id) === String(state.activeTopicId));
  if (!topic) {
    state.activeTopicId = null;
    renderTopicList();
    return;
  }

  document.getElementById('view-list').classList.add('hidden');
  document.getElementById('view-detail').classList.remove('hidden');

  document.getElementById('detail-category-tag').textContent = topic.category;
  document.getElementById('detail-category-tag').dataset.cat = topic.category;
  document.getElementById('detail-title').textContent = topic.title;
  document.getElementById('detail-author').textContent = topic.author || 'me';
  document.getElementById('detail-time').textContent = `发布于 ${formatTimeAgo(topic.createdAt)}`;
  
  const records = topic.records || [];
  document.getElementById('detail-records-count').textContent = `${records.length} 条后续记录`;
  document.getElementById('detail-body').innerHTML = renderMarkdown(topic.body || '*（无初始正文）*');

  const ghLink = document.getElementById('btn-open-github');
  if (topic.ghUrl) {
    ghLink.href = topic.ghUrl;
    ghLink.classList.remove('hidden');
  } else {
    ghLink.classList.add('hidden');
  }

  // Render Replies / Records
  document.getElementById('replies-header-text').textContent = `${records.length} 条记录 · 最后更新于 ${formatTimeAgo(topic.updatedAt)}`;
  const repliesListEl = document.getElementById('replies-list');
  if (records.length === 0) {
    repliesListEl.innerHTML = `<div class="empty-state" style="padding: 20px;">暂无后续追加记录，可在下方输入框随时添加第一条进展。</div>`;
  } else {
    repliesListEl.innerHTML = records.map((rec, idx) => `
      <div class="reply-item">
        <div class="reply-meta">
          <div>
            <span class="meta-author">${escapeHtml(rec.author || topic.author || 'me')}</span> · 
            <span>记录于 ${formatTimeAgo(rec.createdAt)} (${new Date(rec.createdAt).toLocaleString()})</span>
          </div>
          <span class="reply-floor">#${idx + 1}</span>
        </div>
        <div class="reply-content markdown-body">
          ${renderMarkdown(rec.body)}
        </div>
      </div>
    `).join('');
  }
}

// ==========================================
// Actions & Event Handlers
// ==========================================
function bindEvents() {
  // Brand Logo -> Back to Home list
  document.getElementById('brand-logo').addEventListener('click', () => {
    state.activeTopicId = null;
    renderAll();
  });

  document.getElementById('btn-back-list').addEventListener('click', () => {
    state.activeTopicId = null;
    renderAll();
  });

  // Category Tabs Click (Event delegation)
  document.addEventListener('click', async (e) => {
    const catEl = e.target.closest('[data-cat]');
    if (catEl) {
      state.activeCategory = catEl.dataset.cat;
      state.activeTopicId = null;
      renderAll();
      return;
    }

    const topicEl = e.target.closest('[data-topic-id]');
    if (topicEl) {
      const topicId = topicEl.dataset.topicId;
      state.activeTopicId = topicId;
      renderAll();
      const topic = state.topics.find(t => String(t.id) === String(topicId));
      if (topic && isGitHubConfigured()) {
        loadTopicRecordsFromGitHub(topic);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const closeModalEl = e.target.closest('[data-close]');
    if (closeModalEl) {
      document.getElementById(closeModalEl.dataset.close).classList.add('hidden');
      return;
    }

    // One-Click Copy Code Block
    const copyBtn = e.target.closest('[data-copy-code]');
    if (copyBtn) {
      const code = decodeURIComponent(copyBtn.dataset.copyCode);
      try {
        await navigator.clipboard.writeText(code);
        const origText = copyBtn.textContent;
        copyBtn.textContent = '✓ 已复制!';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = origText;
          copyBtn.classList.remove('copied');
        }, 1800);
      } catch (err) {
        alert('复制失败，请手动选中复制');
      }
      return;
    }

    // Toolbar: Insert ``` Code Fence
    const insertCodeBtn = e.target.closest('[data-insert-code]');
    if (insertCodeBtn) {
      const targetId = insertCodeBtn.dataset.insertCode;
      const textarea = document.getElementById(targetId);
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = textarea.value.substring(start, end) || '在这里粘贴你的命令或代码';
      const replacement = `\n\`\`\`bash\n${selected}\n\`\`\`\n`;
      textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
      textarea.focus();
      return;
    }

    // Open Category Manager Modal
    const openCatMgrEl = e.target.closest('[data-open-cat-manager]');
    if (openCatMgrEl) {
      renderCategoryManagerModal();
      document.getElementById('modal-categories').classList.remove('hidden');
      return;
    }

    // Edit / Rename Category
    const editCatEl = e.target.closest('[data-edit-cat]');
    if (editCatEl) {
      const oldName = editCatEl.dataset.editCat;
      const catObj = state.categories.find(c => c.id === oldName);
      if (!catObj) return;

      const newNameInput = prompt(`修改大类「${oldName}」的名称：`, catObj.name);
      if (newNameInput === null) return;
      const newName = newNameInput.trim();
      if (!newName) return;

      const newDescInput = prompt(`修改大类「${newName}」的描述：`, catObj.desc || '');
      const newDesc = newDescInput !== null ? newDescInput.trim() : catObj.desc;

      if (newName !== oldName && state.categories.some(c => c.id === newName)) {
        alert('该大类名称已存在！');
        return;
      }

      if (isGitHubConfigured()) {
        try {
          await ghFetch(`/labels/${encodeURIComponent(oldName)}`, {
            method: 'PATCH',
            body: JSON.stringify({
              new_name: newName,
              description: newDesc
            })
          });
        } catch (err) {
          alert(`GitHub 同步修改分类失败: ${err.message}`);
          return;
        }
      }

      catObj.id = newName;
      catObj.name = newName;
      catObj.desc = newDesc;
      state.topics.forEach(t => {
        if (t.category === oldName) t.category = newName;
      });
      if (state.activeCategory === oldName) state.activeCategory = newName;

      saveLocalData();
      renderCategoryManagerModal();
      renderAll();
      return;
    }

    // Delete Category
    const delCatEl = e.target.closest('[data-del-cat]');
    if (delCatEl) {
      const catName = delCatEl.dataset.delCat;
      const count = state.topics.filter(t => t.category === catName).length;
      if (!confirm(`确定要删除大类「${catName}」吗？（该分类下现有 ${count} 篇帖子，删除大类不会删除帖子本身）`)) {
        return;
      }

      if (isGitHubConfigured()) {
        try {
          await ghFetch(`/labels/${encodeURIComponent(catName)}`, {
            method: 'DELETE'
          });
        } catch (err) {
          console.warn('GitHub label delete warning:', err.message);
        }
      }

      state.categories = state.categories.filter(c => c.id !== catName);
      if (state.activeCategory === catName) state.activeCategory = 'all';
      saveLocalData();
      renderCategoryManagerModal();
      renderAll();
      return;
    }
  });

  // Search box
  document.getElementById('search-input').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    if (state.activeTopicId !== null) {
      state.activeTopicId = null;
    }
    renderTopicList();
  });

  // Refresh button
  document.getElementById('btn-refresh').addEventListener('click', () => {
    if (isGitHubConfigured()) {
      syncFromGitHub();
    } else {
      renderAll();
    }
  });

  // Open Category Manager Modal from Sidebar button
  document.getElementById('btn-manage-categories').addEventListener('click', () => {
    renderCategoryManagerModal();
    document.getElementById('modal-categories').classList.remove('hidden');
  });

  // Create New Category inside Category Manager Modal
  document.getElementById('btn-create-cat').addEventListener('click', async () => {
    const nameInput = document.getElementById('new-cat-name');
    const descInput = document.getElementById('new-cat-desc');
    const clean = nameInput.value.trim();
    const desc = descInput.value.trim() || `${clean} 分类下的所有帖子与记录`;

    if (!clean) {
      alert('请输入新大类的名称');
      return;
    }
    if (state.categories.some(c => c.id === clean)) {
      alert('该分类已存在！');
      return;
    }

    const btn = document.getElementById('btn-create-cat');
    btn.disabled = true;
    btn.textContent = '创建中...';

    try {
      if (isGitHubConfigured()) {
        await ghFetch('/labels', {
          method: 'POST',
          body: JSON.stringify({
            name: clean,
            color: '333344',
            description: desc
          })
        });
      }

      state.categories.push({
        id: clean,
        name: clean,
        desc
      });
      nameInput.value = '';
      descInput.value = '';
      saveLocalData();
      renderCategoryManagerModal();
      renderAll();
    } catch (err) {
      alert(`创建分类失败: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = '+ 新建大类';
    }
  });

  // Open New Topic Modal
  const openNewTopicModal = () => {
    const select = document.getElementById('new-topic-category');
    const realCats = state.categories.filter(c => c.id !== 'all');
    select.innerHTML = realCats.map(c => `<option value="${escapeHtml(c.id)}" ${state.activeCategory === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
    document.getElementById('new-topic-title').value = '';
    document.getElementById('new-topic-body').value = '';
    document.getElementById('modal-new-topic').classList.remove('hidden');
    document.getElementById('new-topic-title').focus();
  };

  document.getElementById('btn-new-topic').addEventListener('click', openNewTopicModal);
  document.getElementById('btn-side-new').addEventListener('click', openNewTopicModal);

  // Confirm Create Topic
  document.getElementById('btn-create-topic-confirm').addEventListener('click', async () => {
    const category = document.getElementById('new-topic-category').value;
    const title = document.getElementById('new-topic-title').value.trim();
    const body = document.getElementById('new-topic-body').value.trim();

    if (!title) {
      alert('请输入帖子标题');
      return;
    }

    const btn = document.getElementById('btn-create-topic-confirm');
    btn.disabled = true;
    btn.textContent = '发布中...';

    try {
      if (isGitHubConfigured()) {
        const created = await ghFetch('/issues', {
          method: 'POST',
          body: JSON.stringify({
            title,
            body,
            labels: [category]
          })
        });
        const newTopic = {
          id: created.number,
          ghNumber: created.number,
          ghUrl: created.html_url,
          category,
          title: created.title,
          author: created.user.login,
          createdAt: created.created_at,
          updatedAt: created.updated_at,
          body: created.body || '',
          commentsCount: 0,
          records: []
        };
        state.topics.unshift(newTopic);
        state.activeTopicId = newTopic.id;
      } else {
        const now = new Date().toISOString();
        const newTopic = {
          id: Date.now(),
          category,
          title,
          author: 'me',
          createdAt: now,
          updatedAt: now,
          body,
          records: []
        };
        state.topics.unshift(newTopic);
        state.activeTopicId = newTopic.id;
      }

      saveLocalData();
      document.getElementById('modal-new-topic').classList.add('hidden');
      renderAll();
    } catch (err) {
      alert(`发布失败: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = '发布帖子';
    }
  });

  // Submit New Record (Reply/Subtle)
  const submitReply = async () => {
    const input = document.getElementById('reply-input');
    const body = input.value.trim();
    if (!body) return;

    const topic = state.topics.find(t => String(t.id) === String(state.activeTopicId));
    if (!topic) return;

    const btn = document.getElementById('btn-submit-reply');
    btn.disabled = true;
    btn.textContent = '保存中...';

    try {
      if (isGitHubConfigured() && topic.ghNumber) {
        const comment = await ghFetch(`/issues/${topic.ghNumber}/comments`, {
          method: 'POST',
          body: JSON.stringify({ body })
        });
        topic.records = topic.records || [];
        topic.records.push({
          id: comment.id,
          createdAt: comment.created_at,
          body: comment.body,
          author: comment.user.login
        });
        topic.commentsCount = topic.records.length;
        topic.updatedAt = comment.created_at;
      } else {
        const now = new Date().toISOString();
        topic.records = topic.records || [];
        topic.records.push({
          id: Date.now(),
          createdAt: now,
          body
        });
        topic.updatedAt = now;
      }

      input.value = '';
      saveLocalData();
      renderAll();
    } catch (err) {
      alert(`追加记录失败: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = '追加记录';
    }
  };

  document.getElementById('btn-submit-reply').addEventListener('click', submitReply);
  document.getElementById('reply-input').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      submitReply();
    }
  });

  // Delete / Close Topic
  document.getElementById('btn-delete-topic').addEventListener('click', async () => {
    const topic = state.topics.find(t => String(t.id) === String(state.activeTopicId));
    if (!topic) return;
    if (!confirm(`确定要删除帖子「${topic.title}」吗？`)) return;

    try {
      if (isGitHubConfigured() && topic.ghNumber) {
        await ghFetch(`/issues/${topic.ghNumber}`, {
          method: 'PATCH',
          body: JSON.stringify({ state: 'closed' })
        });
      }
      state.topics = state.topics.filter(t => String(t.id) !== String(topic.id));
      state.activeTopicId = null;
      saveLocalData();
      renderAll();
    } catch (err) {
      alert(`删除失败: ${err.message}`);
    }
  });

  // GitHub Settings Modal
  document.getElementById('btn-settings').addEventListener('click', () => {
    document.getElementById('cfg-owner').value = state.ghConfig?.owner || '';
    document.getElementById('cfg-repo').value = state.ghConfig?.repo || '';
    document.getElementById('cfg-token').value = state.ghConfig?.token || '';
    document.getElementById('modal-settings').classList.remove('hidden');
  });

  document.getElementById('btn-save-settings').addEventListener('click', async () => {
    const owner = document.getElementById('cfg-owner').value.trim();
    const repo = document.getElementById('cfg-repo').value.trim();
    const token = document.getElementById('cfg-token').value.trim();

    if (!owner || !repo || !token) {
      alert('请完整填写 GitHub 用户名、私有仓库名和 Personal Access Token');
      return;
    }

    state.ghConfig = { owner, repo, token };
    localStorage.setItem(STORAGE_KEYS.GH_CONFIG, JSON.stringify(state.ghConfig));
    document.getElementById('modal-settings').classList.add('hidden');
    state.activeTopicId = null;
    await syncFromGitHub();
  });

  document.getElementById('btn-clear-settings').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEYS.GH_CONFIG);
    state.ghConfig = null;
    loadLocalData();
    document.getElementById('modal-settings').classList.add('hidden');
    renderAll();
  });
}

// ==========================================
// Lightweight Built-in Markdown Renderer (With One-Click Copy & Auto-Command Detection)
// ==========================================
function makeCodeBlockHtml(rawCode, lang = 'bash') {
  const cleanCode = rawCode.trim();
  const encoded = encodeURIComponent(cleanCode);
  return `<div class="code-block-wrapper"><div class="code-block-header"><span>${escapeHtml(lang || 'shell')}</span><button type="button" class="btn-copy-code" data-copy-code="${encoded}">📋 复制代码</button></div><pre><code>${escapeHtml(cleanCode)}</code></pre></div>`;
}

function autoWrapUnfencedCommands(text) {
  // Automatically detect contiguous shell command blocks even if user forgot ``` fences
  const lines = text.split('\n');
  const result = [];
  let cmdBuffer = [];

  const isCommandLine = (line) => {
    const t = line.trim();
    if (!t) return false;
    return (
      /^(\.\/|\/|cd\s|export\s|mkdir\s|scp\s|ssh\s|curl\s|wget\s|git\s|docker\s|python|pip\s|npm\s|node\s|sudo\s|cat\s|ls\s|rm\s|cp\s|mv\s|chmod\s|chown\s|systemctl\s|journalctl\s|nvidia-smi|--[a-zA-Z0-9_-]+)/.test(t) ||
      /^[a-zA-Z0-9_]+\s*=\s*\S+/.test(t) ||
      /^#\s+/.test(t) ||
      t.endsWith('\\')
    );
  };

  let insideFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      if (cmdBuffer.length > 0) {
        result.push('```bash\n' + cmdBuffer.join('\n') + '\n```');
        cmdBuffer = [];
      }
      insideFence = !insideFence;
      result.push(line);
      continue;
    }

    if (insideFence) {
      result.push(line);
      continue;
    }

    if (isCommandLine(line)) {
      cmdBuffer.push(line);
    } else if (line.trim() === '' && cmdBuffer.length > 0) {
      // Flush each command paragraph as its own copyable block!
      result.push('```bash\n' + cmdBuffer.join('\n') + '\n```');
      cmdBuffer = [];
      result.push(line);
    } else {
      if (cmdBuffer.length > 0) {
        result.push('```bash\n' + cmdBuffer.join('\n') + '\n```');
        cmdBuffer = [];
      }
      result.push(line);
    }
  }

  if (cmdBuffer.length > 0) {
    result.push('```bash\n' + cmdBuffer.join('\n') + '\n```');
  }

  return result.join('\n');
}

function renderMarkdown(text) {
  if (!text) return '';

  // 1. Pre-process: auto-wrap shell commands if user pasted without ```
  const preprocessed = autoWrapUnfencedCommands(text);

  // 2. Extract fenced code blocks ```lang ... ``` into placeholders first
  const codeBlocks = [];
  let processed = preprocessed.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(makeCodeBlockHtml(code, lang || 'bash'));
    return `@@CODE_BLOCK_${idx}@@`;
  });

  // 3. Escape remaining HTML
  let html = escapeHtml(processed);

  // 4. Inline code `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Headings
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Blockquote
  html = html.replace(/^&gt; (.*$)/gm, '<blockquote>$1</blockquote>');
  // Markdown Links [text](url) & Auto bare URLs
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/(^|[^"'>])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  // Line breaks
  html = html.replace(/\n/g, '<br>');

  // 5. Restore code blocks
  html = html.replace(/@@CODE_BLOCK_(\d+)@@/g, (_, idx) => codeBlocks[Number(idx)]);

  return html;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTimeAgo(isoString) {
  if (!isoString) return '刚刚';
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`;
  return new Date(isoString).toLocaleDateString();
}

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') {
  init();
}
