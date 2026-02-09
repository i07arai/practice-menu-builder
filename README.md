
 二小クラブスケジューラ（スマホ向け・JPG出力）
 このプロジェクトは、二小クラブのスケジュールやメニューを簡単に作成・管理できるツールです。
- **JPG出力（1080×1920）**が可能

## 画面説明
- `public/index.html` を開くと、メニュー選択＋タイムスケジュール編集ができます。
- メニューを選ぶ → レーンを選択 → 開始時刻/所要時間を指定 → スケジュールにブロックが追加されます。
- ✎から「その他1/その他2」の**レーン名を変更**できます（例：投手、守備）。
- 「JPGとして出力」ボタンで現在のスケジュールを画像保存できます。

## ディレクトリ構成（役割別）
```
public/               # HTML（UI本体）
styles/               # CSS（モバイルファースト）
src/app/main.js       # エントリーポイント
src/app/utils/state.js# 状態管理＆直近の未来の日曜計算
src/app/utils/exporter.js # JPG出力（Canvas描画）
src/app/logic/menus.js# メニュー定義＆人数条件評価
src/app/ui/menuPanel.js   # メニュー一覧UI（候補表示/追加）
src/app/ui/scheduleView.js# スケジュールUI（レーン選択/時間選択/描画）
assets/icons/         # 画像やアイコン（必要に応じて）
```

## ローカルでの動かし方
1. ファイルを任意のフォルダに配置。
2. ブラウザで `public/index.html` を開く。
   - もしモジュール読み込みに制約がある場合は、簡易HTTPサーバを使ってください。
   - 例（Python）：
     ```bash
     python -m http.server 8080
     # http://localhost:8080/public/index.html を開く
     ```

## 既知の仕様/制限
- ブロックのドラッグ＆ドロップ移動は未実装（追加/再編集で調整）
- 休憩提案・人数過密チェックは**オフ**（要件通り）
- JPGは**簡易描画**。見た目はCSSと若干異なる場合があります（視認性重視）

## 追記・拡張のヒント
- **メニュー設定は `config/position-config.json` で編集可能**
  - メニュー名、所要時間、人数条件などをJSONファイルで簡単に変更できます
  - 条件の設定方法：
    - `minP`: 投手の最小人数
    - `minIF`: 内野の最小人数
    - `minOF`: 外野の最小人数
    - `minTotal`: 全体の最小人数
    - `minPlusIF`: 投手+内野の最小人数
- レーン名変更は `state.renameLane()` / `state.resetLaneName()` を利用。
- 画面比をA4向けにしたい場合は、`exporter.js` の `width/height` を差し替えます。

