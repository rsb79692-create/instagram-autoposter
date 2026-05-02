# 📸 Instagram Autoposter

写真を1枚アップするだけで、AIが投稿文とハッシュタグを自動生成して Instagram に投稿できるツールです。

```
写真アップロード → AIが解析・文章生成 → 確認・編集 → 投稿
```

---

## 🗺 全体の流れ（最初に読んでください）

このアプリを動かすには、**4つのサービスの設定**が必要です。

| # | サービス | 何をするか |
|---|---|---|
| 1 | **Supabase** | 画像の保存 & 投稿履歴のDB |
| 2 | **OpenAI** | 画像解析・文章生成 |
| 3 | **Meta (Instagram)** | 実際にInstagramへ投稿 |
| 4 | **Vercel** | アプリのホスティング |

---

## ① Supabase のセットアップ

### アカウント作成
1. https://supabase.com にアクセス
2. 「Start your project」→ GitHubアカウントでサインアップ
3. 「New project」をクリック
4. 設定：
   - **Name**: `instagram-autoposter`（なんでもOK）
   - **Database Password**: 強いパスワードを設定（メモしておく）
   - **Region**: `Northeast Asia (Tokyo)` を選択
5. 「Create new project」→ 2〜3分待つ

### APIキーの取得
1. 左メニュー「Settings」→「API」を開く
2. 以下をメモ：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` に使う
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` に使う
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` に使う（⚠ 絶対に公開しない）

### データベースの作成
1. 左メニュー「SQL Editor」を開く
   - もし見当たらなければ、左メニューの「SQL」グループを展開してから「SQL Editor」を選択します
2. 「New query」をクリック
3. このリポジトリの `supabase/schema.sql` の内容を全コピーして貼り付け
   - 特に `hashtags TEXT[]` の部分と `tokens` テーブルの定義が重要です
4. 「Run」ボタンを押す
5. ✅ エラーなく完了すればOK

### Storageバケットの確認
1. 左メニュー「Storage」を開く
2. `instagram-images` というバケットが作成されていればOK
3. もしなければ「New bucket」で：
   - Name: `instagram-images`
   - Public bucket: **ON**（チェックを入れる）

---

## ② OpenAI APIキーの取得

1. https://platform.openai.com にアクセス・ログイン
2. 右上のアイコン →「API keys」
3. 「Create new secret key」をクリック
4. 名前: `instagram-autoposter`（なんでもOK）
5. 表示されたキー（`sk-proj-...`）をコピー → `.env.local` に設定
6. ⚠ **このキーは一度しか表示されません。必ずメモ！**

**料金について**：
- 投稿1回あたり約 $0.01〜0.05（数円）
- https://platform.openai.com/usage で確認できます

---

## ③ Meta (Instagram) の設定

> ⚠ これが一番複雑です。順番通りに進めてください。

### 事前準備（必須）
- [ ] Instagramのアカウントが **プロアカウント**（ビジネスまたはクリエイター）であること
- [ ] FacebookページとInstagramアカウントが**連携済み**であること

#### Instagramをプロアカウントに切り替える方法
1. Instagramアプリ →「プロフィール」→ 右上「≡」→「設定とプライバシー」
2. 「アカウントの種類とツール」→「プロアカウントに切り替える」
3. 「ビジネス」を選択 → 完了

#### FacebookページとInstagramを連携する方法
1. Facebookにログイン → 自分のページを開く
2. 「設定」→「リンク済みアカウント」→「Instagram」→「接続」

---

### Meta for Developersでアプリを作成

1. https://developers.facebook.com にアクセス
2. 右上「マイアプリ」→「アプリを作成」
3. 設定：
   - **ユースケース**: 「その他」を選択
   - **タイプ**: 「ビジネス」
   - **アプリ名**: `instagram-autoposter`
   - **連絡先メール**: 自分のメール
4. 「アプリを作成」

---

### Instagram Graph API を追加

1. アプリのダッシュボードで「製品を追加」
2. 「Instagram Graph API」の「設定」をクリック
3. 左メニューに「Instagram」が追加されます

---

### Instagramビジネスアカウントを接続

1. 左メニュー「Instagram」→「APIセットアップ with Instagram Business Login」
2. 「Instagramビジネスアカウントを接続」をクリック
3. Facebookアカウントでログイン → 対象のInstagramを選択 → 許可
4. 接続完了後、**Instagram Business Account ID** が表示される → メモ

---

### アクセストークンの生成

1. 左メニュー「Instagram」→「APIセットアップ」
2. 「アクセストークンを生成」をクリック
3. Instagramアカウントを選択 → 「承認」
4. 表示された長いトークン（`EAA...`）をコピー → メモ

> ⚠ デフォルトのトークンは**短期間**（1〜2時間）で期限切れになります。
> 長期トークン（60日）に変換するには以下のURLをブラウザで開く：
>
> ```
> https://graph.facebook.com/v21.0/oauth/access_token
>   ?grant_type=fb_exchange_token
>   &client_id=【アプリID】
>   &client_secret=【アプリシークレット】
>   &fb_exchange_token=【短期トークン】
> ```
>
> アプリIDとシークレットは：ダッシュボード →「設定」→「ベーシック」で確認

---

### アプリを「ライブ」モードにする

> ⚠ これをしないと自分以外のアカウントには投稿できません

1. アプリダッシュボードの上部バーで「開発中」→「ライブ」に切り替え
2. ポリシーへの同意を求められたら同意
3. ✅ 緑色の「ライブ」表示になればOK

---

## ④ ローカル開発環境のセットアップ

### 必要なもの
- Node.js 20以上（https://nodejs.org）
- Git（https://git-scm.com）

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/yourname/instagram-autoposter.git
cd instagram-autoposter

# 依存パッケージをインストール
npm install

# 環境変数ファイルを作成
cp .env.example .env.local
```

### `.env.local` を編集

テキストエディタで `.env.local` を開いて、取得した値を入力：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

OPENAI_API_KEY=sk-proj-...

INSTAGRAM_BUSINESS_ACCOUNT_ID=17841400000000000
INSTAGRAM_ACCESS_TOKEN=EAAxxxxx...

ADMIN_PASSWORD=自分で決めたパスワード
SESSION_SECRET=ランダムな32文字以上の文字列
```

**SESSION_SECRET の生成方法（Mac/Linux）**:
```bash
openssl rand -base64 32
```

**SESSION_SECRET の生成方法（Windows PowerShell）**:
```powershell
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

### 起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く → ログイン画面が表示されればOK！

---

## ⑤ Vercel へのデプロイ

### Vercelアカウント作成
1. https://vercel.com にアクセス
2. 「Sign Up」→ GitHubでログイン

### GitHubにプッシュ
```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/yourname/instagram-autoposter.git
git push -u origin main
```

### Vercelにデプロイ
1. Vercelダッシュボード →「Add New Project」
2. GitHubリポジトリ `instagram-autoposter` を選択 →「Import」
3. **「Environment Variables」セクションを展開**
4. `.env.local` の各変数を1つずつ追加：

| Variable Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | supabaseのURL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anonキー |
| `SUPABASE_SERVICE_ROLE_KEY` | service_roleキー |
| `OPENAI_API_KEY` | OpenAIキー |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | InstagramアカウントID |
| `INSTAGRAM_ACCESS_TOKEN` | アクセストークン |
| `ADMIN_PASSWORD` | ログインパスワード |
| `SESSION_SECRET` | セッション用ランダム文字列 |

5. 「Deploy」をクリック → 2〜3分でデプロイ完了
6. 表示されたURL（例: `https://instagram-autoposter.vercel.app`）でアクセス可能！

---

## 🎯 使い方

1. アプリのURLにアクセス
2. `ADMIN_PASSWORD` で設定したパスワードでログイン
3. 写真をドラッグ&ドロップ（またはクリックして選択）
4. 「AIで投稿文を生成する」ボタンを押す（10〜20秒かかります）
5. 生成された投稿文・ハッシュタグを確認・編集
6. 「Instagramに投稿する」ボタンを押す
7. 完了！

---

## 🔧 よくあるトラブル

### 「アップロード失敗」と表示される
→ Supabase の Storage バケット `instagram-images` が Public になっているか確認

### 「AI生成失敗」と表示される
→ `OPENAI_API_KEY` が正しいか確認。OpenAIのダッシュボードで残高も確認

### 「投稿失敗: (#10) ...」と表示される
→ Instagramアカウントがビジネスアカウントになっているか確認
→ アクセストークンの権限が `instagram_content_publish` を含んでいるか確認

### 「投稿失敗: Invalid OAuth ...」と表示される
→ アクセストークンの期限切れ。トークンを再生成して環境変数を更新

### ログインできない
→ `.env.local` の `ADMIN_PASSWORD` と `SESSION_SECRET` を確認
→ Vercelの場合は環境変数を追加後に「Redeploy」が必要

---

## 📁 ファイル構成

```
instagram-autoposter/
├── app/
│   ├── api/
│   │   ├── auth/login/route.ts      # ログインAPI
│   │   ├── auth/logout/route.ts     # ログアウトAPI
│   │   ├── upload/route.ts          # 画像アップロードAPI
│   │   ├── generate/route.ts        # AI生成API
│   │   ├── instagram/post/route.ts  # Instagram投稿API
│   │   └── posts/route.ts           # 投稿履歴取得API
│   ├── dashboard/                   # メイン画面
│   ├── login/                       # ログイン画面
│   └── layout.tsx
├── lib/
│   ├── supabase.ts                  # Supabaseクライアント
│   ├── openai.ts                    # OpenAI画像解析
│   └── instagram.ts                 # Instagram API
├── supabase/
│   └── schema.sql                   # DB・Storageスキーマ
├── middleware.ts                    # 認証ミドルウェア
├── .env.example                     # 環境変数テンプレート
└── vercel.json                      # Vercel設定
```

---

## 🚀 今後追加できる機能（拡張アイデア）

- [ ] 予約投稿（投稿日時を指定）
- [ ] 複数アカウント対応
- [ ] 投稿履歴ページ
- [ ] エンゲージメント分析
- [ ] カルーセル投稿（複数枚）
- [ ] リール投稿対応

---

## ⚠ 注意事項

- このツールは **Meta公式API** のみを使用しています
- Instagramの利用規約に従って使用してください
- アクセストークンは**絶対に公開しない**でください
- 投稿内容は必ず自分で確認してから「投稿する」を押してください
