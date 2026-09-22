const storageKey = "zfl18-boardgame-rule-cards";
const today = new Date();

const LINEUP_LIMIT = 3;
const LINEUP_MAX_DURATION = 240;

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
// 同步清理本地存档里的失效编号，并紧凑排序
state.tonightIds = sanitizeLineup(state.tonightIds);
if (!state.selectedId) state.selectedId = state.games[0]?.id || "";

// 仅存在于本次会话：在操作位置说明未能加入清单的原因
let lineupNotes = {};

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
  lineupList: document.querySelector("#lineupList"),
  lineupCount: document.querySelector("#lineupCount"),
  lineupDuration: document.querySelector("#lineupDuration"),
  lineupBar: document.querySelector("#lineupBar"),
  gameCount: document.querySelector("#gameCount"),
  ruleCount: document.querySelector("#ruleCount"),
  staleGame: document.querySelector("#staleGame"),
  visibleCount: document.querySelector("#visibleCount")
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

// 清掉收藏中已不存在的编号，并把剩余位置紧凑排列
function sanitizeLineup(ids) {
  const validIds = new Set(state.games.map((game) => game.id));
  return (Array.isArray(ids) ? ids : []).filter((id) => validIds.has(id)).slice(0, LINEUP_LIMIT);
}

function getLineupGames() {
  return state.tonightIds
    .map((id) => state.games.find((game) => game.id === id))
    .filter(Boolean);
}

function getLineupDuration(games = getLineupGames()) {
  return games.reduce((sum, game) => sum + game.duration, 0);
}

// 尝试加入清单；超上限时原清单不变，原因记在操作位置
function addToLineup(id) {
  if (state.tonightIds.includes(id)) return;
  const game = state.games.find((item) => item.id === id);
  if (!game) return;
  if (state.tonightIds.length >= LINEUP_LIMIT) {
    lineupNotes = { [id]: `清单最多 ${LINEUP_LIMIT} 款，先移出一款再加入` };
    return;
  }
  if (getLineupDuration() + game.duration > LINEUP_MAX_DURATION) {
    lineupNotes = {
      [id]: `加入后总时长 ${getLineupDuration() + game.duration} 分钟，超过 ${LINEUP_MAX_DURATION} 分钟上限`
    };
    return;
  }
  state.tonightIds.push(id);
  lineupNotes = {};
}

function removeFromLineup(id) {
  state.tonightIds = state.tonightIds.filter((item) => item !== id);
  lineupNotes = {};
}

function moveInLineup(id, direction) {
  const index = state.tonightIds.indexOf(id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= state.tonightIds.length) return;
  [state.tonightIds[index], state.tonightIds[target]] = [state.tonightIds[target], state.tonightIds[index]];
  lineupNotes = {};
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
        const lineupIndex = state.tonightIds.indexOf(game.id);
        const inLineup = lineupIndex >= 0;
        const note = lineupNotes[game.id];
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
              <div class="card-actions">
                <button
                  type="button"
                  class="chip-btn ${inLineup ? "on" : ""}"
                  data-lineup-toggle="${game.id}"
                >${inLineup ? `移出桌游串（第${lineupIndex + 1}款）` : "收进今晚桌游串"}</button>
              </div>
              ${note ? `<p class="lineup-note">${escapeHtml(note)}</p>` : ""}
            </div>
          </article>
        `;
      })
      .join("") || `<p class="empty">没有符合筛选的桌游。</p>`;
}

function renderDetail() {
  const game = state.games.find((item) => item.id === state.selectedId) || state.games[0];
  if (!game) {
    els.detailView.innerHTML = `<p class="empty">先添加一个桌游。</p>`;
    return;
  }
  state.selectedId = game.id;
  const lineupIndex = state.tonightIds.indexOf(game.id);
  const inLineup = lineupIndex >= 0;
  const note = lineupNotes[game.id];
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
        <button id="lineupToggleBtn" type="button">${inLineup ? `移出今晚桌游串（第${lineupIndex + 1}款）` : "收进今晚桌游串"}</button>
        <button id="playedTodayBtn" type="button">标记今天玩过</button>
        <button id="deleteGameBtn" type="button">删除桌游</button>
      </div>
      ${note ? `<p class="lineup-note detail-note">${escapeHtml(note)}</p>` : ""}
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

function renderLineup() {
  const games = getLineupGames();
  const total = getLineupDuration(games);
  const over = total > LINEUP_MAX_DURATION;
  els.lineupCount.textContent = `${games.length}/${LINEUP_LIMIT} 款`;
  els.lineupDuration.textContent = `${total}/${LINEUP_MAX_DURATION} 分钟`;
  els.lineupDuration.classList.toggle("over", over);
  els.lineupBar.style.width = `${Math.min(100, (total / LINEUP_MAX_DURATION) * 100)}%`;
  els.lineupBar.classList.toggle("over", over);

  els.lineupList.innerHTML =
    games
      .map((game, index) => {
        const order = index + 1;
        return `
          <article class="lineup-item" data-game-id="${game.id}">
            <span class="lineup-order">${order}</span>
            <div class="lineup-info">
              <strong>${escapeHtml(game.name)}</strong>
              <span class="panel-hint">${game.minPlayers}-${game.maxPlayers}人 · ${game.duration}分钟 · ${escapeHtml(game.complexity)}</span>
            </div>
            <div class="lineup-controls">
              <button type="button" data-lineup-move="up" ${index === 0 ? "disabled" : ""} title="提前游玩">↑</button>
              <button type="button" data-lineup-move="down" ${index === games.length - 1 ? "disabled" : ""} title="延后游玩">↓</button>
              <button type="button" data-lineup-remove="1" title="移出今晚桌游串">移出</button>
            </div>
          </article>
        `;
      })
      .join("") || `<p class="empty">今晚还没安排，从收藏列表或详情里加入最多三款桌游。</p>`;
}

function renderAll() {
  saveState();
  renderSummary();
  renderList();
  renderLineup();
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

els.searchInput.addEventListener("input", renderAll);
els.playerFilter.addEventListener("change", renderAll);
els.complexityFilter.addEventListener("change", renderAll);
els.sortMode.addEventListener("change", renderAll);
els.gameForm.addEventListener("submit", addGame);

els.gameList.addEventListener("click", (event) => {
  const lineupToggle = event.target.closest("[data-lineup-toggle]");
  if (lineupToggle) {
    event.stopPropagation();
    const id = lineupToggle.dataset.lineupToggle;
    if (state.tonightIds.includes(id)) removeFromLineup(id);
    else addToLineup(id);
    renderAll();
    return;
  }
  const card = event.target.closest("[data-game-id]");
  if (!card) return;
  state.selectedId = card.dataset.gameId;
  renderAll();
});

els.lineupList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-game-id]");
  if (!item) return;
  const id = item.dataset.gameId;
  const removeButton = event.target.closest("[data-lineup-remove]");
  const moveButton = event.target.closest("[data-lineup-move]");

  if (removeButton) {
    removeFromLineup(id);
    renderAll();
    return;
  }
  if (moveButton) {
    moveInLineup(id, moveButton.dataset.lineupMove === "up" ? -1 : 1);
    renderAll();
    return;
  }
  state.selectedId = id;
  renderAll();
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
  renderAll();
});

els.detailView.addEventListener("click", (event) => {
  const ruleButton = event.target.closest("[data-rule-key]");
  const lineupButton = event.target.closest("#lineupToggleBtn");
  const playedButton = event.target.closest("#playedTodayBtn");
  const deleteButton = event.target.closest("#deleteGameBtn");
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

  if (lineupButton) {
    if (state.tonightIds.includes(game.id)) removeFromLineup(game.id);
    else addToLineup(game.id);
    renderAll();
  }

  if (ruleButton) {
    const key = ruleButton.dataset.ruleKey;
    const index = Number(ruleButton.dataset.ruleIndex);
    game[key].splice(index, 1);
    renderAll();
  }

  if (playedButton) {
    game.lastPlayed = new Date().toISOString().slice(0, 10);
    renderAll();
  }

  if (deleteButton) {
    state.games = state.games.filter((item) => item.id !== game.id);
    // 收藏被移除时同步清理清单并紧凑排序
    state.tonightIds = state.tonightIds.filter((id) => id !== game.id);
    lineupNotes = {};
    state.selectedId = state.games[0]?.id || "";
    renderAll();
  }
});

setDefaultDate();
renderAll();
