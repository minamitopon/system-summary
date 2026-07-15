export const SYSTEM_TIPS = [
  {
    id: "passed-hand-fsj-63",
    title: "パストハンドのFSJが63の理由",
    paragraphs: [
      "通常のFSJはサイド5枚＋切札4枚だが、パストハンドではサイド6枚＋切札3枚を使う。",
      "ゲームだけなら4枚サポートはDrury経由で足りる。スラムを考える場合は、切札の4枚目よりサイドスートの6枚目が価値を持ちやすい。また3rd/4th seatの1Mは4枚の場合があり、3枚サポートでもサイド6枚を切札にして適切なコントラクトになり得る。",
      "オーバーコール後のFSJは通常どおり54。",
    ],
    targets: [
      { documentId: "1H", kind: "response", labelStartsWith: "P - 1H ; 2S S6H3, INV" },
      { documentId: "1H", kind: "response", labelStartsWith: "P - 1H ; 2NT C6H3, INV" },
      { documentId: "1H", kind: "response", labelStartsWith: "P - 1H ; 3D D6H3, INV" },
      { documentId: "1S", kind: "response", labelStartsWith: "P - 1S ; 2NT C6S3, INV" },
      { documentId: "1S", kind: "response", labelStartsWith: "P - 1S ; 3D D6S3, INV" },
      { documentId: "1S", kind: "response", labelStartsWith: "P - 1S ; 3H H6S3, INV" },
    ],
  },
  {
    id: "two-diamond-seat-shape",
    title: "2♦の長いメジャーをseatで逆にする理由",
    paragraphs: [
      "2♦はどのseatでも両メジャー4枚以上。1st/2ndは♥≧♠で♥5枚以上、3rd/4thは♥≦♠で♠5枚以上を保証する。",
      "1st/2ndは未passのパートナーとゲームも含む建設的なオークションを行うため、形を明確にして2NTのshape askや3mのFGで進める。3rd/4thはpassed handでゲーム期待が低く、競り合いで強いboss majorの♠を優先する。",
      "♠5♥4を常に除外するのではなく、seatによって採用する向きを逆転している。",
    ],
    targets: [{ documentId: "2D", kind: "card", textEquals: "2D" }],
  },
  {
    id: "xyz-fast-slow",
    title: "XYZの直接／リレー経由の考え方",
    paragraphs: [
      "行き先が決まっている手は最短経路で直接ビッドし、行き先が複数ある手はリレーを経由する、という考え方を基本にしている。",
      "直接の2NTはクラブを持たないINV。2C→2D→2NTはクラブ5枚を持ち、2NTと3Cの両方を候補にできるINVとなる。",
    ],
    targets: [{ documentId: "competitive", kind: "card", textStartsWith: "1C - 1X;" }],
  },
  {
    id: "acol-crash",
    title: "Acol 4NTでCRASH型を使う理由",
    paragraphs: [
      "以前は6Cが単に「Aが2枚」だった。しかし、Aが2枚あることだけでは足りない状況では、結局どの2枚なのかが必要になり、枚数だけの回答は機能しない。",
      "そこで2枚のAはCRASH型にして、6C＝同色、6D＝同ランク、6H＝同形で区別する。",
    ],
    targets: [{ documentId: "other", kind: "card", textEquals: "4NT -" }],
  },
  {
    id: "overcall-minor-six-other-major-four",
    title: "2NTでm6＋OM4を示す理由",
    paragraphs: [
      "マイナー同士はゲームの台が同じなので、6枚マイナーを示せば判断できることが多い。一方、マイナーとother majorではゲームの難易度・行き先が異なるため、OM4を明示する価値が高い。",
      "そのため、(1M)－2m－(2M)－P；(P)－2NTは、ビッドしたmが6枚＋OM4を示す。",
    ],
    targets: [{ documentId: "competitive", kind: "response", textStartsWith: "2NT m6OM4" }],
  },
  {
    id: "good-bad-two-notrump",
    title: "Good / Bad 2NTの判定基準",
    paragraphs: [
      "2NTをBadとして使うかどうかは、Good handを通常のジャンプサポート／ジャンプリビッドで表現できるかが基準。",
      "レスポンダーがジャンプリビッドできない状況では2NTをBad、3XをGoodとして使う。INVはDoubleに含められるため、2NTにINVを残す必要がない。",
    ],
    targets: [{ documentId: "competitive", kind: "card", textIncludes: "Bad 2NT(by Responder)" }],
  },
];

export function findSystemTip(target) {
  if (!target) return null;
  return (
    SYSTEM_TIPS.find((tip) => tip.targets.some((selector) => matchesTarget(target, selector))) || null
  );
}

function matchesTarget(target, selector) {
  if (selector.documentId && selector.documentId !== target.documentId) return false;
  if (selector.kind && selector.kind !== target.kind) return false;

  const text = normalizeMatchText(target.text);
  const label = normalizeMatchText(target.label);
  if (selector.textEquals && text !== normalizeMatchText(selector.textEquals)) return false;
  if (selector.textStartsWith && !text.startsWith(normalizeMatchText(selector.textStartsWith))) return false;
  if (selector.textIncludes && !text.includes(normalizeMatchText(selector.textIncludes))) return false;
  if (selector.labelStartsWith && !label.startsWith(normalizeMatchText(selector.labelStartsWith))) return false;
  return true;
}

function normalizeMatchText(value) {
  return String(value || "")
    .toUpperCase()
    .replaceAll("♣", "C")
    .replaceAll("♦", "D")
    .replaceAll("♥", "H")
    .replaceAll("♠", "S")
    .replace(/[^A-Z0-9]/g, "");
}
