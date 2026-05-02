import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    // 1. Supabaseからトークン取得
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("tokens")
      .select("*")
      .eq("service", "instagram")
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: "Token not found in DB", details: tokenError });
    }

    const token = tokenData.token;
    const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

    // 2. トークンの権限と連携ページを確認
    const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${token}`);
    const pagesData = await pagesRes.json();

    // 各ページに紐づくInstagramアカウントを取得
    const igAccounts = [];
    if (pagesData.data) {
      for (const page of pagesData.data) {
        const igRes = await fetch(`https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${token}`);
        const igData = await igRes.json();
        if (igData.instagram_business_account) {
          igAccounts.push({
            pageId: page.id,
            pageName: page.name,
            igAccountId: igData.instagram_business_account.id
          });
        }
      }
    }

    return NextResponse.json({
      env_account_id: accountId,
      db_token_found: true,
      pages: pagesData,
      ig_accounts: igAccounts,
      is_match: igAccounts.some((acc: any) => acc.igAccountId === accountId)
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}
