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

for (const opening of ["1C", "1D", "1H", "1S", "1NT", "2C", "2D", "2M", "2NT", "3NT"]) {
  const document = parse(opening, opening);
  assert.equal(document.sections.some((section) => section.title === "Summary"), false, opening);
  assert.equal(document.sections[0]?.title, "Overview", opening);
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
  ["2-1 Lebensohl", "Situation", "2NT Pup to 3C", "2-2 Rubensohl", "Situation", "Responses"],
);
const rubensohlResponses = competitive.sections[2].blocks.at(-1).nodes;
assert.deepEqual(
  rubensohlResponses.map((node) => node.text),
  [
    "2NT TRF, Clubs",
    "3C  TRF, Diamonds",
    "3D  TRF, Hearts",
    "3H  TRF, Spades",
    "3NT Play",
    "Relay to Opponents's suit asks M4.",
  ],
);
assert.ok(rubensohlResponses.every((node) => node.depth === 0), "Rubensohl calls must share one level");

assert.deepEqual(
  competitive.sections[3].blocks.map((block) => block.title),
  ["3-1 Good 2NT", "Situation", "Responses", "3-2 Bad 2NT(by Responder)", "Situation", "Responses"],
);
const [good2NT, bad2NT] = competitive.sections[3].blocks.filter((block) => block.title === "Responses");
assert.deepEqual(good2NT.nodes.map((node) => node.text), ["2NT Good", "3X  Bad"]);
assert.deepEqual(bad2NT.nodes.map((node) => node.text), ["2NT Bad", "3X  Good"]);
assert.ok([...good2NT.nodes, ...bad2NT.nodes].every((node) => node.depth === 0), "Good/Bad 2NT calls must share one level");

const competitiveOneNT = competitive.sections.find((section) => section.topicNumber === "6");
assert.deepEqual(
  competitiveOneNT.blocks.map((block) => block.title),
  [
    "6-1 vs Multi Landy",
    "1NT - (X) -",
    "1NT - (2C/D = Ms) -",
    "1NT - (2C/2D = 1M) -",
    "6-2 vs 1NT Overcall",
    "1X - (1NT) -",
    "6-3 Our defense vs 1NT",
    "(1NT) - X - (P) -",
    "(1NT) - 2m - (P) -",
    "(1NT) - 2M - (P) -",
  ],
);
for (const subheading of ["6-1 vs Multi Landy", "6-2 vs 1NT Overcall", "6-3 Our defense vs 1NT"]) {
  assert.equal(competitiveOneNT.blocks.find((block) => block.title === subheading).nodes.length, 0, `${subheading}: subheading`);
}
const twoMinorOvercall = competitiveOneNT.blocks.find((block) => block.title === "(1NT) - 2m - (P) -");
const minorShapeAsk = twoMinorOvercall.nodes.find((node) => node.text.startsWith("2NT"));
const minimumRelay = minorShapeAsk.children.find((node) => node.text.startsWith("3C"));
const minimumShapes = minimumRelay.children.find((node) => node.text.startsWith("3D")).children;
assert.deepEqual(minimumShapes.map((node) => node.text), [
  "3H  m4H5, min",
  "3S  m5H5, min",
  "3NT m5H6, min",
  "4C  m6H5, min",
]);
assert.ok(minorShapeAsk.children.slice(1).every((node) => node.text.endsWith("max")), "Direct shape responses must remain max");

const xyz = competitive.sections.find((section) => section.topicNumber === "13");
assert.deepEqual(xyz.blocks.map((block) => block.title), ["1C - 1X; 1Y - ?", "P - 1X; 1Y - 1NT; ?"]);
const negativeDouble = competitive.sections.find((section) => section.topicNumber === "15");
assert.equal(negativeDouble.blocks[0].title, "1m - (PRE) - X - (P); any - (P) - ?");
const overcall = competitive.sections.find((section) => section.title === "Overcall");
assert.equal(overcall.blocks[0].title, "(1M) - 2m - (2M) - P; (P) - ?");
assert.deepEqual(overcall.blocks[0].nodes.map((node) => node.text), ["2NT m6OM4"]);

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
assert.ok(
  other.sections
    .find((section) => section.title === "RKCB")
    .blocks.some(
      (card) =>
        card.title ===
        "WK2に対するRKCBは01122（0 key / 1 key, Qなし / 1 key, Qあり / 2 key, Qなし / 2 key, Qあり）",
    ),
  "Other: WK2 RKCB must document all 01122 steps",
);
assert.ok(
  other.sections
    .find((section) => section.title === "その他")
    .blocks.some(
      (card) =>
        card.title ===
        "NTオープンに2スーターFGをかけてゲーム未満でフィットが示せない時、下のcueがゲームの台が低いスートのS/T、上のcueがゲームの台が高いスートのS/Tとみなす",
    ),
  "Other: two-suiter cue agreement must be complete",
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

function findNode(nodes, prefix) {
  return nodes.find((node) => node.text.startsWith(prefix));
}

for (const [opening, cardTitle, askingBid, expectedSteps] of [
  ["1H", "1H - 3C;", "3D", ["3H  11 - 12HCP", "3S  13 - 14HCP", "3NT 15 - 17HCP"]],
  ["1S", "1S - 3D;", "3H", ["3S  11 - 12HCP", "3NT 13 - 14HCP", "4C  15 - 17HCP"]],
]) {
  const document = parse(opening, opening);
  const detail = document.sections.find((section) => section.title === "Detail");
  const card = detail.blocks.find((block) => block.title === cardTitle);
  const steps = findNode(card.nodes, askingBid).children.slice(0, 3).map((node) => node.text);
  assert.deepEqual(steps, expectedSteps, `${opening}: HCP steps must not overlap`);
}

for (const [opening, cardTitle, voidBid, askingBid] of [
  ["1H", "P - 1H", "3S", "3NT"],
  ["1S", "P - 1S", "3NT", "4C"],
]) {
  const document = parse(opening, opening);
  const section = document.sections.find((item) => item.title === "In 3rd/4th seat");
  const card = section.blocks.find((item) => item.title === cardTitle);
  const drury = findNode(card.nodes, "2C");
  const relay = findNode(drury.children, "2D");
  const voidResponse = findNode(relay.children, voidBid);
  assert.ok(findNode(voidResponse.children, askingBid), `${opening}: asking bid must remain under any Void`);
}

for (const opening of ["1H", "1S"]) {
  const document = parse(opening, opening);
  const memoCards = document.sections.flatMap((section) => section.blocks).filter((card) => /^System (?:ON|OFF)$/.test(card.title));
  assert.deepEqual(memoCards[0].nodes.map((node) => node.text), [
    `P - ${opening}; 1NT - any`,
    "system on over 1NT(6 - 12HCP)",
  ]);
  assert.deepEqual(memoCards[1].nodes.map((node) => node.text), [
    `${opening} - (X) - 1NT - (P); any`,
    "system off over 1NT(8 - 10HCP)",
  ]);
}

const oneNT = parse("1NT", "1NT");
const oneNTIntervention = oneNT.sections.find((section) => section.title === "vs intervention");
assert.deepEqual(
  oneNTIntervention.blocks.map((card) => card.title),
  ["1NT - 2C -(X)", "1NT - 2S -(X)"],
);

const twoClubDoubled = oneNTIntervention.blocks[0];
const passAfterTwoClubs = findNode(twoClubDoubled.nodes, "Pass");
assert.deepEqual(passAfterTwoClubs.children.map((node) => node.text), [
  "XX  pup to 2D",
  "2R  TRF, INV, guard your honor",
  "2NT~ system on",
]);
const twoDiamondRelay = findNode(findNode(passAfterTwoClubs.children, "XX").children, "2D");
assert.deepEqual(twoDiamondRelay.children.map((node) => node.text), ["Pass play", "2M  INV, guard my honor"]);
assert.ok(findNode(twoClubDoubled.nodes, "XX   play"), "1NT-2C-(X): XX play must remain a direct call");

const twoSpadesDoubled = oneNTIntervention.blocks[1];
const passAfterTwoSpades = findNode(twoSpadesDoubled.nodes, "Pass");
assert.deepEqual(passAfterTwoSpades.children.map((node) => node.text), ["XX  w/o stoper", "2NT w/ stoper"]);
const redoubleAfterTwoSpades = findNode(passAfterTwoSpades.children, "XX");
assert.deepEqual(redoubleAfterTwoSpades.children.map((node) => node.text), ["2NT NF", "3m  NF", "4m  Good hands"]);
assert.deepEqual(twoSpadesDoubled.nodes.slice(1).map((node) => node.text), ["2NT  w/ stoper", "3C   w/ stoper"]);

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
