/**
 * Instagram Content Publishing API (Meta Graph API)
 * 公式ドキュメント: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 *
 * 投稿フロー:
 * 1. メディアコンテナを作成（画像URL + キャプション）
 * 2. コンテナを公開
 */

import { supabaseAdmin } from './supabase';

const IG_API_BASE = "https://graph.facebook.com/v21.0";
const ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!;

export interface InstagramPostResult {
  success: boolean;
  postId?: string;
  permalink?: string;
  error?: string;
}

/**
 * Instagram トークンを Supabase から取得（期限切れ時は自動リフレッシュ）
 */
async function getInstagramToken(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('tokens')
    .select('token, expires_at')
    .eq('service', 'instagram')
    .single();

  if (error || !data) {
    throw new Error('Instagram token not found in database');
  }

  // 期限切れチェック（余裕を持って1日前にリフレッシュ）
  const expiresAt = new Date(data.expires_at);
  const now = new Date();
  const oneDayBefore = new Date(expiresAt.getTime() - 24 * 60 * 60 * 1000);

  if (now > oneDayBefore) {
    console.log('Instagram token is expiring soon, refreshing...');
    const newToken = await refreshInstagramToken(data.token);
    await updateInstagramToken(newToken);
    return newToken;
  }

  return data.token;
}

/**
 * Instagram トークンをリフレッシュ
 */
async function refreshInstagramToken(oldToken: string): Promise<string> {
  const res = await fetch(`${IG_API_BASE}/oauth/access_token?grant_type=ig_refresh_token&access_token=${oldToken}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${data.error?.message ?? JSON.stringify(data)}`);
  }

  return data.access_token;
}

/**
 * Instagram トークンを Supabase に更新
 */
async function updateInstagramToken(token: string): Promise<void> {
  // 新しいトークンは60日有効
  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  const { error } = await supabaseAdmin
    .from('tokens')
    .upsert({
      service: 'instagram',
      token,
      expires_at: expiresAt.toISOString()
    });

  if (error) {
    console.error('Failed to update Instagram token:', error);
  }
}

/**
 * Step 1: メディアコンテナを作成する
 */
async function createMediaContainer(
  imageUrl: string,
  caption: string,
  token: string
): Promise<string> {
  const params = new URLSearchParams({
    image_url: imageUrl,
    caption: caption,
    access_token: token,
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
 * カルーセル用の子アイテムコンテナを作成する
 */
async function createCarouselItem(imageUrl: string, token: string): Promise<string> {
  const params = new URLSearchParams({
    image_url: imageUrl,
    is_carousel_item: "true",
    access_token: token,
  });

  const res = await fetch(`${IG_API_BASE}/${ACCOUNT_ID}/media`, {
    method: "POST",
    body: params,
  });

  const data = await res.json();

  if (!res.ok || !data.id) {
    throw new Error(
      `カルーセルアイテム作成失敗: ${data.error?.message ?? JSON.stringify(data)}`
    );
  }

  return data.id as string;
}

/**
 * カルーセル用の親コンテナを作成する
 */
async function createCarouselContainer(
  childrenIds: string[],
  caption: string,
  token: string
): Promise<string> {
  const params = new URLSearchParams({
    media_type: "CAROUSEL",
    caption: caption,
    children: childrenIds.join(","),
    access_token: token,
  });

  const res = await fetch(`${IG_API_BASE}/${ACCOUNT_ID}/media`, {
    method: "POST",
    body: params,
  });

  const data = await res.json();

  if (!res.ok || !data.id) {
    throw new Error(
      `カルーセルコンテナ作成失敗: ${data.error?.message ?? JSON.stringify(data)}`
    );
  }

  return data.id as string;
}

/**
 * Step 2: コンテナが処理完了するまで待つ
 */
async function waitForContainer(containerId: string, token: string): Promise<void> {
  const maxRetries = 10;
  const intervalMs = 3000;

  for (let i = 0; i < maxRetries; i++) {
    const params = new URLSearchParams({
      fields: "status_code",
      access_token: token,
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
async function publishContainer(containerId: string, token: string): Promise<string> {
  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: token,
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
async function getPermalink(mediaId: string, token: string): Promise<string> {
  const params = new URLSearchParams({
    fields: "permalink",
    access_token: token,
  });

  const res = await fetch(`${IG_API_BASE}/${mediaId}?${params}`);
  const data = await res.json();

  return data.permalink ?? `https://www.instagram.com/p/${mediaId}/`;
}

/**
 * Instagram に写真を投稿するメイン関数
 */
export async function postToInstagram(
  imageUrls: string[],
  caption: string,
  hashtags: string[]
): Promise<InstagramPostResult> {
  try {
    const token = await getInstagramToken();
    const fullCaption = `${caption}\n\n${hashtags.map((h) => `#${h}`).join(" ")}`;

    let containerId: string;

    if (imageUrls.length === 1) {
      // 1. メディアコンテナ作成 (単一)
      containerId = await createMediaContainer(imageUrls[0], fullCaption, token);
    } else {
      // 1. カルーセルアイテム作成
      const childrenIds: string[] = [];
      for (const url of imageUrls) {
        const childId = await createCarouselItem(url, token);
        childrenIds.push(childId);
      }
      // カルーセル親コンテナ作成
      containerId = await createCarouselContainer(childrenIds, fullCaption, token);
    }

    // 2. 処理完了を待つ
    await waitForContainer(containerId, token);

    // 3. 公開
    const mediaId = await publishContainer(containerId, token);

    // 4. パーマリンク取得
    const permalink = await getPermalink(mediaId, token);

    return { success: true, postId: mediaId, permalink };
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return { success: false, error: message };
  }
}
