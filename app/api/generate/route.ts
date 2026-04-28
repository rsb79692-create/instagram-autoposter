import { NextRequest, NextResponse } from "next/server";
import { generateInstagramContent } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl が必要です" },
        { status: 400 }
      );
    }

    const content = await generateInstagramContent(imageUrl);

    return NextResponse.json({ success: true, ...content });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
