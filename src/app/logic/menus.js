
// メニュー定義を設定ファイルから読み込み
let MENUS = [];
let configLoaded = false;

// 設定ファイルを読み込む
async function loadMenuConfig() {
  if (configLoaded) return MENUS;
  
  try {
    // 常に相対パスを使用（GitHub Pages対応）
    const basePath = './config/menus-config.json';
    const response = await fetch(basePath);
    const config = await response.json();
    
    // 条件オブジェクトをcondition関数に変換
    MENUS = config.menus.map(menu => ({
      ...menu,
      condition: (c) => {
        const cond = menu.conditions;
        const total = (c.P || 0) + (c.IF || 0) + (c.OF || 0);
        
        // 各条件をチェック
        if (cond.minP && c.P < cond.minP) return false;
        if (cond.minIF && c.IF < cond.minIF) return false;
        if (cond.minOF && c.OF < cond.minOF) return false;
        if (cond.minTotal && total < cond.minTotal) return false;
        if (cond.minPlusIF && (c.P + c.IF) < cond.minPlusIF) return false;
        
        return true;
      }
    }));
    
    configLoaded = true;
    return MENUS;
  } catch (error) {
    console.error('設定ファイルの読み込みに失敗しました:', error);
    // フォールバック：デフォルトのメニュー
    MENUS = getDefaultMenus();
    configLoaded = true;
    return MENUS;
  }
}

// デフォルトのメニュー（設定ファイルが読み込めない場合のフォールバック）
function getDefaultMenus() {
  return [
    { id:'warmup', name:'アップ', categoryShort:'ｱｯﾌﾟ', category:'warmup', durationDefaultMin:15, condition: (c) => total(c) >= 1 },
    { id:'all_knock', name:'全体ノック', categoryShort:'守', category:'fielding', durationDefaultMin:30, condition: (c) => total(c) >= 4 },
    { id:'free_batting', name:'フリーバッティング', categoryShort:'打', category:'batting', durationDefaultMin:60, condition: (c) => c.P >= 1 && total(c) >= 9 },
    { id:'tee_batting', name:'ティーバッティング', categoryShort:'打', category:'batting', durationDefaultMin:30, condition: (c) => total(c) >= 2 },
    { id:'infield_knock', name:'内野ノック', categoryShort:'守', category:'fielding', durationDefaultMin:30, condition: (c) => (c.P + c.IF) >= 3 && total(c) >= 6 },
    { id:'outfield_knock', name:'外野ノック', categoryShort:'守', category:'fielding', durationDefaultMin:30, condition: (c) => c.OF >= 3 && total(c) >= 6 },
    { id:'pitching', name:'ピッチング練習', categoryShort:'投', category:'pitching', durationDefaultMin:30, condition: (c) => c.P >= 1 && total(c) >= 4 },
    { id:'pepper', name:'ゴロペッパー', categoryShort:'守', category:'fielding', durationDefaultMin:15, condition: (c) => total(c) >= 2 }
  ];
}

// 初期化時にMENUSを設定（同期的にアクセスできるようにデフォルト値を設定）
MENUS = getDefaultMenus();

export { MENUS, loadMenuConfig };

export function isEligible(menu, counts) {
  try { return !!menu.condition(counts); } catch(e) { return false; }
}

export function total(c) { return (c.P||0) + (c.IF||0) + (c.OF||0); }
