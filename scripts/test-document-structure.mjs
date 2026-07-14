import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("../assets/app.js", import.meta.url), "utf8");
const parserSource = appSource.slice(appSource.indexOf("function parseDocument"), appSource.indexOf("function buildTargetIndex"));
const { parseDocument } = new Function(`${parserSource}\nreturn { parseDocument };`)();

function parse(id, file) {
  return parseDocument(
    { id, label: id, title: id, subtitle: "", path: `Oklahoma/${file}/index.bml`, accent: "other" },
    fs.readFileSync(new URL(`../Oklahoma/${file}/index.bml`, import.meta.url), "utf8"),
  );
}

const competitive = parse("competitive", "competitive");
assert.equal(competitive.sections[0].kind, "topic-index");
assert.equal(competitive.sections[0].items.length, 15);
assert.deepEqual(
  competitive.sections.slice(0, 4).map((section) => section.title),
  ["Topics", "1. 2-suiter 2NT OC", "2. Lebensohl & Rubensohl", "3. Good 2NT, Bad 2NT"],
);
assert.equal(competitive.sections.at(-2).title, "15. Negative Double");
assert.equal(competitive.sections.at(-1).title, "Overcall");
assert.deepEqual(
  competitive.sections[2].blocks.map((block) => block.title),
  ["2-1 Lebensohl", "Situation", "2NT Pup to 3C", "2-2 Rubensohl", "Situation", "2NT TRF, Clubs"],
);

const competitiveRenderBranch = appSource.slice(
  appSource.indexOf("function renderSection"),
  appSource.indexOf("function renderTopicIndex"),
);
assert.match(competitiveRenderBranch, /documentData\.id === "competitive"/);
assert.match(competitiveRenderBranch, /renderExpandedCard\(card, documentData\)/);

const expandedCardSource = appSource.slice(
  appSource.indexOf("function renderExpandedCard"),
  appSource.indexOf("function renderTopResponse"),
);
assert.match(expandedCardSource, /renderDescendants\(card\.nodes, 0, card\.title\)/);
assert.doesNotMatch(expandedCardSource, /<details|<summary/);

const other = parse("other", "other");
assert.deepEqual(
  other.sections.map((section) => section.title),
  ["RKCB", "ノンシリアス3NT", "枚数が減った後のリード", "その他", "ACOL 4NT"],
);

const carding = parse("carding", "carding");
assert.deepEqual(carding.sections.map((section) => section.title), ["Memo"]);

const sectionOrderSource = appSource.slice(
  appSource.indexOf("function isOpeningDocument"),
  appSource.indexOf("function renderSection"),
);
const { getSectionsInDisplayOrder } = new Function(
  `${sectionOrderSource}\nreturn { getSectionsInDisplayOrder };`,
)();

for (const opening of ["1C", "1H", "1S"]) {
  const document = parse(opening, opening);
  const titles = getSectionsInDisplayOrder(document).map((section) => section.title);
  const expected = ["Summary", "Overview", "Detail", "In 3rd/4th seat", "vs intervention"].filter((title) =>
    titles.includes(title),
  );
  assert.deepEqual(titles, expected, opening);
}

const documentBodySource = appSource.slice(
  appSource.indexOf("function renderDocumentBody"),
  appSource.indexOf("function isOpeningDocument"),
);
assert.match(documentBodySource, /sections\.flatMap\(\(section\) => section\.blocks\.filter\(isSystemMemo\)\)/);
assert.match(documentBodySource, /renderedSections.*renderMemoSection\(memoBlocks\)/s);

const normalizeSource = appSource.slice(appSource.indexOf("function normalizeAuction"), appSource.indexOf("function walkNodes"));
const referenceSource = appSource.slice(
  appSource.indexOf("function renderConventionReference"),
  appSource.indexOf("function renderInlineActions"),
);
const { renderConventionReference } = new Function(
  `${normalizeSource}\n${referenceSource}\nreturn { renderConventionReference };`,
)();

assert.match(renderConventionReference("1C - 1D;", "1H  H3"), /competitive-topic-13/);
assert.match(renderConventionReference("1C - 1D;", "1S  S4"), /competitive-topic-13/);
assert.match(renderConventionReference("1C - 1D;", "1NT NF"), /competitive-topic-13/);
assert.match(renderConventionReference("1C - 1H;", "1S  S3"), /competitive-topic-13/);
assert.match(renderConventionReference("1C - 1H;", "1NT NF"), /competitive-topic-13/);
assert.match(renderConventionReference("1C - 1S;", "1NT NF"), /competitive-topic-13/);
assert.equal(renderConventionReference("1C - 1S;", "2C NF"), "");

console.log("document-structure tests passed");
