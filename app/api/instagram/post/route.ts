import { NextRequest, NextResponse } from "next/server";
import { postToInstagram } from "@/lib/instagram";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, imageUrls, caption, hashtags, filePath } = await request.json();

    // imageUrls（複数）優先、なければimageUrl（単体）にフォールバック
    const urls: string[] = imageUrls?.length > 0
      ? imageUrls
      : imageUrl
      ? [imageUrl]
      : [];

    if (urls.length === 0 || !caption || !hashtags) {
      return NextResponse.json(
        { error: "imageUrls・caption・hashtags が必要です" },
        { status: 400 }
      );
    }

    const result = await postToInstagram(urls, caption, hashtags);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const { error: dbError } = await supabaseAdmin.from("posts").insert({
      image_url: urls[0],
      file_path: filePath ?? null,
      caption,
      hashtags,
      instagram_post_id: result.postId,
      permalink: result.permalink,
      status: "published",
      posted_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error("DB保存失敗:", dbError.message);
    }

    return NextResponse.json({
      success: true,
      postId: result.postId,
      permalink: result.permalink,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "投稿失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
