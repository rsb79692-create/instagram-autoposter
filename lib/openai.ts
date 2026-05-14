import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GeneratedContent {
  caption: string;
  hashtags: string[];
}

export async function generateInstagramContent(
  imageUrl: string,
  menuName: string
): Promise<GeneratedContent> {
  const FIXED_HASHTAGS = ["穂乃味", "給食", "介護施設", "大阪", "泉南"];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `あなたは「株式会社 穂乃味（ほのみ）」のInstagram担当者です。
大阪・泉南エリアの介護施設・老人ホームへ給食を提供している会社のアカウントです。

【投稿文ルール】
- フォロワーに話しかける、親しみやすいトーン
- 100文字前後（改行含む）
- 必ず「穂乃味」「大阪・泉南」を自然に含める
- 栄養・健康へのこだわりを1文添える
- 絵文字は1〜2個のみ（🍱😊🌿🥗🍵 などから適切なものを選ぶ）
- 「今日の穂乃味のメニューは{メニュー名}です」という書き出しで始める

以下のJSON形式のみで返してください（ハッシュタグは固定値をそのまま使用）：
{"caption": "投稿文（100文字前後）", "hashtags": ["穂乃味", "給食", "介護施設", "大阪", "泉南"]}`,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: imageUrl },
          },
          {
            type: "text",
            text: menuName
              ? `今日のメニュー名：「${menuName}」\nこのメニューと写真をもとに、穂乃味らしいInstagram投稿文を作成してください。`
              : `写真に写っている料理を見て、メニュー名を日本語で判断してください。そのメニュー名を使って「今日の穂乃味のメニューは〇〇です」という書き出しで、穂乃味らしいInstagram投稿文を作成してください。`,
          },
        ],
      },
    ],
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("生成失敗");

  const parsed = JSON.parse(content);
  return {
    caption: parsed.caption,
    hashtags: FIXED_HASHTAGS,
  };
}