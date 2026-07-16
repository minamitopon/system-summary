import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("../assets/app.js", import.meta.url), "utf8");
const parserSource = appSource.slice(appSource.indexOf("function parseDocument"), appSource.indexOf("function buildTargetIndex"));
const { parseDocument } = new Function(`${parserSource}\nreturn { parseDocument };`)();

const tabIndented = parseDocument(
  { id: "tabs", label: "tabs", title: "tabs", subtitle: "", path: "Oklahoma/tabs/index.bml", accent: "other" },
  "Card\n\tChild\n\t\tGrandchild",
);
assert.equal(tabIndented.sections[0].blocks[0].nodes[0].text, "Child");
assert.equal(tabIndented.sections[0].blocks[0].nodes[0].children[0].text, "Grandchild");

function parse(id, file) {
  return parseDocument(
    { id, label: id, title: id, subtitle: "", path: `Oklahoma/${file}/index.bml`, accent: "other" },
    fs.readFileSync(new URL(`../Oklahoma/${file}/index.bml`, import.meta.url), "utf8"),
  );
}

function assertSourceLocations(document, file) {
  const sourceLines = fs
    .readFileSync(new URL(`../Oklahoma/${file}/index.bml`, import.meta.url), "utf8")
    .replace(/\r\n/g, "\n")
    .split("\n");

  function assertNodes(nodes) {
    nodes.forEach((node) => {
      assert.equal(node.path, document.path, `${file}: node path`);
      assert.ok(Number.isInteger(node.sourceLine), `${file}: node source line`);
      const sourceText = sourceLines[node.sourceLine - 1]?.trim().replace(/^[-–]\s*/, "");
      assert.equal(sourceText, node.text, `${file}:${node.sourceLine} node text`);
      assertNodes(node.children);
    });
  }

  document.sections.forEach((section) => {
    assert.equal(section.path, document.path, `${file}: section path`);
    assert.ok(Number.isInteger(section.sourceLine), `${file}: section source line`);
    section.items?.forEach((item) => {
      assert.equal(item.path, document.path, `${file}: topic path`);
      assert.ok(sourceLines[item.sourceLine - 1]?.includes(item.title), `${file}:${item.sourceLine} topic title`);
    });
    section.blocks.forEach((card) => {
      assert.equal(card.path, document.path, `${file}: card path`);
      assert.ok(Number.isInteger(card.sourceLine), `${file}: card source line`);
      const sourceTitle = sourceLines[card.sourceLine - 1]
        ?.trim()
        .replace(/^#{1,6}\s*/, "")
        .replace(/^[-–]\s*/, "");
      assert.equal(sourceTitle, card.title, `${file}:${card.sourceLine} card title`);
      assertNodes(card.nodes);
    });
  });
}

for (const opening of ["1C", "1D", "1H", "1S", "1NT", "2C", "2D", "2M", "2NT", "3NT"]) {
  const document = parse(opening, opening);
  assertSourceLocations(document, opening);
  assert.equal(document.sections.some((section) => section.title === "Summary"), false, opening);
  assert.equal(document.sections[0]?.title, "Overview", opening);
}

const competitive = parse("competitive", "competitive");
assertSourceLocations(competitive, "competitive");
assert.equal(competitive.sections[0].kind, "topic-index");
assert.equal(competitive.sections[0].items.length, 16);
assert.deepEqual(
  competitive.sections.slice(0, 4).map((section) => section.title),
  ["Topics", "1. 2-suiter 2NT OC", "2. Lebensohl & Rubensohl", "3. Good 2NT, Bad 2NT"],
);
assert.equal(competitive.sections.at(-3).title, "15. Negative Double");
assert.equal(competitive.sections.at(-2).title, "16. vs Preemptive");
assert.equal(competitive.sections.at(-1).title, "Overcall");
const vsPreemptive = competitive.sections.at(-2);
const normalizeNodeText = (node) => node.text.replace(/\s+/g, " ");
const normalizedChildren = (node) => node.children.map(normalizeNodeText);
const [vsTwoHeartsThreeClubs, , vsTwoSpadesThreeClubs] = vsPreemptive.blocks;
const heartsCatchAll = vsTwoHeartsThreeClubs.nodes.find((node) => normalizeNodeText(node).startsWith("3D catch all"));
const fourSpades = heartsCatchAll.children.find((node) => normalizeNodeText(node) === "3H S4");
assert.deepEqual(normalizedChildren(fourSpades), [
  "3S ask stopper",
  "4C S/T",
  "4D NAT",
  "4H S4, Good",
  "4S S4, NF",
]);
assert.deepEqual(normalizedChildren(fourSpades.children[0]), ["3NT have stopper"]);
const fiveSpades = vsTwoHeartsThreeClubs.nodes.find((node) => normalizeNodeText(node) === "3H S5+");
assert.deepEqual(normalizedChildren(fiveSpades), ["3S ask stopper", "4H S3+, Good", "4S S3+, NF"]);
assert.deepEqual(normalizedChildren(fiveSpades.children[0]), ["3NT have stopper"]);
const spadesCatchAll = vsTwoSpadesThreeClubs.nodes.find((node) => normalizeNodeText(node).startsWith("3D catch all"));
const fourHearts = spadesCatchAll.children.find((node) => normalizeNodeText(node) === "3H H4");
assert.deepEqual(normalizedChildren(fourHearts), ["3S ask stopper", "4C S/T", "4D H4, Good", "4H H4, NF"]);
assert.deepEqual(normalizedChildren(fourHearts.children[0]), ["3NT have stopper"]);
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
assertSourceLocations(other, "other");
assert.deepEqual(
  other.sections.map((section) => section.title),
  ["RKCB", "ノンシリアス3NT", "枚数が減った後のリード", "その他", "ACOL 4NT"],
);

const carding = parse("carding", "carding");
assertSourceLocations(carding, "carding");
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
