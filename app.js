const storageKey = "zfl18-boardgame-rule-cards";
const tonightMaxGames = 3;
const tonightMaxDuration = 240;
const today = new Date();

const defaultState = {
  selectedId: "",
  tonightIds: [],
  games: [
    {
      id: crypto.randomUUID(),
      name: "奥尔良",
      minPlayers: 2,
      maxPlayers: 4,
      duration: 90,
      complexity: "中",
      lastPlayed: "2025-11-20",
      cover: "",
      forgets: ["商站建造前先确认道路或水路连接", "袋中随从抽完后不是重洗弃堆，而是从已回袋内容继续抽"],
      disputes: ["事件顺序和玩家动作结算先后", "科技板是否能替代所有同类随从"],
      setup: ["按人数放置货物板块", "每位玩家拿起始随从、商人和个人板"],
      scoring: ["货物分数", "商站和市民乘区块", "金币和建筑剩余加分"]
    },
    {
      id: crypto.randomUUID(),
      name: "盖亚计划",
      minPlayers: 1,
      maxPlayers: 4,
      duration: 150,
      complexity: "重",
      lastPlayed: "2025-08-02",
      cover: "",
      forgets: ["联邦连接时卫星数量和能量消耗要一起核对", "研究升到顶必须拿对应科技板限制"],
      disputes: ["被动充能是否能拒绝", "星球改造费用受哪些能力影响"],
      setup: ["随机终局计分板和回合得分板", "按种族设置起始资源和母星"],
      scoring: ["终局计分板", "科技轨排名", "联邦和建筑分"]
    },
    {
      id: crypto.randomUUID(),
      name: "花砖物语",
      minPlayers: 2,
      maxPlayers: 4,
      duration: 45,
      complexity: "轻",
      lastPlayed: "2026-03-15",
      cover: "",
      forgets: ["每轮结束先铺墙再补工厂展示区", "地板线扣分后清空对应砖"],
      disputes: ["同色砖放置限制是否看整面墙", "中央区起始玩家标记是否必须拿"],
      setup: ["按人数放工厂圆盘", "每个圆盘补4块砖"],
      scoring: ["横竖相邻即时分", "完整行列和颜色终局加分"]
    }
  ]
};

let state = loadState();
state.tonightIds = sanitizeTonightIds(state.tonightIds);
if (!state.selectedId) state.selectedId = state.games[0]?.id || "";

// 操作位置的一次性提示，仅存在于内存，不写入本地存档
const notice = { list: "", detail: "", tonight: "" };

const els = {
  searchInput: document.querySelector("#searchInput"),
  playerFilter: document.querySelector("#playerFilter"),
  complexityFilter: document.querySelector("#complexityFilter"),
  sortMode: document.querySelector("#sortMode"),
  gameForm: document.querySelector("#gameForm"),
  nameInput: document.querySelector("#nameInput"),
  minPlayersInput: document.querySelector("#minPlayersInput"),
  maxPlayersInput: document.querySelector("#maxPlayersInput"),
  durationInput: document.querySelector("#durationInput"),
  complexityInput: document.querySelector("#complexityInput"),
  lastPlayedInput: document.querySelector("#lastPlayedInput"),
  coverInput: document.querySelector("#coverInput"),
  gameList: document.querySelector("#gameList"),
  detailView: document.querySelector("#detailView"),
  gameCount: document.querySelector("#gameCount"),
  ruleCount: document.querySelector("#ruleCount"),
  staleGame: document.querySelector("#staleGame"),
  visibleCount: document.querySelector("#visibleCount"),
  tonightList: document.querySelector("#tonightList"),
  tonightStats: document.querySelector("#tonightStats"),
  listNotice: document.querySelector("#listNotice"),
  tonightNotice: document.querySelector("#tonightNotice")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);
  try {
    return { ...structuredClone(defaultState), ...JSON.parse(saved) };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

// 清掉已删除或本地存档里失效/重复的编号，顺序紧凑保留
function sanitizeTonightIds(ids) {
  if (!Array.isArray(ids)) return [];
  const validIds = new Set(state.games.map((game) => game.id));
  return [...new Set(ids.filter((id) => validIds.has(id)))].slice(0, tonightMaxGames);
}

function getTonightGames() {
  return state.tonightIds.map((id) => state.games.find((game) => game.id === id)).filter(Boolean);
}

function getTonightDuration() {
  return getTonightGames().reduce((sum, game) => sum + game.duration, 0);
}

function clearNotices() {
  notice.list = "";
  notice.detail = "";
  notice.tonight = "";
}

function setNotice(element, text) {
  if (!element) return;
  element.textContent = text;
  element.hidden = !text;
}

// 收进清单：会超数量或时长上限时原样保留清单，仅在操作位置给出原因，不自动挤掉已选
function addToTonight(id, location) {
  const game = state.games.find((item) => item.id === id);
  if (!game) return;
  clearNotices();
  if (state.tonightIds.includes(id)) return;
  if (state.tonightIds.length >= tonightMaxGames) {
    notice[location] = `清单已满（最多 ${tonightMaxGames} 款），不能再加入「${game.name}」。`;
    return;
  }
  const total = getTonightDuration() + game.duration;
  if (total > tonightMaxDuration) {
    notice[location] = `加入「${game.name}」后总时长 ${total} 分钟，超过 ${tonightMaxDuration} 分钟上限，清单保持不变。`;
    return;
  }
  state.tonightIds.push(id);
  saveState();
}

function removeFromTonight(id) {
  state.tonightIds = state.tonightIds.filter((item) => item !== id);
  clearNotices();
  saveState();
}

// 收藏列表和详情共用的收进/移出入口
function toggleTonight(id, location = "list") {
  if (state.tonightIds.includes(id)) {
    removeFromTonight(id);
  } else {
    addToTonight(id, location);
  }
}

function moveTonight(id, offset) {
  const index = state.tonightIds.indexOf(id);
  const target = index + offset;
  if (index === -1 || target < 0 || target >= state.tonightIds.length) return;
  [state.tonightIds[index], state.tonightIds[target]] = [state.tonightIds[target], state.tonightIds[index]];
  clearNotices();
  saveState();
}

function daysSince(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return Math.max(0, Math.floor((today - date) / 86400000));
}

function getAllRules(game) {
  return [...game.forgets, ...game.disputes, ...game.setup, ...game.scoring];
}

function getFilteredGames() {
  const keyword = els.searchInput.value.trim();
  const player = els.playerFilter.value;
  const complexity = els.complexityFilter.value;
  const games = state.games.filter((game) => {
    const text = `${game.name}${getAllRules(game).join("")}`;
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesPlayer = player === "all" || (Number(player) >= game.minPlayers && Number(player) <= game.maxPlayers);
    const matchesComplexity = complexity === "all" || game.complexity === complexity;
    return matchesKeyword && matchesPlayer && matchesComplexity;
  });

  if (els.sortMode.value === "name") return games.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  if (els.sortMode.value === "complexity") {
    const rank = { 轻: 1, 中: 2, 重: 3 };
    return games.sort((a, b) => rank[b.complexity] - rank[a.complexity]);
  }
  return games.sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed));
}

function renderSummary() {
  const allRuleCount = state.games.reduce((sum, game) => sum + getAllRules(game).length, 0);
  const stale = [...state.games].sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed))[0];
  els.gameCount.textContent = state.games.length;
  els.ruleCount.textContent = allRuleCount;
  els.staleGame.textContent = stale ? `${daysSince(stale.lastPlayed)}天` : "-";
}

function renderList() {
  const games = getFilteredGames();
  els.visibleCount.textContent = `${games.length}个匹配`;
  els.gameList.innerHTML =
    games
      .map((game) => {
        const selected = game.id === state.selectedId ? "selected" : "";
        const inTonight = state.tonightIds.includes(game.id);
        const order = inTonight ? state.tonightIds.indexOf(game.id) + 1 : 0;
        return `
          <article class="game-card ${selected}" data-game-id="${game.id}">
            <div class="cover">
              ${
                game.cover
                  ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />`
                  : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`
              }
              <span class="stale-ribbon">${daysSince(game.lastPlayed)}天未玩</span>
            </div>
            <div class="game-body">
              <h3>${escapeHtml(game.name)}</h3>
              <div class="game-meta">
                <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
                <span class="pill">${game.duration}分钟</span>
                <span class="pill heavy">${escapeHtml(game.complexity)}</span>
              </div>
              <button
                type="button"
                class="tonight-toggle ${inTonight ? "is-in" : ""}"
                data-tonight-id="${game.id}"
                data-tonight-location="list"
                aria-pressed="${inTonight}"
              >${inTonight ? `移出今晚桌游串（第 ${order} 款）` : "收进今晚桌游串"}</button>
            </div>
          </article>
        `;
      })
      .join("") || `<p class="empty">没有符合筛选的桌游。</p>`;
  setNotice(els.listNotice, notice.list);
}

function renderTonight() {
  const games = getTonightGames();
  const total = games.reduce((sum, game) => sum + game.duration, 0);
  els.tonightStats.textContent = `${games.length}/${tonightMaxGames} 款 · ${total}/${tonightMaxDuration} 分钟`;
  els.tonightList.innerHTML =
    games
      .map((game, index) => `
        <li class="tonight-item">
          <span class="tonight-order">第 ${index + 1} 款</span>
          <span class="tonight-name" data-tonight-view="${game.id}">${escapeHtml(game.name)}</span>
          <span class="pill">${game.duration}分钟</span>
          <span class="tonight-controls">
            <button type="button" data-tonight-move="${game.id}" data-move-dir="-1" ${index === 0 ? "disabled" : ""} aria-label="上移">↑</button>
            <button type="button" data-tonight-move="${game.id}" data-move-dir="1" ${index === games.length - 1 ? "disabled" : ""} aria-label="下移">↓</button>
            <button type="button" data-tonight-remove="${game.id}">移出</button>
          </span>
        </li>
      `)
      .join("") || `<li class="empty tonight-empty">还没有安排。从收藏列表或详情里收进桌游。</li>`;
  setNotice(els.tonightNotice, notice.tonight);
}

function renderDetail() {
  const game = state.games.find((item) => item.id === state.selectedId) || state.games[0];
  if (!game) {
    els.detailView.innerHTML = `<p class="empty">先添加一个桌游。</p>`;
    return;
  }
  state.selectedId = game.id;
  const inTonight = state.tonightIds.includes(game.id);
  const tonightOrder = inTonight ? state.tonightIds.indexOf(game.id) + 1 : 0;
  els.detailView.innerHTML = `
    <div class="quick-card">
      <div class="detail-cover">
        ${game.cover ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />` : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`}
      </div>
      <div>
        <h2>${escapeHtml(game.name)}</h2>
        <div class="game-meta">
          <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
          <span class="pill">${game.duration}分钟</span>
          <span class="pill heavy">${escapeHtml(game.complexity)}</span>
          <span class="pill">${daysSince(game.lastPlayed)}天未玩</span>
        </div>
      </div>
      <div class="detail-tonight">
        <button
          type="button"
          id="detailTonightBtn"
          class="tonight-toggle ${inTonight ? "is-in" : ""}"
          data-tonight-id="${game.id}"
          data-tonight-location="detail"
          aria-pressed="${inTonight}"
        >${inTonight ? `移出今晚桌游串（当前第 ${tonightOrder} 款）` : "收进今晚桌游串"}</button>
        <p id="detailNotice" class="inline-notice" ${notice.detail ? "" : "hidden"}>${escapeHtml(notice.detail)}</p>
      </div>
      ${renderRuleSection("容易忘的规则", "forgets", game.forgets)}
      ${renderRuleSection("常见争议", "disputes", game.disputes)}
      ${renderRuleSection("开局准备", "setup", game.setup)}
      ${renderRuleSection("计分提醒", "scoring", game.scoring)}
      <form class="add-rule" id="ruleForm">
        <select id="ruleTypeInput">
          <option value="forgets">容易忘的规则</option>
          <option value="disputes">常见争议</option>
          <option value="setup">开局准备</option>
          <option value="scoring">计分提醒</option>
        </select>
        <textarea id="ruleTextInput" rows="3" placeholder="补充一条聚会前要看的提醒" required></textarea>
        <button class="primary" type="submit">加入规则卡片</button>
      </form>
      <div class="detail-actions">
        <button id="playedTodayBtn" type="button">标记今天玩过</button>
        <button id="deleteGameBtn" type="button">删除桌游</button>
      </div>
    </div>
  `;
}

function renderRuleSection(title, key, items) {
  return `
    <section class="rule-section">
      <h3>${title}</h3>
      <ul class="rule-list">
        ${
          items
            .map(
              (item, index) => `
                <li>
                  <span>${escapeHtml(item)}</span>
                  <button type="button" title="删除" data-rule-key="${key}" data-rule-index="${index}">×</button>
                </li>
              `
            )
            .join("") || `<li><span>暂无内容。</span></li>`
        }
      </ul>
    </section>
  `;
}

function renderAll() {
  saveState();
  renderSummary();
  renderList();
  renderTonight();
  renderDetail();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

async function addGame(event) {
  event.preventDefault();
  const minPlayers = Number(els.minPlayersInput.value);
  const maxPlayers = Math.max(minPlayers, Number(els.maxPlayersInput.value));
  const cover = await readFileAsDataUrl(els.coverInput.files[0]);
  const game = {
    id: crypto.randomUUID(),
    name: els.nameInput.value.trim(),
    minPlayers,
    maxPlayers,
    duration: Number(els.durationInput.value),
    complexity: els.complexityInput.value,
    lastPlayed: els.lastPlayedInput.value,
    cover,
    forgets: ["本局开始前先补充容易忘的规则。"],
    disputes: [],
    setup: ["整理组件并按人数调整初始设置。"],
    scoring: ["确认终局计分项和即时得分项。"]
  };
  state.games.unshift(game);
  state.selectedId = game.id;
  els.gameForm.reset();
  setDefaultDate();
  renderAll();
}

function setDefaultDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 2);
  els.lastPlayedInput.value = date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.searchInput.addEventListener("input", () => {
  clearNotices();
  renderAll();
});
els.playerFilter.addEventListener("change", () => {
  clearNotices();
  renderAll();
});
els.complexityFilter.addEventListener("change", () => {
  clearNotices();
  renderAll();
});
els.sortMode.addEventListener("change", () => {
  clearNotices();
  renderAll();
});
els.gameForm.addEventListener("submit", addGame);

els.gameList.addEventListener("click", (event) => {
  const tonightButton = event.target.closest("[data-tonight-id]");
  if (tonightButton) {
    toggleTonight(tonightButton.dataset.tonightId, tonightButton.dataset.tonightLocation);
    renderAll();
    return;
  }
  const card = event.target.closest("[data-game-id]");
  if (!card) return;
  state.selectedId = card.dataset.gameId;
  clearNotices();
  renderAll();
});

els.tonightList.addEventListener("click", (event) => {
  const moveButton = event.target.closest("[data-tonight-move]");
  if (moveButton && !moveButton.disabled) {
    moveTonight(moveButton.dataset.tonightMove, Number(moveButton.dataset.moveDir));
    renderAll();
    return;
  }
  const removeButton = event.target.closest("[data-tonight-remove]");
  if (removeButton) {
    removeFromTonight(removeButton.dataset.tonightRemove);
    renderAll();
    return;
  }
  const viewTarget = event.target.closest("[data-tonight-view]");
  if (viewTarget) {
    state.selectedId = viewTarget.dataset.tonightView;
    clearNotices();
    renderAll();
  }
});

els.detailView.addEventListener("submit", (event) => {
  if (event.target.id !== "ruleForm") return;
  event.preventDefault();
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  const key = document.querySelector("#ruleTypeInput").value;
  const text = document.querySelector("#ruleTextInput").value.trim();
  if (!text) return;
  game[key].push(text);
  clearNotices();
  renderAll();
});

els.detailView.addEventListener("click", (event) => {
  const ruleButton = event.target.closest("[data-rule-key]");
  const tonightButton = event.target.closest("[data-tonight-id]");
  const playedButton = event.target.closest("#playedTodayBtn");
  const deleteButton = event.target.closest("#deleteGameBtn");
  const game = state.games.find((item) => item.id === state.selectedId);

  if (tonightButton) {
    toggleTonight(tonightButton.dataset.tonightId, tonightButton.dataset.tonightLocation);
    renderAll();
    return;
  }

  if (!game) return;

  if (ruleButton) {
    const key = ruleButton.dataset.ruleKey;
    const index = Number(ruleButton.dataset.ruleIndex);
    game[key].splice(index, 1);
    clearNotices();
    renderAll();
  }

  if (playedButton) {
    game.lastPlayed = new Date().toISOString().slice(0, 10);
    clearNotices();
    renderAll();
  }

  if (deleteButton) {
    state.games = state.games.filter((item) => item.id !== game.id);
    // 收藏被移除时同步从清单清掉，顺序保持紧凑
    state.tonightIds = state.tonightIds.filter((id) => id !== game.id);
    state.selectedId = state.games[0]?.id || "";
    clearNotices();
    renderAll();
  }
});

setDefaultDate();
renderAll();
