import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("posts")
      .select("*")
      .order("posted_at", { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, posts: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "取得失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
