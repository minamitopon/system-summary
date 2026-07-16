import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("../assets/app.js", import.meta.url), "utf8");
const helperSource = appSource.slice(
  appSource.indexOf("function hasDocumentPreviewChanges"),
  appSource.indexOf("function renderNavigation"),
);
const state = {
  previewChanges: new Map([["Oklahoma/other/index.bml", new Set([12])]]),
  openCards: new Set(),
};
const helpers = new Function(
  "state",
  "escapeHtml",
  `${helperSource}\nreturn { hasDocumentPreviewChanges, isPreviewChanged, nodeHasPreviewChanges, cardHasPreviewChanges, sectionHasPreviewChanges, renderPreviewChangeBadge };`,
)(state, (value) => String(value));

const changedLeaf = {
  path: "Oklahoma/other/index.bml",
  sourceLine: 12,
  text: "3D accept",
  children: [],
};
const changedCard = {
  id: "other-0-0",
  path: "Oklahoma/other/index.bml",
  sourceLine: 10,
  title: "2way Game Try",
  nodes: [changedLeaf],
};

assert.equal(helpers.hasDocumentPreviewChanges(changedCard.path), true);
assert.equal(helpers.isPreviewChanged(changedCard), false);
assert.equal(helpers.isPreviewChanged(changedLeaf), true);
assert.equal(helpers.cardHasPreviewChanges(changedCard), true);
assert.equal(helpers.sectionHasPreviewChanges({ path: changedCard.path, sourceLine: 9, blocks: [changedCard] }), true);

const renderCardSource = appSource.slice(appSource.indexOf("function renderCard"), appSource.indexOf("function renderExpandedCard"));
const renderCard = new Function(
  "state",
  "cardHasPreviewChanges",
  "isPreviewChanged",
  "renderPreviewChangeBadge",
  "decorateText",
  "renderInlineActions",
  "renderComments",
  "renderCommentCount",
  "renderTopResponse",
  `${renderCardSource}\nreturn renderCard;`,
)(
  state,
  helpers.cardHasPreviewChanges,
  helpers.isPreviewChanged,
  helpers.renderPreviewChangeBadge,
  (value) => value,
  () => "",
  () => "",
  () => "",
  () => "",
);

const changedHtml = renderCard(changedCard, { accent: "other" });
assert.match(changedHtml, /pr-change-container/);
assert.match(changedHtml, /変更あり/);
assert.match(changedHtml, /\sopen>/);

const unchangedHtml = renderCard(
  {
    ...changedCard,
    id: "other-0-1",
    sourceLine: 30,
    nodes: [{ ...changedLeaf, sourceLine: 31 }],
  },
  { accent: "other" },
);
assert.doesNotMatch(unchangedHtml, /pr-change-container|\sopen>/);

console.log("preview-rendering tests passed");
