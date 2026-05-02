/**
 * Instagram Content Publishing API (Meta Graph API)
 * 公式ドキュメント: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 *
 * 投稿フロー:
 * 1. メディアコンテナを作成（画像URL + キャプション）
 * 2. コンテナを公開
 */

const IG_API_BASE = "https://graph.facebook.com/v21.0";
const ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!;
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN!;

export interface InstagramPostResult {
  success: boolean;
  postId?: string;
  permalink?: string;
  error?: string;
}

/**
 * Step 1: メディアコンテナを作成する
 */
async function createMediaContainer(
  imageUrl: string,
  caption: string
): Promise<string> {
  const params = new URLSearchParams({
    image_url: imageUrl,
    caption: caption,
    access_token: ACCESS_TOKEN,
  });

  const res = await fetch(`${IG_API_BASE}/${ACCOUNT_ID}/media`, {
    method: "POST",
    body: params,
  });

  const data = await res.json();

  if (!res.ok || !data.id) {
    throw new Error(
      `メディアコンテナ作成失敗: ${data.error?.message ?? JSON.stringify(data)}`
    );
  }

  return data.id as string;
}

/**
 * Step 2: コンテナが処理完了するまで待つ
 */
async function waitForContainer(containerId: string): Promise<void> {
  const maxRetries = 10;
  const intervalMs = 3000;

  for (let i = 0; i < maxRetries; i++) {
    const params = new URLSearchParams({
      fields: "status_code",
      access_token: ACCESS_TOKEN,
    });

    const res = await fetch(`${IG_API_BASE}/${containerId}?${params}`);
    const data = await res.json();

    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR" || data.status_code === "EXPIRED") {
      throw new Error(`コンテナ処理エラー: ${data.status_code}`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("コンテナ処理タイムアウト");
}

/**
 * Step 3: コンテナを公開する
 */
async function publishContainer(containerId: string): Promise<string> {
  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: ACCESS_TOKEN,
  });

  const res = await fetch(`${IG_API_BASE}/${ACCOUNT_ID}/media_publish`, {
    method: "POST",
    body: params,
  });

  const data = await res.json();

  if (!res.ok || !data.id) {
    throw new Error(
      `公開失敗: ${data.error?.message ?? JSON.stringify(data)}`
    );
  }

  return data.id as string;
}

/**
 * 投稿のパーマリンクを取得する
 */
async function getPermalink(mediaId: string): Promise<string> {
  const params = new URLSearchParams({
    fields: "permalink",
    access_token: ACCESS_TOKEN,
  });

  const res = await fetch(`${IG_API_BASE}/${mediaId}?${params}`);
  const data = await res.json();

  return data.permalink ?? `https://www.instagram.com/p/${mediaId}/`;
}

/**
 * Instagram に写真を投稿するメイン関数
 */
export async function postToInstagram(
  imageUrl: string,
  caption: string,
  hashtags: string[]
): Promise<InstagramPostResult> {
  try {
    const fullCaption = `${caption}\n\n${hashtags.map((h) => `#${h}`).join(" ")}`;

    // 1. メディアコンテナ作成
    const containerId = await createMediaContainer(imageUrl, fullCaption);

    // 2. 処理完了を待つ
    await waitForContainer(containerId);

    // 3. 公開
    const mediaId = await publishContainer(containerId);

    // 4. パーマリンク取得
    const permalink = await getPermalink(mediaId);

    return { success: true, postId: mediaId, permalink };
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return { success: false, error: message };
  }
}
