import { NextRequest, NextResponse } from "next/server";
import { postToInstagram } from "@/lib/instagram";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, caption, hashtags, filePath } = await request.json();

    if (!imageUrl || !caption || !hashtags) {
      return NextResponse.json(
        { error: "imageUrl・caption・hashtags が必要です" },
        { status: 400 }
      );
    }

    // Instagram に投稿
    const result = await postToInstagram(imageUrl, caption, hashtags);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Supabase に投稿履歴を保存
    const { error: dbError } = await supabaseAdmin.from("posts").insert({
      image_url: imageUrl,
      file_path: filePath ?? null,
      caption,
      hashtags,
      instagram_post_id: result.postId,
      permalink: result.permalink,
      status: "published",
      posted_at: new Date().toISOString(),
    });

    if (dbError) {
      // DBエラーは投稿自体は成功しているのでログだけ出す
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
