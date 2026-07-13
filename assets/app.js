const REPOSITORY_URL = "https://github.com/minamitopon/system-summary";
const STORAGE_KEYS = {
  openCards: "oklahoma-system-open-cards-v1",
  activeDocument: "oklahoma-system-active-document-v1",
};

const DOCUMENTS = [
  {
    id: "home",
    label: "Overview",
    title: "System Overview",
    subtitle: "Oklahoma の全体像",
    path: "Oklahoma/README.md",
    accent: "overview",
  },
  {
    id: "1C",
    label: "1♣",
    title: "1♣ Opening",
    subtitle: "Short Clubs · Transfer responses",
    path: "Oklahoma/1C/index.bml",
    accent: "club",
  },
  {
    id: "1D",
    label: "1♦",
    title: "1♦ Opening",
    subtitle: "Diamond opening structure",
    path: "Oklahoma/1D/index.bml",
    accent: "diamond",
  },
  {
    id: "1H",
    label: "1♥",
    title: "1♥ Opening",
    subtitle: "Heart opening structure",
    path: "Oklahoma/1H/index.bml",
    accent: "heart",
  },
  {
    id: "1S",
    label: "1♠",
    title: "1♠ Opening",
    subtitle: "Spade opening structure",
    path: "Oklahoma/1S/index.bml",
    accent: "spade",
  },
  {
    id: "1NT",
    label: "1NT",
    title: "1NT Opening",
    subtitle: "Notrump responses and continuations",
    path: "Oklahoma/1NT/index.bml",
    accent: "notrump",
  },
  {
    id: "2C",
    label: "2♣",
    title: "2♣ Opening",
    subtitle: "Strong club sequences",
    path: "Oklahoma/2C/index.bml",
    accent: "club",
  },
  {
    id: "2D",
    label: "2♦",
    title: "2♦ Opening",
    subtitle: "Diamond opening structure",
    path: "Oklahoma/2D/index.bml",
    accent: "diamond",
  },
  {
    id: "2M",
    label: "2M",
    title: "2 Major Opening",
    subtitle: "Weak two in a major",
    path: "Oklahoma/2M/index.bml",
    accent: "major",
  },
  {
    id: "2NT",
    label: "2NT",
    title: "2NT Opening",
    subtitle: "Notrump opening structure",
    path: "Oklahoma/2NT/index.bml",
    accent: "notrump",
  },
  {
    id: "3NT",
    label: "3NT",
    title: "3NT Opening",
    subtitle: "Gambling 3NT structure",
    path: "Oklahoma/3NT/index.bml",
    accent: "notrump",
  },
  {
    id: "3X",
    label: "3X",
    title: "Three-level Openings",
    subtitle: "Three-level opening agreements",
    path: "Oklahoma/3X/index.bml",
    accent: "competitive",
  },
  {
    id: "competitive",
    label: "Competitive",
    title: "Competitive Bidding",
    subtitle: "Intervention, doubles and competitive tools",
    path: "Oklahoma/competitive/index.bml",
    accent: "competitive",
  },
  {
    id: "carding",
    label: "Carding",
    title: "Carding Agreements",
    subtitle: "Leads, signals and discards",
    path: "Oklahoma/carding/index.bml",
    accent: "club",
  },
  {
    id: "other",
    label: "Other",
    title: "Other Agreements",
    subtitle: "General agreements and conventions",
    path: "Oklahoma/other/index.bml",
    accent: "other",
  },
];

const state = {
  documents: new Map(),
  activeDocumentId: getInitialDocumentId(),
  openCards: readStoredSet(STORAGE_KEYS.openCards),
  searchQuery: "",
};

const contentRoot = document.querySelector("#content-root");
const loadingState = document.querySelector("#loading-state");
const sidebarNav = document.querySelector("#sidebar-nav");
const mobileNav = document.querySelector("#mobile-nav");
const searchInput = document.querySelector("#system-search");
const openCount = document.querySelector("#open-count");

init();

async function init() {
  renderNavigation();
  bindControls();

  const results = await Promise.all(
    DOCUMENTS.map(async (documentMeta) => {
      try {
        const response = await fetch(encodeURI(documentMeta.path));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const source = await response.text();
        return [documentMeta.id, parseDocument(documentMeta, source)];
      } catch (error) {
        return [
          documentMeta.id,
          {
            ...documentMeta,
            source: "",
            sections: [],
            error: `読み込みに失敗しました (${error.message})`,
          },
        ];
      }
    }),
  );

  state.documents = new Map(results);
  loadingState.hidden = true;
  document.querySelector("#document-count").textContent = `${DOCUMENTS.length} sections`;
  render();
}

function getInitialDocumentId() {
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("doc");
  const stored = localStorage.getItem(STORAGE_KEYS.activeDocument);
  const candidate = fromHash || stored;
  return DOCUMENTS.some((item) => item.id === candidate) ? candidate : "home";
}

function readStoredSet(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    return new Set();
  }
}

function parseDocument(meta, source) {
  const normalized = source.replace(/\r\n/g, "\n").trim();
  if (!normalized) return { ...meta, source: normalized, sections: [] };

  const sectionPattern = /\/\*=+\*\/\s*\n([^\n]+)\s*\n\/\*=+\*\//g;
  const markers = [...normalized.matchAll(sectionPattern)];
  const sections = [];

  if (!markers.length) {
    sections.push(createSection("Notes", normalized, meta.id, 0));
  } else {
    const preamble = normalized.slice(0, markers[0].index).trim();
    if (preamble) sections.push(createSection("Summary", preamble, meta.id, 0));

    markers.forEach((marker, index) => {
      const bodyStart = marker.index + marker[0].length;
      const bodyEnd = markers[index + 1]?.index ?? normalized.length;
      const body = normalized.slice(bodyStart, bodyEnd).trim();
      if (body) sections.push(createSection(marker[1].trim(), body, meta.id, sections.length));
    });
  }

  return { ...meta, source: normalized, sections };
}

function createSection(title, body, documentId, sectionIndex) {
  const blocks = body
    .split(/\n\s*\n+/)
    .map((block) => block.trimEnd())
    .filter(Boolean)
    .map((block, blockIndex) => createCard(block, documentId, sectionIndex, blockIndex));

  return { title, blocks };
}

function createCard(block, documentId, sectionIndex, blockIndex) {
  const lines = block.split("\n").filter((line) => line.trim());
  const first = lines[0]?.trim() || "Notes";
  const title = first.replace(/^#{1,6}\s*/, "").replace(/^[-–]\s*/, "");
  return {
    id: `${documentId}-${sectionIndex}-${blockIndex}`,
    title,
    lines,
    searchText: `${title} ${lines.join(" ")}`.toLocaleLowerCase(),
  };
}

function renderNavigation() {
  const navigationItems = DOCUMENTS.map(
    (item) => `
      <button
        class="nav-item accent-${item.accent}"
        type="button"
        data-document-id="${item.id}"
        aria-current="${item.id === state.activeDocumentId ? "page" : "false"}"
      >
        <span class="nav-label">${item.label}</span>
        <span class="nav-subtitle">${item.subtitle}</span>
      </button>`,
  ).join("");

  sidebarNav.innerHTML = navigationItems;
  mobileNav.innerHTML = DOCUMENTS.map(
    (item) => `
      <button
        class="mobile-nav-item accent-${item.accent}"
        type="button"
        data-document-id="${item.id}"
        aria-current="${item.id === state.activeDocumentId ? "page" : "false"}"
      >${item.label}</button>`,
  ).join("");

  document.querySelectorAll("[data-document-id]").forEach((button) => {
    button.addEventListener("click", () => selectDocument(button.dataset.documentId));
  });
}

function bindControls() {
  searchInput.addEventListener("input", (event) => {
    state.searchQuery = event.target.value.trim();
    render();
  });

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput.focus();
    }
    if (event.key === "Escape" && document.activeElement === searchInput) {
      searchInput.value = "";
      state.searchQuery = "";
      searchInput.blur();
      render();
    }
  });

  document.querySelector("#expand-all").addEventListener("click", () => setAllVisible(true));
  document.querySelector("#collapse-all").addEventListener("click", () => setAllVisible(false));
  document.querySelector("#focus-search").addEventListener("click", () => {
    searchInput.focus({ preventScroll: true });
    window.scrollTo({ top: document.querySelector(".toolbar-wrap").offsetTop, behavior: "smooth" });
  });
  document.querySelector("#previous-document").addEventListener("click", () => moveDocument(-1));
  document.querySelector("#next-document").addEventListener("click", () => moveDocument(1));
  window.addEventListener("hashchange", () => {
    const id = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("doc");
    if (id && DOCUMENTS.some((item) => item.id === id) && id !== state.activeDocumentId) {
      state.activeDocumentId = id;
      renderNavigation();
      render();
    }
  });
}

function selectDocument(id) {
  state.activeDocumentId = id;
  state.searchQuery = "";
  searchInput.value = "";
  localStorage.setItem(STORAGE_KEYS.activeDocument, id);
  history.replaceState(null, "", `#doc=${encodeURIComponent(id)}`);
  renderNavigation();
  render();
  document.querySelector(`[data-document-id="${CSS.escape(id)}"].mobile-nav-item`)?.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "center",
  });
  document.querySelector("#system-content").focus({ preventScroll: true });
  window.scrollTo({ top: document.querySelector(".toolbar-wrap").offsetTop, behavior: "smooth" });
}

function moveDocument(direction) {
  const currentIndex = DOCUMENTS.findIndex((item) => item.id === state.activeDocumentId);
  const nextIndex = (currentIndex + direction + DOCUMENTS.length) % DOCUMENTS.length;
  selectDocument(DOCUMENTS[nextIndex].id);
}

function render() {
  if (!state.documents.size) return;
  contentRoot.innerHTML = state.searchQuery ? renderSearchResults() : renderActiveDocument();
  bindCardEvents();
  updateOpenCount();
}

function renderActiveDocument() {
  const documentData = state.documents.get(state.activeDocumentId);
  if (!documentData) return "";

  const sourceUrl = `${REPOSITORY_URL}/blob/main/${documentData.path}`;
  const totalCards = documentData.sections.reduce((count, section) => count + section.blocks.length, 0);

  return `
    <article class="document-view accent-${documentData.accent}">
      <header class="document-header">
        <div>
          <p class="document-kicker">OKLAHOMA / ${escapeHtml(documentData.label)}</p>
          <h2>${escapeHtml(documentData.title)}</h2>
          <p>${escapeHtml(documentData.subtitle)}</p>
        </div>
        <a class="source-link" href="${sourceUrl}" target="_blank" rel="noreferrer">
          原文を見る <span aria-hidden="true">↗</span>
        </a>
      </header>
      <div class="document-stats" aria-label="文書情報">
        <span><strong>${totalCards}</strong> topics</span>
        <span>開いた項目はこの端末に保存されます</span>
      </div>
      ${renderDocumentBody(documentData)}
    </article>`;
}

function renderDocumentBody(documentData) {
  if (documentData.error) {
    return `<div class="empty-state"><h3>読み込めませんでした</h3><p>${escapeHtml(documentData.error)}</p></div>`;
  }
  if (!documentData.sections.length) {
    return `<div class="empty-state"><span aria-hidden="true">♧</span><h3>まだノートがありません</h3><p>この項目は、原文が追加されると自動的に表示されます。</p></div>`;
  }

  return documentData.sections.map((section) => renderSection(section, documentData)).join("");
}

function renderSection(section, documentData) {
  return `
    <section class="note-section">
      <div class="section-heading">
        <span></span>
        <h3>${escapeHtml(section.title)}</h3>
        <small>${section.blocks.length} topics</small>
      </div>
      <div class="card-stack">
        ${section.blocks.map((card) => renderCard(card, documentData)).join("")}
      </div>
    </section>`;
}

function renderCard(card, documentData, options = {}) {
  const isOpen = state.openCards.has(card.id) || options.forceOpen;
  const titleLineIndex = card.lines.findIndex((line) => line.trim());
  const remainingLines = card.lines.filter((_, index) => index !== titleLineIndex);
  if (!remainingLines.length) {
    return `
      <div class="system-card system-card--static accent-${documentData.accent}">
        <span class="summary-copy">${decorateText(card.title)}</span>
      </div>`;
  }
  const body = remainingLines.length
    ? `<div class="card-body">${renderIndentedLines(remainingLines)}</div>`
    : "";

  return `
    <details class="system-card accent-${documentData.accent}" data-card-id="${card.id}" ${isOpen ? "open" : ""}>
      <summary>
        <span class="summary-copy">${decorateText(card.title)}</span>
        <span class="summary-meta">
          ${remainingLines.length ? `<small>${remainingLines.length} lines</small>` : ""}
          <span class="chevron" aria-hidden="true"></span>
        </span>
      </summary>
      ${body}
    </details>`;
}

function renderIndentedLines(lines) {
  const minIndent = Math.min(...lines.map((line) => line.match(/^\s*/)[0].length));
  return lines
    .map((line) => {
      const rawIndent = Math.max(0, line.match(/^\s*/)[0].length - minIndent);
      const depth = Math.min(8, Math.round(rawIndent / 2));
      const trimmed = line.trim().replace(/^[-–]\s*/, "");
      const isBranch = /^[-–]\s*/.test(line.trimStart());
      return `
        <div class="system-line ${isBranch ? "system-line--branch" : ""}" style="--depth:${depth}">
          <span class="branch-mark" aria-hidden="true"></span>
          <span>${decorateText(trimmed)}</span>
        </div>`;
    })
    .join("");
}

function renderSearchResults() {
  const query = state.searchQuery.toLocaleLowerCase();
  const matches = [];

  state.documents.forEach((documentData) => {
    documentData.sections.forEach((section) => {
      section.blocks.forEach((card) => {
        if (card.searchText.includes(query)) matches.push({ documentData, section, card });
      });
    });
  });

  return `
    <section class="search-results">
      <header class="search-results-header">
        <div>
          <p class="document-kicker">SYSTEM SEARCH</p>
          <h2>「${escapeHtml(state.searchQuery)}」の検索結果</h2>
        </div>
        <span>${matches.length}件</span>
      </header>
      ${
        matches.length
          ? `<div class="search-result-list">${matches
              .map(
                ({ documentData, section, card }) => `
                  <div class="search-result-group">
                    <button class="result-location accent-${documentData.accent}" type="button" data-result-document="${documentData.id}">
                      ${escapeHtml(documentData.label)} <span>/ ${escapeHtml(section.title)}</span>
                    </button>
                    ${renderCard(card, documentData, { forceOpen: true })}
                  </div>`,
              )
              .join("")}</div>`
          : `<div class="empty-state"><span aria-hidden="true">◇</span><h3>該当するノートがありません</h3><p>表記を変えるか、短いキーワードで検索してみてください。</p></div>`
      }
    </section>`;
}

function bindCardEvents() {
  contentRoot.querySelectorAll("details[data-card-id]").forEach((details) => {
    details.addEventListener("toggle", () => {
      if (details.open) state.openCards.add(details.dataset.cardId);
      else state.openCards.delete(details.dataset.cardId);
      persistOpenCards();
      updateOpenCount();
    });
  });

  contentRoot.querySelectorAll("[data-result-document]").forEach((button) => {
    button.addEventListener("click", () => selectDocument(button.dataset.resultDocument));
  });
}

function setAllVisible(shouldOpen) {
  contentRoot.querySelectorAll("details[data-card-id]").forEach((details) => {
    details.open = shouldOpen;
    if (shouldOpen) state.openCards.add(details.dataset.cardId);
    else state.openCards.delete(details.dataset.cardId);
  });
  persistOpenCards();
  updateOpenCount();
}

function persistOpenCards() {
  localStorage.setItem(STORAGE_KEYS.openCards, JSON.stringify([...state.openCards]));
}

function updateOpenCount() {
  const visibleCards = [...contentRoot.querySelectorAll("details[data-card-id]")];
  const visibleOpen = visibleCards.filter((details) => details.open).length;
  openCount.textContent = `${visibleOpen} / ${visibleCards.length}件を展開中`;
}

function decorateText(text) {
  const tokenPattern = /(\b[1-7](?:NT|[CDHSX])\b|\b(?:NT|NAT|ART|FG|INV|NF|CTRL|SPL|RKCB|HCP)\b|S\/O|F1|F2|♣|♦|♥|♠)/gi;
  return String(text)
    .split(tokenPattern)
    .map((part) => {
      if (!part) return "";
      const upper = part.toUpperCase();
      const suitClass = getSuitClass(upper);
      if (suitClass) return `<span class="bid-token ${suitClass}">${escapeHtml(formatBid(part))}</span>`;
      if (/^(NAT|ART|FG|INV|NF|CTRL|SPL|RKCB|HCP|S\/O|F1|F2)$/i.test(part)) {
        return `<span class="term-token">${escapeHtml(part)}</span>`;
      }
      return escapeHtml(part);
    })
    .join("");
}

function getSuitClass(token) {
  if (token.includes("♣") || /\dC$/.test(token)) return "suit-club";
  if (token.includes("♦") || /\dD$/.test(token)) return "suit-diamond";
  if (token.includes("♥") || /\dH$/.test(token)) return "suit-heart";
  if (token.includes("♠") || /\dS$/.test(token)) return "suit-spade";
  if (/\dNT$/.test(token) || token === "NT") return "suit-notrump";
  if (/\dX$/.test(token)) return "suit-double";
  return "";
}

function formatBid(token) {
  return token
    .replace(/(\d)C$/i, "$1♣")
    .replace(/(\d)D$/i, "$1♦")
    .replace(/(\d)H$/i, "$1♥")
    .replace(/(\d)S$/i, "$1♠");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
