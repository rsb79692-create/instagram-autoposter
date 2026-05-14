import { NextRequest, NextResponse } from "next/server";

const GRAPH = "https://graph.facebook.com/v25.0";

type PostResult = { success: boolean; id?: string; error?: string };

async function createMedia(
  userId: string,
  imageUrl: string,
  caption: string,
  accessToken: string,
  mediaType?: string
): Promise<string> {
  const body: Record<string, string> = {
    image_url: imageUrl,
    access_token: accessToken,
  };
  if (caption) body.caption = caption;
  if (mediaType) body.media_type = mediaType;

  const res = await fetch(`${GRAPH}/${userId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: { id?: string; error?: { message?: string } } = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message ?? "media creation failed");
  return data.id!;
}

async function publishMedia(
  userId: string,
  creationId: string,
  accessToken: string
): Promise<string> {
  const res = await fetch(`${GRAPH}/${userId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
  });
  const data: { id?: string; error?: { message?: string } } = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message ?? "media publish failed");
  return data.id!;
}

async function postFacebook(
  pageId: string,
  imageUrl: string,
  caption: string,
  pageToken: string
): Promise<string> {
  const res = await fetch(`${GRAPH}/${pageId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: imageUrl, caption, access_token: pageToken }),
  });
  const data: { id?: string; error?: { message?: string } } = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message ?? "facebook post failed");
  return data.id!;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const image = searchParams.get("image");
  const caption = searchParams.get("caption") ?? "test post";

  if (!image) {
    return NextResponse.json({ error: "image is required" }, { status: 400 });
  }

  const igUserId = process.env.INSTAGRAM_USER_ID ?? "";
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN ?? "";
  const fbPageId = process.env.FACEBOOK_PAGE_ID ?? "";
  const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? "";

  let instagramFeed: PostResult = { success: false };
  let instagramStory: PostResult = { success: false };
  let facebook: PostResult = { success: false };

  await Promise.allSettled([
    (async () => {
      try {
        const creationId = await createMedia(igUserId, image, caption, igToken);
        const id = await publishMedia(igUserId, creationId, igToken);
        instagramFeed = { success: true, id };
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        console.error("[instagram_feed]", error);
        instagramFeed = { success: false, error };
      }
    })(),
    (async () => {
      try {
        const creationId = await createMedia(igUserId, image, "", igToken, "STORIES");
        const id = await publishMedia(igUserId, creationId, igToken);
        instagramStory = { success: true, id };
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        console.error("[instagram_story]", error);
        instagramStory = { success: false, error };
      }
    })(),
    (async () => {
      try {
        const id = await postFacebook(fbPageId, image, caption, fbToken);
        facebook = { success: true, id };
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        console.error("[facebook]", error);
        facebook = { success: false, error };
      }
    })(),
  ]);

  const success = instagramFeed.success && instagramStory.success && facebook.success;

  return NextResponse.json(
    { success, instagramFeed, instagramStory, facebook },
    { status: success ? 200 : 207 }
  );
}
