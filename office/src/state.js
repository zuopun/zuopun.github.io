export const PEOPLE = [
  ["zz", "ZZ", "左左的 KOL 營運、發文", "#9e83b4", "hood"],
  ["owl", "OWL 營運", "OWL 推廣策略", "#e9e4cf", "owl"],
  ["design", "圖像設計", "配圖、角色一致性", "#d89779", "beret"],
  ["check", "查核", "數據與事實查核", "#8eaa8a", "glasses"],
  ["market", "市場研究", "美股、加密、總經", "#718f9c", "vest"],
  ["square", "廣場營運", "交易所廣場總編輯", "#b89b72", "cap"],
  ["zuno", "ZUNO 工程", "工程師", "#7999a3", "hood"],
  ["fo", "FO", "FoChat 公告", "#c18c9a", "suit"],
  ["gs", "Golden Stillnes", "YouTube 聲音頻道", "#c8ae67", "headphones"],
  ["lena", "Lena", "影片製作", "#819b83", "camera"],
  ["wild", "荒野", "荒野童軍團", "#b0a375", "scout"],
  ["bob", "Bob", "OWL 成員帳號", "#8799b2", "jacket"],
  ["lan", "Lan", "OWL 成員帳號", "#c99d9c", "knit"],
].map(([id, name, role, color, style]) => ({ id, name, role, color, style }));
export function normalizeStatus(data) {
  const valid =
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    data.bots &&
    typeof data.bots === "object" &&
    !Array.isArray(data.bots);
  return Object.fromEntries(
    PEOPLE.map(({ id }) => {
      const entry = valid ? data.bots[id] : null;
      const state = ["working", "idle", "waiting"].includes(entry?.state)
        ? entry.state
        : "idle";
      return [
        id,
        {
          state,
          note: typeof entry?.note === "string" ? entry.note.slice(0, 240) : "",
        },
      ];
    }),
  );
}
