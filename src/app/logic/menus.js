
// メニュー定義（カテゴリ略号：投／守／打／ｱｯﾌﾟ）
export const MENUS = [
  { id:'warmup', name:'アップ', categoryShort:'ｱｯﾌﾟ', durationDefaultMin:15, condition: (c) => total(c) >= 1 },
  { id:'all_knock', name:'全体ノック', categoryShort:'守', durationDefaultMin:30, condition: (c) => total(c) >= 4 },
  { id:'free_batting', name:'フリーバッティング', categoryShort:'打', durationDefaultMin:60, condition: (c) => c.P >= 1 && total(c) >= 9 },
  { id:'tee_batting', name:'ティーバッティング', categoryShort:'打', durationDefaultMin:30, condition: (c) => total(c) >= 2 },
  { id:'infield_knock', name:'内野ノック', categoryShort:'守', durationDefaultMin:30, condition: (c) => (c.P + c.IF) >= 3 && total(c) >= 6 },
  { id:'outfield_knock', name:'外野ノック', categoryShort:'守', durationDefaultMin:30, condition: (c) => c.OF >= 3 && total(c) >= 6 },
  { id:'pitching', name:'ピッチング練習', categoryShort:'投', durationDefaultMin:30, condition: (c) => c.P >= 1 && total(c) >= 4 },
  { id:'pepper', name:'ゴロペッパー', categoryShort:'守', durationDefaultMin:15, condition: (c) => total(c) >= 2 }
];

export function isEligible(menu, counts) {
  try { return !!menu.condition(counts); } catch(e) { return false; }
}

export function total(c) { return (c.P||0) + (c.IF||0) + (c.OF||0); }
