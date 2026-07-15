import assert from "node:assert/strict";
import fs from "node:fs";
import { SYSTEM_TIPS, findSystemTip } from "../assets/tips.js";

const appSource = fs.readFileSync(new URL("../assets/app.js", import.meta.url), "utf8");
const parserSource = appSource.slice(appSource.indexOf("function parseDocument"), appSource.indexOf("function buildTargetIndex"));
const { parseDocument } = new Function(`${parserSource}\nreturn { parseDocument };`)();

function parse(id) {
  return parseDocument(
    { id, label: id, title: id, subtitle: "", path: `Oklahoma/${id}/index.bml`, accent: "other" },
    fs.readFileSync(new URL(`../Oklahoma/${id}/index.bml`, import.meta.url), "utf8"),
  );
}

function collectTargets(documentData) {
  const targets = [];
  const visitNodes = (nodes, card) => {
    nodes.forEach((node) => {
      targets.push({
        id: node.id,
        kind: "response",
        text: node.text,
        label: node.contextText,
        documentId: card.documentId,
      });
      visitNodes(node.children, card);
    });
  };

  documentData.sections.forEach((section) => {
    section.blocks.forEach((card) => {
      targets.push({ id: card.id, kind: "card", text: card.title, label: card.title, documentId: card.documentId });
      visitNodes(card.nodes, card);
    });
  });
  return targets;
}

assert.equal(SYSTEM_TIPS.length, 6);
assert.equal(new Set(SYSTEM_TIPS.map((tip) => tip.id)).size, SYSTEM_TIPS.length, "Tip IDs must be unique");

const targets = ["1H", "1S", "2D", "competitive", "other"].flatMap((id) => collectTargets(parse(id)));
const matched = targets
  .map((target) => ({ target, tip: findSystemTip(target) }))
  .filter(({ tip }) => tip);
const countByTip = Object.fromEntries(
  SYSTEM_TIPS.map((tip) => [tip.id, matched.filter((item) => item.tip.id === tip.id).length]),
);

assert.deepEqual(countByTip, {
  "passed-hand-fsj-63": 6,
  "two-diamond-seat-shape": 1,
  "xyz-fast-slow": 1,
  "acol-crash": 1,
  "overcall-minor-six-other-major-four": 1,
  "good-bad-two-notrump": 1,
});

const content = JSON.stringify(SYSTEM_TIPS);
assert.doesNotMatch(content, /有効性は未検証/);
assert.doesNotMatch(content, /Ghestem|ゲシュテム/i);
assert.doesNotMatch(content, /20.{0,3}21HCP/);
assert.match(appSource, /renderSystemTip\(targetId\)/);
assert.match(appSource, /data-system-tip-toggle/);
assert.match(appSource, /mouseenter/);
assert.match(appSource, /positionSystemTip/);

console.log("system-tips tests passed");
