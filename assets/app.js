const REPOSITORY_URL = "https://github.com/minamitopon/system-summary";
const STORAGE_KEYS = {
  openCards: "oklahoma-system-open-cards-v2",
  openResponses: "oklahoma-system-open-responses-v2",
  activeDocument: "oklahoma-system-active-document-v2",
};

const PREVIEW_USERS = [
  { id: "honda", name: "本田", initial: "本", github: "pon-64" },
  { id: "seshimo", name: "瀬下", initial: "瀬", github: "minamitopon" },
];

const DOCUMENTS = [
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
  targetIndex: new Map(),
  cardIndex: new Map(),
  embeddedCardIds: new Set(),
  activeDocumentId: getInitialDocumentId(),
  openCards: readStoredSet(STORAGE_KEYS.openCards),
  openResponses: readStoredSet(STORAGE_KEYS.openResponses),
  previewUserIndex: 0,
  draftChanges: [],
  comments: [],
  composerMode: "edit",
  composerTargetId: null,
};

const contentRoot = document.querySelector("#content-root");
const loadingState = document.querySelector("#loading-state");
const sidebarNav = document.querySelector("#sidebar-nav");
const mobileNav = document.querySelector("#mobile-nav");
const openCount = document.querySelector("#open-count");
const proposalDrawer = document.querySelector("#proposal-drawer");
const drawerBackdrop = document.querySelector("#drawer-backdrop");
const composerDialog = document.querySelector("#composer-dialog");
const composerForm = document.querySelector("#composer-form");
const composerBody = document.querySelector("#composer-body");
const editMode = document.querySelector("#edit-mode");

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
  buildTargetIndex();
  linkContinuationCards();
  loadingState.hidden = true;
  document.querySelector("#document-count").textContent = `${DOCUMENTS.length} sections`;
  updatePreviewUser();
  render();
  renderDraftDrawer();
  scrollToRequestedTopic("auto");
}

function getInitialDocumentId() {
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("doc");
  const stored = localStorage.getItem(STORAGE_KEYS.activeDocument);
  const candidate = fromHash || stored;
  return DOCUMENTS.some((item) => item.id === candidate) ? candidate : "1C";
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

  if (meta.id === "competitive") return parseCompetitiveDocument(meta, normalized);

  const sectionPattern = /\/\*=+\*\/\s*\n([^\n]+)\s*\n\/\*=+\*\//g;
  const markers = [...normalized.matchAll(sectionPattern)];
  const sections = [];

  if (!markers.length) {
    sections.push(createSection("Notes", normalized, meta, 0));
  } else {
    const preamble = normalized.slice(0, markers[0].index).trim();
    if (preamble) sections.push(createSection("Summary", preamble, meta, 0));

    markers.forEach((marker) => {
      const bodyStart = marker.index + marker[0].length;
      const markerIndex = markers.indexOf(marker);
      const bodyEnd = markers[markerIndex + 1]?.index ?? normalized.length;
      const body = normalized.slice(bodyStart, bodyEnd).trim();
      if (body) sections.push(createSection(marker[1].trim(), body, meta, sections.length));
    });
  }

  return { ...meta, source: normalized, sections };
}

function parseCompetitiveDocument(meta, normalized) {
  const sectionPattern = /\/\*=+\*\/\s*\n([^\n]+)\s*\n\/\*=+\*\//g;
  const markers = [...normalized.matchAll(sectionPattern)];
  const detailMarkerIndex = markers.findIndex((marker) => marker[1].trim().toLowerCase() === "detail");
  const overcallMarkerIndex = markers.findIndex((marker) => marker[1].trim().toLowerCase() === "overcall");
  if (detailMarkerIndex < 0) return { ...meta, source: normalized, sections: [createSection("Notes", normalized, meta, 0)] };

  const detailMarker = markers[detailMarkerIndex];
  const detailStart = detailMarker.index + detailMarker[0].length;
  const detailEnd = markers[detailMarkerIndex + 1]?.index ?? normalized.length;
  const detailBody = normalized.slice(detailStart, detailEnd).trim();
  const topicPattern = /^(\d+),\s*(.+)$/gm;
  const topicMarkers = [...detailBody.matchAll(topicPattern)];
  const topics = topicMarkers.map((marker, index) => {
    const bodyStart = marker.index + marker[0].length;
    const bodyEnd = topicMarkers[index + 1]?.index ?? detailBody.length;
    return {
      number: marker[1],
      title: marker[2].trim(),
      body: detailBody.slice(bodyStart, bodyEnd).trim(),
      anchorId: `competitive-topic-${marker[1]}`,
    };
  });

  const sections = [
    {
      title: "Topics",
      kind: "topic-index",
      items: topics.map(({ number, title, anchorId }) => ({ number, title, anchorId })),
      blocks: [],
    },
    ...topics.map((topic, index) => ({
      ...createSection(`${topic.number}. ${topic.title}`, topic.body, meta, index + 1),
      kind: "competitive-topic",
      topicNumber: topic.number,
      anchorId: topic.anchorId,
    })),
  ];

  if (overcallMarkerIndex >= 0) {
    const overcallMarker = markers[overcallMarkerIndex];
    const overcallStart = overcallMarker.index + overcallMarker[0].length;
    const overcallEnd = markers[overcallMarkerIndex + 1]?.index ?? normalized.length;
    const overcallBody = normalized.slice(overcallStart, overcallEnd).trim();
    if (overcallBody) sections.push(createSection("Overcall", overcallBody, meta, sections.length));
  }

  return { ...meta, source: normalized, sections };
}

function createSection(title, body, meta, sectionIndex) {
  const blocks = body
    .split(/\n\s*\n+/)
    .map((block) => block.trimEnd())
    .filter(Boolean)
    .map((block, blockIndex) => createCard(block, meta, sectionIndex, blockIndex));

  return { title, blocks };
}

function createCard(block, meta, sectionIndex, blockIndex) {
  const lines = block.split("\n").filter((line) => line.trim());
  const first = lines[0]?.trim() || "Notes";
  const title = cleanLine(first.replace(/^#{1,6}\s*/, ""));
  const id = `${meta.id}-${sectionIndex}-${blockIndex}`;
  const nodes = parseLineTree(lines.slice(1), id);

  annotateNodes(nodes, { cardId: id, topNodeId: null, ancestors: [title] });

  return {
    id,
    documentId: meta.id,
    path: meta.path,
    title,
    lines,
    nodes,
  };
}

function parseLineTree(lines, cardId) {
  if (!lines.length) return [];
  const parsed = lines.map((line, index) => ({
    id: `${cardId}-node-${index}`,
    raw: line,
    indent: line.match(/^\s*/)[0].length,
    text: cleanLine(line),
    children: [],
  }));
  const minIndent = Math.min(...parsed.map((item) => item.indent));
  const roots = [];
  const stack = [];

  parsed.forEach((node) => {
    const depth = Math.max(0, Math.round((node.indent - minIndent) / 2));
    node.depth = depth;
    while (stack.length > depth) stack.pop();
    if (depth === 0 || !stack[depth - 1]) roots.push(node);
    else stack[depth - 1].children.push(node);
    stack[depth] = node;
    stack.length = depth + 1;
  });

  return roots;
}

function annotateNodes(nodes, context) {
  nodes.forEach((node) => {
    const topNodeId = context.topNodeId || node.id;
    node.cardId = context.cardId;
    node.topNodeId = topNodeId;
    node.contextText = [...context.ancestors, node.text].join(" ; ");
    annotateNodes(node.children, {
      cardId: context.cardId,
      topNodeId,
      ancestors: [...context.ancestors, node.text],
    });
  });
}

function cleanLine(line) {
  return line.trim().replace(/^[-–]\s*/, "");
}

function buildTargetIndex() {
  state.targetIndex.clear();
  state.cardIndex.clear();
  state.documents.forEach((documentData) => {
    documentData.sections.forEach((section) => {
      section.blocks.forEach((card) => {
        state.cardIndex.set(card.id, card);
        state.targetIndex.set(card.id, {
          id: card.id,
          kind: "card",
          text: card.title,
          label: card.title,
          cardId: card.id,
          topNodeId: null,
          documentId: card.documentId,
          path: card.path,
        });
        walkNodes(card.nodes, (node) => {
          state.targetIndex.set(node.id, {
            id: node.id,
            kind: "response",
            text: node.text,
            label: node.contextText,
            cardId: node.cardId,
            topNodeId: node.topNodeId,
            documentId: card.documentId,
            path: card.path,
          });
        });
      });
    });
  });
}

function linkContinuationCards() {
  state.embeddedCardIds.clear();
  state.documents.forEach((documentData) => {
    documentData.sections.forEach((section) => {
      const cardByAuction = new Map(section.blocks.map((card) => [normalizeAuction(card.title), card.id]));

      section.blocks.forEach((card) => {
        card.nodes.forEach((node) => {
          delete node.linkedCardId;
          const bid = node.text.match(/^(?:Dbl|XX|[1-7](?:NT|[CDHSX]))\b/)?.[0];
          if (!bid) return;
          const linkedCardId = cardByAuction.get(normalizeAuction(`${card.title}-${bid}`));
          if (linkedCardId && linkedCardId !== card.id) {
            node.linkedCardId = linkedCardId;
            state.embeddedCardIds.add(linkedCardId);
          }
        });
      });
    });
  });
}

function normalizeAuction(value) {
  return String(value)
    .toUpperCase()
    .replaceAll("♣", "C")
    .replaceAll("♦", "D")
    .replaceAll("♥", "H")
    .replaceAll("♠", "S")
    .replace(/[^A-Z0-9]/g, "");
}

function walkNodes(nodes, callback) {
  nodes.forEach((node) => {
    callback(node);
    walkNodes(node.children, callback);
  });
}

function renderNavigation() {
  sidebarNav.innerHTML = DOCUMENTS.map(
    (item) => `
      <button class="nav-item accent-${item.accent}" type="button" data-document-id="${item.id}"
        aria-current="${item.id === state.activeDocumentId ? "page" : "false"}">
        <span class="nav-label">${item.label}</span>
        <span class="nav-subtitle">${item.subtitle}</span>
      </button>`,
  ).join("");

  mobileNav.innerHTML = DOCUMENTS.map(
    (item) => `
      <button class="mobile-nav-item accent-${item.accent}" type="button" data-document-id="${item.id}"
        aria-current="${item.id === state.activeDocumentId ? "page" : "false"}">${item.label}</button>`,
  ).join("");

  document.querySelectorAll("[data-document-id]").forEach((button) => {
    button.addEventListener("click", () => selectDocument(button.dataset.documentId));
  });
}

function bindControls() {
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeActionMenus();
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".action-menu")) closeActionMenus();
  });
  window.addEventListener("resize", () => closeActionMenus());
  window.addEventListener("scroll", () => closeActionMenus(), { passive: true });

  document.querySelector("#expand-all").addEventListener("click", () => setAllVisible(true));
  document.querySelector("#collapse-all").addEventListener("click", () => setAllVisible(false));
  document.querySelector("#previous-document").addEventListener("click", () => moveDocument(-1));
  document.querySelector("#next-document").addEventListener("click", () => moveDocument(1));
  document.querySelector("#preview-user").addEventListener("click", switchPreviewUser);
  document.querySelector("#drawer-preview-user").addEventListener("click", switchPreviewUser);
  document.querySelector("#open-proposal-drawer").addEventListener("click", openDrawer);
  document.querySelector("#mobile-open-draft").addEventListener("click", openDrawer);
  document.querySelector("#close-proposal-drawer").addEventListener("click", closeDrawer);
  drawerBackdrop.addEventListener("click", closeDrawer);
  document.querySelector("#close-composer").addEventListener("click", closeComposer);
  document.querySelector("#cancel-composer").addEventListener("click", closeComposer);
  composerForm.addEventListener("submit", saveComposer);
  editMode.addEventListener("change", updateEditMode);
  composerBody.addEventListener("input", renderComposerPreview);

  window.addEventListener("hashchange", () => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const id = params.get("doc");
    if (id && DOCUMENTS.some((item) => item.id === id) && id !== state.activeDocumentId) {
      state.activeDocumentId = id;
      renderNavigation();
      render();
    }
    scrollToRequestedTopic("smooth");
  });
}

function selectDocument(id, topicTarget = "") {
  state.activeDocumentId = id;
  localStorage.setItem(STORAGE_KEYS.activeDocument, id);
  const params = new URLSearchParams({ doc: id });
  const topicNumber = topicTarget.match(/^competitive-topic-(\d+)$/)?.[1];
  if (topicNumber) params.set("topic", topicNumber);
  history.replaceState(null, "", `#${params.toString()}`);
  renderNavigation();
  render();
  document.querySelector(`[data-document-id="${CSS.escape(id)}"].mobile-nav-item`)?.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "center",
  });
  document.querySelector("#system-content").focus({ preventScroll: true });
  if (topicTarget) {
    requestAnimationFrame(() => scrollToTopic(topicTarget, "smooth"));
  } else {
    window.scrollTo({ top: document.querySelector(".toolbar-wrap").offsetTop, behavior: "smooth" });
  }
}

function scrollToRequestedTopic(behavior = "smooth") {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const topicNumber = params.get("topic");
  if (params.get("doc") === "competitive" && topicNumber) {
    requestAnimationFrame(() => scrollToTopic(`competitive-topic-${topicNumber}`, behavior));
  }
}

function scrollToTopic(targetId, behavior = "smooth") {
  document.getElementById(targetId)?.scrollIntoView({ behavior, block: "start" });
}

function moveDocument(direction) {
  const currentIndex = DOCUMENTS.findIndex((item) => item.id === state.activeDocumentId);
  selectDocument(DOCUMENTS[(currentIndex + direction + DOCUMENTS.length) % DOCUMENTS.length].id);
}

function render() {
  if (!state.documents.size) return;
  contentRoot.innerHTML = renderActiveDocument();
  bindContentEvents();
  updateOpenCount();
}

function renderActiveDocument() {
  const documentData = state.documents.get(state.activeDocumentId);
  if (!documentData) return "";
  const totalCards = documentData.sections.reduce((count, section) => count + section.blocks.length, 0);
  const isAlwaysExpanded = documentData.id === "competitive";

  return `
    <article class="document-view accent-${documentData.accent}">
      <header class="document-header">
        <div>
          <p class="document-kicker">OKLAHOMA / ${escapeHtml(documentData.label)}</p>
          <h2>${escapeHtml(documentData.title)}</h2>
          <p>${escapeHtml(documentData.subtitle)}</p>
        </div>
        <a class="source-link" href="${REPOSITORY_URL}/blob/main/${documentData.path}" target="_blank" rel="noreferrer">
          原文を見る <span aria-hidden="true">↗</span>
        </a>
      </header>
      <div class="document-stats" aria-label="文書情報">
        <span><strong>${totalCards}</strong> topics</span>
        <span>${
          isAlwaysExpanded
            ? "Competitiveは全内容を表示しています"
            : "1段目でレスポンス一覧、2段目でその先を表示します"
        }</span>
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
  if (section.kind === "topic-index") return renderTopicIndex(section);
  if (section.title.toLowerCase() === "overview") {
    return renderOpeningOverview(section, documentData);
  }
  const memoBlocks = section.blocks.filter(isSystemMemo);
  const visibleBlocks = section.blocks.filter(
    (card) => !state.embeddedCardIds.has(card.id) && !isSystemMemo(card),
  );
  const sectionId = section.anchorId ? ` id="${escapeHtml(section.anchorId)}"` : "";
  const biddingSection = visibleBlocks.length
    ? `
      <section class="note-section${section.kind === "competitive-topic" ? " competitive-topic-section" : ""}"${sectionId}>
        <div class="section-heading">
          <span></span><h3>${escapeHtml(section.title)}</h3><small>${visibleBlocks.length} topics</small>
        </div>
        <div class="card-stack">${visibleBlocks
          .map((card) => {
            if (isCompetitiveSubheading(section, card)) return renderCompetitiveSubheading(card);
            if (documentData.id === "competitive") return renderExpandedCard(card, documentData);
            return renderCard(card, documentData);
          })
          .join("")}</div>
      </section>`
    : "";

  return `${biddingSection}${memoBlocks.length ? renderMemoSection(memoBlocks) : ""}`;
}

function renderTopicIndex(section) {
  return `
    <section class="note-section topic-index-section">
      <div class="section-heading">
        <span></span><h3>Topics</h3><small>${section.items.length} sections</small>
      </div>
      <nav class="topic-index" aria-label="Competitive topics">
        ${section.items
          .map(
            (item) => `
              <button type="button" class="topic-index-item" data-topic-target="${escapeHtml(item.anchorId)}">
                <span>${escapeHtml(item.number)}</span><strong>${decorateText(item.title, item.title)}</strong>
              </button>`,
          )
          .join("")}
      </nav>
    </section>`;
}

function isCompetitiveSubheading(section, card) {
  return section.kind === "competitive-topic" && !card.nodes.length && /^\d+-\d+\b/.test(card.title);
}

function renderCompetitiveSubheading(card) {
  return `
    <div class="competitive-subheading">
      <h4>${decorateText(card.title, card.title)}</h4>
      ${renderInlineActions(card.id, true)}
      ${renderComments(card.id)}
    </div>`;
}

function isSystemMemo(card) {
  return /^system\s+(?:on|off)\b/i.test(card.title.trim());
}

function renderMemoSection(cards) {
  return `
    <section class="note-section memo-section">
      <div class="section-heading">
        <span></span><h3>Memo</h3><small>${cards.length} notes</small>
      </div>
      <div class="memo-stack">${cards.map((card) => renderMemoBlock(card)).join("")}</div>
    </section>`;
}

function renderMemoBlock(card) {
  const items = [];
  walkNodes(card.nodes, (node) => items.push(node));
  const isOff = /^system\s+off\b/i.test(card.title.trim());

  return `
    <article class="memo-card ${isOff ? "memo-card--off" : "memo-card--on"}">
      <header class="memo-header">
        <span class="memo-status">${escapeHtml(card.title)}</span>
        <span class="memo-header-actions">${renderCommentCount(card.id)}${renderInlineActions(card.id, true)}</span>
      </header>
      ${renderComments(card.id)}
      <div class="memo-lines">
        ${items
          .map(
            (item) => `
              <div class="memo-item">
                <div class="memo-line">
                  <span>${decorateText(item.text, item.contextText)}</span>
                  ${renderCommentCount(item.id)}
                  ${renderInlineActions(item.id, true)}
                </div>
                ${renderComments(item.id)}
              </div>`,
          )
          .join("")}
      </div>
    </article>`;
}

function renderOpeningOverview(section, documentData) {
  return `
    <section class="note-section opening-overview-section">
      <div class="section-heading">
        <span></span><h3>Opening Overview</h3><small>hand types</small>
      </div>
      <div class="opening-overview accent-${documentData.accent}">
        ${section.blocks.map((card) => renderOverviewBlock(card)).join("")}
      </div>
    </section>`;
}

function renderOverviewBlock(card) {
  const items = [{ id: card.id, text: card.title, context: card.title }];
  walkNodes(card.nodes, (node) => items.push({ id: node.id, text: node.text, context: node.contextText }));
  const numbered = items.every((item) => /^\d+,\s*/.test(item.text));

  return `
    <div class="overview-block ${numbered ? "overview-block--patterns" : ""}">
      ${items
        .map((item) => {
          const match = item.text.match(/^(\d+),\s*(.*)$/);
          const displayText = match ? match[2] : item.text;
          return `
            <div class="overview-item">
              <div class="overview-line">
                ${match ? `<span class="overview-number">${match[1]}</span>` : `<span class="overview-mark" aria-hidden="true"></span>`}
                <span class="overview-copy">${decorateText(displayText, item.context)}</span>
                ${renderInlineActions(item.id, true)}
                ${renderCommentCount(item.id)}
              </div>
              ${renderComments(item.id)}
            </div>`;
        })
        .join("")}
    </div>`;
}

function renderCard(card, documentData, options = {}) {
  const isOpen = options.forceOpen || state.openCards.has(card.id);
  if (!card.nodes.length) {
    return `
      <div class="system-card system-card--static accent-${documentData.accent}">
        <span class="summary-copy">${decorateText(card.title, card.title)}</span>
        ${renderInlineActions(card.id)}
        ${renderComments(card.id)}
      </div>`;
  }

  return `
    <details class="system-card accent-${documentData.accent}" data-state-id="${card.id}" data-state-kind="card" ${isOpen ? "open" : ""}>
      <summary>
        <span class="summary-copy">${decorateText(card.title, card.title)}</span>
        <span class="summary-meta">${renderCommentCount(card.id)}${renderInlineActions(card.id, true)}<span class="chevron" aria-hidden="true"></span></span>
      </summary>
      <div class="card-body">
        ${renderComments(card.id)}
        <div class="response-list">
          ${card.nodes.map((node) => renderTopResponse(node, documentData, card, options.forceOpen)).join("")}
        </div>
      </div>
    </details>`;
}

function renderExpandedCard(card, documentData) {
  const comments = renderComments(card.id);
  const body = comments || card.nodes.length
    ? `
      <div class="card-body expanded-card-body">
        ${comments}
        ${card.nodes.length ? `<div class="response-list">${renderDescendants(card.nodes, 0, card.title)}</div>` : ""}
      </div>`
    : "";

  return `
    <article class="system-card system-card--expanded accent-${documentData.accent}">
      <header class="expanded-card-heading">
        <span class="summary-copy">${decorateText(card.title, card.title)}</span>
        <span class="summary-meta">${renderCommentCount(card.id)}${renderInlineActions(card.id, true)}</span>
      </header>
      ${body}
    </article>`;
}

function renderTopResponse(node, documentData, card, forceOpen = false) {
  const context = `${card.title} ; ${node.text}`;
  const linkedCard = node.linkedCardId ? state.cardIndex.get(node.linkedCardId) : null;
  const hasChildren = node.children.length > 0 || Boolean(linkedCard?.nodes.length);
  const conventionReference = renderConventionReference(card.title, node.text);
  if (!hasChildren) return renderResponseRow(node, context, 0, conventionReference);
  const isOpen = forceOpen || state.openResponses.has(node.id);

  return `
    <details class="response-card ${linkedCard ? "response-card--linked" : ""} accent-${documentData.accent}" data-state-id="${node.id}" data-state-kind="response" ${isOpen ? "open" : ""}>
      <summary>
        <span>${decorateText(node.text, context)}</span>
        <span class="response-summary-meta">${conventionReference}${renderCommentCount(node.id)}${renderInlineActions(node.id, true)}<span class="chevron" aria-hidden="true"></span></span>
      </summary>
      <div class="response-body">
        ${renderComments(node.id)}
        ${
          linkedCard
            ? `<div class="response-list response-list--nested">${linkedCard.nodes
                .map((child) => renderTopResponse(child, documentData, linkedCard, forceOpen))
                .join("")}</div>`
            : renderDescendants(node.children, 0, context)
        }
      </div>
    </details>`;
}

function renderDescendants(nodes, depth, parentContext) {
  return nodes
    .map((node) => {
      const context = `${parentContext} ; ${node.text}`;
      return `
        ${renderResponseRow(node, context, depth)}
        ${node.children.length ? renderDescendants(node.children, depth + 1, context) : ""}`;
    })
    .join("");
}

function renderResponseRow(node, context, depth, conventionReference = "") {
  return `
    <div class="response-row-wrap" style="--depth:${Math.min(depth, 7)}">
      <div class="response-row">
        <span class="branch-mark" aria-hidden="true"></span>
        <span class="response-copy">${decorateText(node.text, context)}</span>
        ${conventionReference}
        ${renderInlineActions(node.id, true)}
        ${renderCommentCount(node.id)}
      </div>
      ${renderComments(node.id)}
    </div>`;
}

function renderConventionReference(cardTitle, nodeText) {
  const baseAuction = normalizeAuction(cardTitle);
  const nextBid = nodeText.trim().match(/^(?:[1-7](?:NT|[CDHS]))\b/i)?.[0]?.toUpperCase();
  const xyzAuctions = {
    "1C1D": new Set(["1H", "1S", "1NT"]),
    "1C1H": new Set(["1S", "1NT"]),
    "1C1S": new Set(["1NT"]),
  };
  if (!nextBid || !xyzAuctions[baseAuction]?.has(nextBid)) return "";

  return `<button class="convention-reference" type="button" data-document-target="competitive" data-topic-target="competitive-topic-13" title="Competitive / 13. XYZ の詳細へ">XYZ <span aria-hidden="true">↗</span></button>`;
}

function renderInlineActions(targetId, compact = false) {
  return `
    <span class="inline-actions ${compact ? "inline-actions--compact" : ""}">
      <span class="action-menu">
        <button class="action-menu-trigger" type="button" data-action-menu-toggle aria-haspopup="menu" aria-expanded="false" aria-label="この項目の操作">…</button>
        <span class="action-menu-popover" role="menu" hidden>
          <button class="action-menu-item" type="button" role="menuitem" data-compose="edit" data-target-id="${targetId}"><span aria-hidden="true">＋</span>変更を提案</button>
          <button class="action-menu-item" type="button" role="menuitem" data-compose="comment" data-target-id="${targetId}"><span aria-hidden="true">◌</span>コメント</button>
        </span>
      </span>
    </span>`;
}

function getComments(targetId) {
  return state.comments.filter((comment) => comment.targetId === targetId);
}

function renderCommentCount(targetId) {
  const count = getComments(targetId).length;
  return count ? `<span class="comment-count" title="コメント${count}件">◌ ${count}</span>` : "";
}

function renderComments(targetId) {
  const comments = getComments(targetId);
  if (!comments.length) return "";
  return `
    <div class="comment-thread">
      ${comments
        .map(
          (comment) => `
            <div class="comment-item">
              <span class="comment-avatar">${escapeHtml(comment.author.initial)}</span>
              <div><strong>${escapeHtml(comment.author.name)}</strong><p>${escapeHtml(comment.text)}</p></div>
            </div>`,
        )
        .join("")}
    </div>`;
}

function bindContentEvents() {
  contentRoot.querySelectorAll("details[data-state-id]").forEach((details) => {
    const summary = details.querySelector(":scope > summary");
    summary?.addEventListener("click", () => {
      if (!details.open) closeOpenSiblings(details);
    });

    details.addEventListener("toggle", () => {
      const collection = details.dataset.stateKind === "card" ? state.openCards : state.openResponses;
      if (details.open) collection.add(details.dataset.stateId);
      else collection.delete(details.dataset.stateId);
      persistOpenState();
      updateOpenCount();
    });
  });

  contentRoot.querySelectorAll("[data-action-menu-toggle]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleActionMenu(button);
    });
  });

  contentRoot.querySelectorAll("[data-compose]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeActionMenus();
      openComposer(button.dataset.compose, button.dataset.targetId);
    });
  });

  contentRoot.querySelectorAll("[data-topic-target]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const targetId = button.dataset.topicTarget;
      const documentId = button.dataset.documentTarget || state.activeDocumentId;
      if (documentId !== state.activeDocumentId) {
        selectDocument(documentId, targetId);
        return;
      }

      const params = new URLSearchParams({ doc: documentId });
      const topicNumber = targetId.match(/^competitive-topic-(\d+)$/)?.[1];
      if (topicNumber) params.set("topic", topicNumber);
      history.replaceState(null, "", `#${params.toString()}`);
      scrollToTopic(targetId, "smooth");
    });
  });

}

function closeOpenSiblings(activeDetails) {
  const parent = activeDetails.parentElement;
  if (!parent) return;

  [...parent.children].forEach((sibling) => {
    if (
      sibling !== activeDetails &&
      sibling.tagName === "DETAILS" &&
      sibling.dataset.stateKind === activeDetails.dataset.stateKind &&
      sibling.open
    ) {
      sibling.open = false;
    }
  });
}

function toggleActionMenu(trigger) {
  const menu = trigger.closest(".action-menu");
  const popover = menu?.querySelector(".action-menu-popover");
  if (!menu || !popover) return;
  const shouldOpen = popover.hidden;
  closeActionMenus(menu);
  if (!shouldOpen) {
    popover.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    return;
  }

  popover.hidden = false;
  trigger.setAttribute("aria-expanded", "true");
  positionActionMenu(trigger, popover);
}

function positionActionMenu(trigger, popover) {
  const gutter = 8;
  const gap = 6;
  const triggerRect = trigger.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const left = Math.min(
    Math.max(gutter, triggerRect.right - popoverRect.width),
    window.innerWidth - popoverRect.width - gutter,
  );
  const fitsBelow = triggerRect.bottom + gap + popoverRect.height <= window.innerHeight - gutter;
  const top = fitsBelow ? triggerRect.bottom + gap : Math.max(gutter, triggerRect.top - popoverRect.height - gap);
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function closeActionMenus(exceptMenu = null) {
  contentRoot.querySelectorAll(".action-menu-popover:not([hidden])").forEach((popover) => {
    const menu = popover.closest(".action-menu");
    if (menu === exceptMenu) return;
    popover.hidden = true;
    menu?.querySelector("[data-action-menu-toggle]")?.setAttribute("aria-expanded", "false");
  });
}

function setAllVisible(shouldOpen) {
  contentRoot.querySelectorAll("details[data-state-id]").forEach((details) => {
    details.open = shouldOpen;
    const collection = details.dataset.stateKind === "card" ? state.openCards : state.openResponses;
    if (shouldOpen) collection.add(details.dataset.stateId);
    else collection.delete(details.dataset.stateId);
  });
  persistOpenState();
  updateOpenCount();
}

function persistOpenState() {
  localStorage.setItem(STORAGE_KEYS.openCards, JSON.stringify([...state.openCards]));
  localStorage.setItem(STORAGE_KEYS.openResponses, JSON.stringify([...state.openResponses]));
}

function updateOpenCount() {
  const visibleCards = [...contentRoot.querySelectorAll("details[data-state-id]")];
  const visibleOpen = visibleCards.filter((details) => details.open).length;
  openCount.textContent = `${visibleOpen} / ${visibleCards.length}件を展開中`;
}

function openComposer(mode, targetId) {
  const target = state.targetIndex.get(targetId);
  if (!target) return;
  state.composerMode = mode;
  state.composerTargetId = targetId;
  document.querySelector("#composer-target-label").innerHTML = decorateText(target.label, target.label);
  const isComment = mode === "comment";
  document.querySelector("#composer-kicker").textContent = isComment ? "COMMENT" : "PROPOSAL";
  document.querySelector("#composer-title").textContent = isComment ? "相手にコメントする" : "変更を提案に追加";
  document.querySelector("#edit-fields").hidden = isComment;
  document.querySelector("#composer-preview-block").hidden = isComment;
  document.querySelector("#save-composer").textContent = isComment ? "コメントを追加" : "ドラフトに追加";
  document.querySelector("#composer-body-label").textContent = "修正後の内容";
  editMode.value = "replace";
  composerBody.value = isComment ? "" : target.text;
  composerBody.placeholder = isComment ? "例：このレスポンスだと強さの範囲が曖昧では？" : "修正後のシステム内容";
  renderComposerPreview();
  composerDialog.showModal();
  composerBody.focus();
}

function closeComposer() {
  composerDialog.close();
  state.composerTargetId = null;
}

function updateEditMode() {
  const target = state.targetIndex.get(state.composerTargetId);
  const isAppend = editMode.value === "append";
  document.querySelector("#composer-body-label").textContent = isAppend ? "追加するレスポンスと意味" : "修正後の内容";
  composerBody.value = isAppend ? "" : target?.text || "";
  composerBody.placeholder = isAppend ? "例：2S  C5S4, INV+" : "修正後のシステム内容";
  renderComposerPreview();
  composerBody.focus();
}

function renderComposerPreview() {
  if (state.composerMode === "comment") return;
  const target = state.targetIndex.get(state.composerTargetId);
  const preview = document.querySelector("#composer-preview");
  if (!target || !preview) return;
  const value = composerBody.value.trim();
  if (!value) {
    preview.innerHTML = `<span class="preview-placeholder">入力すると、実際の色と記号でここに表示されます。</span>`;
    return;
  }
  const isAppend = editMode.value === "append";
  preview.innerHTML = `
    ${isAppend ? `<div class="preview-context">${decorateText(target.label, target.label)}</div><span class="preview-arrow">↓ 追加</span>` : ""}
    <div class="preview-result">${decorateText(value, `${target.label} ; ${value}`)}</div>`;
}

function saveComposer(event) {
  event.preventDefault();
  const target = state.targetIndex.get(state.composerTargetId);
  const value = composerBody.value.trim();
  if (!target || !value) return;
  const author = PREVIEW_USERS[state.previewUserIndex];

  if (state.composerMode === "comment") {
    state.comments.push({ id: crypto.randomUUID(), targetId: target.id, author, text: value });
    state.openCards.add(target.cardId);
    if (target.topNodeId) state.openResponses.add(target.topNodeId);
    showToast(`${author.name}のコメントを追加しました（テスト表示）`);
  } else {
    state.draftChanges.push({
      id: crypto.randomUUID(),
      targetId: target.id,
      documentId: target.documentId,
      path: target.path,
      targetLabel: target.label,
      mode: editMode.value,
      before: target.text,
      after: value,
      author,
    });
    showToast("変更を提案ドラフトに追加しました");
  }

  persistOpenState();
  composerDialog.close();
  render();
  renderDraftDrawer();
}

function openDrawer() {
  proposalDrawer.setAttribute("aria-hidden", "false");
  drawerBackdrop.hidden = false;
  document.body.classList.add("drawer-open");
  renderDraftDrawer();
}

function closeDrawer() {
  proposalDrawer.setAttribute("aria-hidden", "true");
  drawerBackdrop.hidden = true;
  document.body.classList.remove("drawer-open");
}

function renderDraftDrawer() {
  const count = state.draftChanges.length;
  document.querySelector("#draft-count").textContent = count;
  document.querySelector("#mobile-draft-count").textContent = count;
  document.querySelector("#drawer-draft-count").textContent = `${count}件`;
  const list = document.querySelector("#draft-list");
  if (!count) {
    list.innerHTML = `<div class="draft-empty"><span>＋</span><p>各項目の「変更」から、複数の修正をここにまとめられます。</p></div>`;
    return;
  }
  list.innerHTML = state.draftChanges
    .map(
      (change, index) => `
        <article class="draft-item">
          <header><span>${index + 1}</span><strong>${escapeHtml(change.documentId)} / ${escapeHtml(change.mode === "append" ? "レスポンス追加" : "内容修正")}</strong>
            <button type="button" data-remove-draft="${change.id}" aria-label="この変更を削除">×</button></header>
          <p class="draft-target">${decorateText(change.targetLabel, change.targetLabel)}</p>
          ${change.mode === "replace" ? `<del>${decorateText(change.before, change.targetLabel)}</del>` : ""}
          <ins>${change.mode === "append" ? "＋ " : ""}${decorateText(change.after, `${change.targetLabel} ; ${change.after}`)}</ins>
        </article>`,
    )
    .join("");
  list.querySelectorAll("[data-remove-draft]").forEach((button) => {
    button.addEventListener("click", () => {
      state.draftChanges = state.draftChanges.filter((change) => change.id !== button.dataset.removeDraft);
      renderDraftDrawer();
    });
  });
}

function switchPreviewUser() {
  state.previewUserIndex = (state.previewUserIndex + 1) % PREVIEW_USERS.length;
  updatePreviewUser();
  showToast(`${PREVIEW_USERS[state.previewUserIndex].name}の画面に切り替えました`);
}

function updatePreviewUser() {
  const user = PREVIEW_USERS[state.previewUserIndex];
  const chip = document.querySelector("#preview-user");
  chip.querySelector(".account-avatar").textContent = user.initial;
  chip.querySelector("strong").textContent = user.name;
  document.querySelector("#drawer-preview-user").textContent = `${user.name}で確認`;
}

let toastTimer;
function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

function decorateText(text, context = "") {
  const tokenPattern = /(\b[1-7]OM\b|\b[1-7](?:NT|[CDHSX])\b|[1-7][♣♦♥♠]|(?<![A-Za-z])[CDHS♣♦♥♠]\s*\d+(?:\s*(?:~|〜|-|–)\s*\d+|\s*\+)?|\d+\+?\s*cards?\s+(?:Clubs?|Diamonds?|Hearts?|Spades?)|(?<![A-Za-z])[CDHS♣♦♥♠]\s+(?:Singleton|Void)|\b(?:Clubs?|Diamonds?|Hearts?|Spades?)\b|\bM\d+\+?\b|\bOM\b|\b(?:NT|NAT|ART|FG|INV|NF|CTRL|SPL|RKCB|HCP)\b|S\/O|F1|F2|♣|♦|♥|♠)/gi;
  return String(text)
    .split(tokenPattern)
    .map((part) => {
      if (!part) return "";
      if (/^[1-7]?OM$/i.test(part)) return renderOtherMajor(part.toUpperCase(), context);
      if (isSuitHoldingToken(part)) return renderSuitHolding(part);
      const suitClass = getSuitClass(part);
      if (suitClass) return `<span class="bid-token ${suitClass}">${escapeHtml(formatBridgeToken(part))}</span>`;
      if (/^M\d+\+?$/i.test(part)) {
        return `<span class="bid-token suit-major" title="Major suit: Hearts または Spades">${escapeHtml(part)}</span>`;
      }
      if (/^(NAT|ART|FG|INV|NF|CTRL|SPL|RKCB|HCP|S\/O|F1|F2)$/i.test(part)) {
        return `<span class="term-token">${escapeHtml(part)}</span>`;
      }
      return escapeHtml(part);
    })
    .join("");
}

function isSuitHoldingToken(token) {
  return (
    /^[CDHS♣♦♥♠]\s*\d+(?:\s*(?:~|〜|-|–)\s*\d+|\s*\+)?$/i.test(token) ||
    /^\d+\+?\s*cards?\s+(?:Clubs?|Diamonds?|Hearts?|Spades?)$/i.test(token) ||
    /^[CDHS♣♦♥♠]\s+(?:Singleton|Void)$/i.test(token)
  );
}

function renderSuitHolding(token) {
  const suitClass = getSuitClass(token);
  return `<span class="bid-token holding-token ${suitClass}" title="${escapeHtml(getHoldingTitle(token))}">${escapeHtml(formatBridgeToken(token))}</span>`;
}

function getHoldingTitle(token) {
  const compact = token.match(/^([CDHS♣♦♥♠])\s*(\d+)(?:\s*(~|〜|-|–)\s*(\d+)|\s*(\+))?$/i);
  if (compact) {
    const suit = toSuitSymbol(compact[1]);
    if (compact[4]) return `${suit} ${compact[2]}〜${compact[4]}枚`;
    if (compact[5]) return `${suit} ${compact[2]}枚以上`;
    return `${suit} ${compact[2]}枚`;
  }

  const written = token.match(/^(\d+\+?)\s*cards?\s+(Clubs?|Diamonds?|Hearts?|Spades?)$/i);
  if (written) return `${toSuitSymbol(written[2])} ${written[1].replace("+", "枚以上").replace(/^(\d+)$/, "$1枚")}`;

  const shortShape = token.match(/^([CDHS♣♦♥♠])\s+(Singleton|Void)$/i);
  if (shortShape) return `${toSuitSymbol(shortShape[1])} ${shortShape[2]}`;
  return token;
}

function renderOtherMajor(token, context) {
  const otherSuit = resolveOtherMajor(context.replace(token, ""));
  const level = token.match(/^([1-7])/)?.[1] || "";
  if (!otherSuit) {
    return `<span class="bid-token suit-major" title="OM = Other Major（もう一方のメジャー）">${escapeHtml(token)}</span>`;
  }
  const symbol = otherSuit === "H" ? "♥" : "♠";
  const suitClass = otherSuit === "H" ? "suit-heart" : "suit-spade";
  const explanation = otherSuit === "H" ? "Spades に対する Other Major = Hearts" : "Hearts に対する Other Major = Spades";
  return `<span class="bid-token ${suitClass}" title="${explanation}">${level}${symbol}<small>OM</small></span>`;
}

function resolveOtherMajor(context) {
  const matches = [...String(context).matchAll(/(?:[1-7]([HS])\b|([HS])\d+\+?)/g)];
  const reference = matches.at(-1)?.[1] || matches.at(-1)?.[2];
  if (reference === "S") return "H";
  if (reference === "H") return "S";
  return null;
}

function getSuitClass(token) {
  if (token.includes("♣") || /(?:\dC$|^C(?:\s*\d|\s+(?:singleton|void))|clubs?)/i.test(token)) return "suit-club";
  if (token.includes("♦") || /(?:\dD$|^D(?:\s*\d|\s+(?:singleton|void))|diamonds?)/i.test(token)) return "suit-diamond";
  if (token.includes("♥") || /(?:\dH$|^H(?:\s*\d|\s+(?:singleton|void))|hearts?)/i.test(token)) return "suit-heart";
  if (token.includes("♠") || /(?:\dS$|^S(?:\s*\d|\s+(?:singleton|void))|spades?)/i.test(token)) return "suit-spade";
  if (/\dNT$/i.test(token) || /^NT$/i.test(token)) return "suit-notrump";
  if (/\dX$/i.test(token)) return "suit-double";
  return "";
}

function formatBridgeToken(token) {
  const compact = token.match(/^([CDHS♣♦♥♠])\s*(\d+)(?:\s*(?:~|〜|-|–)\s*(\d+)|\s*(\+))?$/i);
  if (compact) {
    const suffix = compact[3] ? `–${compact[3]}` : compact[4] || "";
    return `${toSuitSymbol(compact[1])}${compact[2]}${suffix}`;
  }

  const written = token.match(/^(\d+\+?)\s*cards?\s+(Clubs?|Diamonds?|Hearts?|Spades?)$/i);
  if (written) return `${toSuitSymbol(written[2])}${written[1]}`;

  const shortShape = token.match(/^([CDHS♣♦♥♠])\s+(Singleton|Void)$/i);
  if (shortShape) return `${toSuitSymbol(shortShape[1])} ${shortShape[2].toLowerCase()}`;

  if (/^(?:Clubs?|Diamonds?|Hearts?|Spades?)$/i.test(token)) return toSuitSymbol(token);

  return token
    .replace(/(\d)C$/i, "$1♣")
    .replace(/(\d)D$/i, "$1♦")
    .replace(/(\d)H$/i, "$1♥")
    .replace(/(\d)S$/i, "$1♠");
}

function toSuitSymbol(value) {
  const normalized = String(value).trim().toUpperCase();
  if (normalized === "C" || normalized === "CLUB" || normalized === "CLUBS" || normalized === "♣") return "♣";
  if (normalized === "D" || normalized === "DIAMOND" || normalized === "DIAMONDS" || normalized === "♦") return "♦";
  if (normalized === "H" || normalized === "HEART" || normalized === "HEARTS" || normalized === "♥") return "♥";
  if (normalized === "S" || normalized === "SPADE" || normalized === "SPADES" || normalized === "♠") return "♠";
  return value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
