import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import sharp from "sharp";

const MAX_SIZE_MB = 8;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const IG_MAX_RATIO = 1.91;
const IG_MIN_RATIO = 0.8;

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

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "JPEG、PNG、WebPのみアップロード可能です" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `ファイルサイズは${MAX_SIZE_MB}MB以下にしてください` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const rawBuffer: Buffer = Buffer.from(arrayBuffer);

    // EXIFの向きを先に補正（回転されたまま保存された画像のw/hが正しくなる）
    const rotatedBuffer = await sharp(rawBuffer).rotate().toBuffer();

    // Instagramのアスペクト比（0.8〜1.91）に収まるようクロップ
    const meta = await sharp(rotatedBuffer).metadata();
    const w = meta.width ?? 1;
    const h = meta.height ?? 1;
    const ratio = w / h;

    let buffer: Buffer;

    if (ratio > IG_MAX_RATIO) {
      // 横長すぎ → 幅を削って1.91:1に
      const newW = Math.floor(h * IG_MAX_RATIO);
      buffer = await sharp(rotatedBuffer)
        .extract({ left: Math.floor((w - newW) / 2), top: 0, width: newW, height: h })
        .withMetadata()
        .jpeg({ quality: 90 })
        .toBuffer();
    } else if (ratio < IG_MIN_RATIO) {
      // 縦長すぎ → 高さを削って4:5に
      const newH = Math.floor(w / IG_MIN_RATIO);
      buffer = await sharp(rotatedBuffer)
        .extract({ left: 0, top: Math.floor((h - newH) / 2), width: w, height: newH })
        .withMetadata()
        .jpeg({ quality: 90 })
        .toBuffer();
    } else {
      buffer = await sharp(rotatedBuffer)
        .withMetadata()
        .jpeg({ quality: 90 })
        .toBuffer();
    }

    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;

    const { data, error } = await supabaseAdmin.storage
      .from("images")
      .upload(fileName, buffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabaseAdmin.storage
      .from("images")
      .getPublicUrl(data.path);

    return NextResponse.json({ imageUrl: urlData.publicUrl, url: urlData.publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "アップロードに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
