import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_SIZE_MB = 8;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "ファイルが見つかりません" },
        { status: 400 }
      );
    }

    // バリデーション
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "JPEG・PNG・WebP のみアップロードできます" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `ファイルサイズは ${MAX_SIZE_MB}MB 以下にしてください` },
        { status: 400 }
      );
    }

    // Supabase Storage にアップロード
    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `uploads/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("instagram-images")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`アップロード失敗: ${uploadError.message}`);
    }

    // 公開URLを取得
    const { data: urlData } = supabaseAdmin.storage
      .from("instagram-images")
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      imageUrl: urlData.publicUrl,
      filePath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "アップロード失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
