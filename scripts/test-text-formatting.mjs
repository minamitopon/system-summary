import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const source = fs.readFileSync(new URL("../assets/app.js", import.meta.url), "utf8");
const formatterSource = source.slice(source.indexOf("function decorateText"));
const { decorateText } = new Function(`${formatterSource}\nreturn { decorateText };`)();

function holdingTokens(value) {
  return [...decorateText(value).matchAll(/<span class="bid-token holding-token ([^"]+)"[^>]*>([^<]+)<\/span>/g)].map(
    ([, suitClass, label]) => ({ suitClass, label }),
  );
}

assert.deepEqual(holdingTokens("S4, H0 ~ 2"), [
  { suitClass: "suit-spade", label: "♠4" },
  { suitClass: "suit-heart", label: "♥0–2" },
]);

assert.deepEqual(holdingTokens("D6H0 ~ 2, INV"), [
  { suitClass: "suit-diamond", label: "♦6" },
  { suitClass: "suit-heart", label: "♥0–2" },
]);

assert.deepEqual(holdingTokens("C5D4, H4+"), [
  { suitClass: "suit-club", label: "♣5" },
  { suitClass: "suit-diamond", label: "♦4" },
  { suitClass: "suit-heart", label: "♥4+" },
]);

assert.deepEqual(holdingTokens("S Singleton; 5+ cards Hearts"), [
  { suitClass: "suit-spade", label: "♠ singleton" },
  { suitClass: "suit-heart", label: "♥5+" },
]);

const neutral = decorateText("18 - 19HCP, 33(43)");
assert.equal(neutral.includes("holding-token"), false);

const bid = decorateText("1H");
assert.match(bid, /class="bid-token suit-heart">1♥<\/span>/);

const goodBadTwoNt = decorateText("Good 2NT, Bad 2NT");
assert.deepEqual(holdingTokens("Good 2NT, Bad 2NT"), []);
assert.equal(goodBadTwoNt.replace(/<[^>]+>/g, ""), "Good 2NT, Bad 2NT");

const otherMajor = decorateText("Cue No OM");
assert.match(otherMajor, />OM<\/span>/);
assert.doesNotMatch(otherMajor, /<small>other major<\/small>/i);

for (const prose of ["Cards 2NT", "Methods 3NT", "Lebensohl 2NT"]) {
  assert.deepEqual(holdingTokens(prose), [], prose);
}

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const bmlFiles = fs
  .readdirSync(path.join(repositoryRoot, "Oklahoma"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(repositoryRoot, "Oklahoma", entry.name, "index.bml"))
  .filter((file) => fs.existsSync(file));

for (const file of bmlFiles) {
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const formatted = decorateText(line);
    const outsideSuitTokens = formatted.replace(/<span class="bid-token[^>]*>.*?<\/span>/g, "");
    assert.doesNotMatch(outsideSuitTokens, /[CDHS♣♦♥♠]\s*\d+\s*(?:~|〜|-|–)\s*\d+/i, `${file}: ${line}`);
  }
}

console.log("text-formatting tests passed");
