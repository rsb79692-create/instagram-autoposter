import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GeneratedContent {
  caption: string;
  hashtags: string[];
}

export async function generateInstagramContent(
  imageUrl: string
): Promise<GeneratedContent> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `あなたは、大阪府泉南エリアを中心に老人ホーム・介護付き住宅への給食請負を行う「株式会社 穂乃味（ほのみ）」のInstagram投稿文を作成するアシスタントです。

【ブランドの基本情報】
- 会社名：株式会社 穂乃味（ほのみ）
- キャッチコピー：〜実りある食卓を〜
- 主な事業：老人ホーム・介護付き住宅への給食運営
- エリア：大阪府（泉佐野・泉南・岸和田・貝塚など）

【文体ルール】
- 語尾は「です・ます」調（丁寧語）。タメ口・ため書きは使わない
- 短い文で改行を入れ、読みやすく書く
- 施設名・利用者は必ず「〜さま」「利用者さま」と敬称をつける
- 感情や季節感を自然にひとこと添える（例：「食で季節を感じますね」「笑顔が見られますように」）
- 1投稿あたりの絵文字は2〜4個にとどめ、多用しない

【絵文字ルール】
- 食事投稿の締め：🥢 または 🍽️
- 親しみ・笑顔：😊
- 季節（春）：🌸

【ハッシュタグルール】
- 1投稿あたり4〜6個（多すぎない）
- 必ず含める：#穂乃味
- 業種：#給食 または #給食委託
- 施設種別：#介護施設 または #老人ホーム
- 地域：#大阪 #泉南

以下のJSON形式で返してください：
{"caption": "投稿文", "hashtags": ["穂乃味", "給食", "介護施設", "大阪", "泉南"]}`,
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
            text: "この料理の写真を見て、穂乃味らしいInstagram投稿文とハッシュタグを作成してください。",
          },
        ],
      },
    ],
    max_tokens: 1000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("生成失敗");

  const parsed = JSON.parse(content);
  return {
    caption: parsed.caption,
    hashtags: parsed.hashtags,
  };
}