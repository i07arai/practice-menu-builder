# 二小クラブスケジューラ（スマホ向け・JPG出力）
このプロジェクトは、二小クラブのスケジュールやメニューを簡単に作成・管理できるツールです。
- **JPG出力（1080×1920）**が可能
- **名簿からメンバーを選択**してメニュー候補を自動表示
- **ポジション別人数入力**にも対応

## 主な機能

### 1. 名簿入力モード（推奨）
- `config/member-config.json` で管理されたメンバーから参加者を選択
- 選択されたメンバーのポジション情報から、実施可能なメニュー候補が自動表示されます
- ポジション情報：
  - **メインポジション**: P（投手）、IF（内野）、OF（外野）、null（未設定）
  - **サブポジション**: 複数ポジション対応可能（例: IFができる外野手）
  - **属性**: キャッチャー可能、ピッチャー練習中など

### 2. ポジション別人数入力モード
- P（投手）、IF（内野）、OF（外野）の人数を直接入力
- 人数条件に応じて実施可能なメニューが表示されます

### 3. スケジュール作成
- メニューを選択 → レーンを選択 → 開始時刻/所要時間を指定
- スケジュールにブロックが追加されます
- ✎から「その他1/その他2」の**レーン名を変更**できます（例：投手、守備）

### 4. JPG出力
- 「JPGとして出力」ボタンで現在のスケジュールを画像保存（1080×1920）

## 画面説明
- `public/index.html` または `index.html` を開くと、メニュー選択＋タイムスケジュール編集ができます
- 上部で「名簿入力」または「ポジション別人数入力」を選択できます
- メニューカードには必要な人数条件が表示されます（例: 投1+ / 計9+）

## 設定ファイル

### メンバー設定（`config/member-config.json`）
メンバー名簿を管理します。以下の情報を設定できます：
- `name`: 表示名
- `position`: メインポジション（P/IF/OF/null）
- `subPositions`: サブポジション（配列）
- `role`: 役割（player=選手、support=サポート要員）
- `isOver40`: 40歳以上かどうか
- `attributes`: 追加属性
  - `romanName`: ローマ字名
  - `canCatch`: キャッチャー可能
  - `isPitcherTraining`: ピッチャー練習中
  - `skill`: 得意分野
  - `notes`: 備考

### メニュー設定（`config/menus-config.json`）
練習メニューを定義します。以下の情報を設定できます：
- `name`: メニュー名
- `category`: カテゴリ（warmup/batting/fielding/pitching/other）
- `durationDefaultMin`: デフォルト所要時間（分）
- `conditions`: 実施に必要な人数条件
  - `minP`: 投手の最小人数
  - `minIF`: 内野の最小人数
  - `minOF`: 外野の最小人数
  - `minTotal`: 全体の最小人数
  - `minPlusIF`: 投手+内野の最小人数

## ディレクトリ構成
```
public/                      # HTML（UI本体）
styles/                      # CSS（モバイルファースト）
config/                      # 設定ファイル
  member-config.json         # メンバー名簿
  menus-config.json          # メニュー定義
src/app/
  main.js                    # エントリーポイント
  logic/
    roster.js                # 名簿管理
    menus.js                 # メニュー定義＆人数条件評価
  ui/
    menuPanel.js             # メニュー一覧UI
    scheduleView.js          # スケジュールUI
  utils/
    state.js                 # 状態管理
    exporter.js              # JPG出力（Canvas描画）
```

## ローカルでの動かし方
1. ファイルを任意のフォルダに配置
2. HTTPサーバを起動（モジュール読み込みのため必須）
   ```bash
   python server.py
   # http://localhost:8080 を開く
   ```
   または
   ```bash
   python -m http.server 8080
   # http://localhost:8080/public/index.html を開く
   ```

## GitHub Pagesでの公開
本プロジェクトはGitHub Pagesで公開されています：
https://i07arai.github.io/practice-menu-builder/

## 既知の仕様/制限
- ブロックのドラッグ＆ドロップ移動は未実装（追加/再編集で調整）
- 休憩提案・人数過密チェックは**オフ**（要件通り）
- JPGは**簡易描画**。見た目はCSSと若干異なる場合があります（視認性重視）

## 拡張のヒント
- **メンバー追加**: `config/member-config.json` を編集
- **メニュー追加**: `config/menus-config.json` を編集
- レーン名変更は `state.renameLane()` / `state.resetLaneName()` を利用
- 画面比をA4向けにしたい場合は、`exporter.js` の `width/height` を差し替えます

## 開発情報
- **言語**: HTML/CSS/JavaScript (ES6 Modules)
- **総行数**: 約2,500行（JS: 1,412行、CSS: 159行、HTML: 901行）
- **エンコーディング**: UTF-8 (BOM無し)

