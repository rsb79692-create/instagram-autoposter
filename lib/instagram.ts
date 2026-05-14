const IG_API_BASE = "https://graph.facebook.com/v19.0";
const ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!;
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN!;

export interface InstagramPostResult {
  success: boolean;
  postId?: string;
  permalink?: string;
  error?: string;
}

async function createMediaContainer(imageUrl: string, caption: string): Promise<string> {
  const res = await fetch(
    `${IG_API_BASE}/${ACCOUNT_ID}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${ACCESS_TOKEN}`,
    { method: "POST" }
  );
  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error(`メディアコンテナ作成失敗: ${data.error?.message ?? JSON.stringify(data)}`);
  }
  return data.id as string;
}

async function createCarouselItemContainer(imageUrl: string): Promise<string> {
  const res = await fetch(
    `${IG_API_BASE}/${ACCOUNT_ID}/media?image_url=${encodeURIComponent(imageUrl)}&is_carousel_item=true&access_token=${ACCESS_TOKEN}`,
    { method: "POST" }
  );
  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error(`カルーセルアイテム作成失敗: ${data.error?.message ?? JSON.stringify(data)}`);
  }
  return data.id as string;
}

async function createCarouselContainer(childIds: string[], caption: string): Promise<string> {
  const res = await fetch(
    `${IG_API_BASE}/${ACCOUNT_ID}/media?media_type=CAROUSEL&children=${encodeURIComponent(childIds.join(","))}&caption=${encodeURIComponent(caption)}&access_token=${ACCESS_TOKEN}`,
    { method: "POST" }
  );
  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error(`カルーセルコンテナ作成失敗: ${data.error?.message ?? JSON.stringify(data)}`);
  }
  return data.id as string;
}

async function waitForContainer(containerId: string): Promise<void> {
  const maxRetries = 10;
  const intervalMs = 3000;
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(
      `${IG_API_BASE}/${containerId}?fields=status_code&access_token=${ACCESS_TOKEN}`
    );
    const data = await res.json();
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR" || data.status_code === "EXPIRED") {
      throw new Error(`コンテナ処理エラー: ${data.status_code}`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("コンテナ処理タイムアウト");
}

async function publishContainer(containerId: string): Promise<string> {
  const res = await fetch(
    `${IG_API_BASE}/${ACCOUNT_ID}/media_publish?creation_id=${encodeURIComponent(containerId)}&access_token=${ACCESS_TOKEN}`,
    { method: "POST" }
  );
  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error(`公開失敗: ${data.error?.message ?? JSON.stringify(data)}`);
  }
  return data.id as string;
}

async function getPermalink(mediaId: string): Promise<string> {
  const res = await fetch(
    `${IG_API_BASE}/${mediaId}?fields=permalink&access_token=${ACCESS_TOKEN}`
  );
  const data = await res.json();
  return data.permalink ?? `https://www.instagram.com/p/${mediaId}/`;
}

export async function postToInstagram(
  imageUrls: string[],
  caption: string,
  hashtags: string[]
): Promise<InstagramPostResult> {
  try {
    const fullCaption = `${caption}\n\n${hashtags.map((h) => `#${h}`).join(" ")}`;

    let mediaId: string;

    if (imageUrls.length === 1) {
      // 単体投稿
      const containerId = await createMediaContainer(imageUrls[0], fullCaption);
      await waitForContainer(containerId);
      mediaId = await publishContainer(containerId);
    } else {
      // カルーセル投稿（2〜10枚）
      const childIds: string[] = [];
      for (const url of imageUrls) {
        const itemId = await createCarouselItemContainer(url);
        await waitForContainer(itemId);
        childIds.push(itemId);
      }
      const carouselId = await createCarouselContainer(childIds, fullCaption);
      await waitForContainer(carouselId);
      mediaId = await publishContainer(carouselId);
    }

    const permalink = await getPermalink(mediaId);
    return { success: true, postId: mediaId, permalink };
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return { success: false, error: message };
  }
}
