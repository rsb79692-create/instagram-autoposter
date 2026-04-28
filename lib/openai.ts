import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GeneratedContent {
  caption: string;
  hashtags: string[];
}

/**
 * 画像URLを受け取り、Instagram用の投稿文とハッシュタグを生成する
 */
export async function generateInstagramContent(
  imageUrl: string
): Promise<GeneratedContent> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `あなたはInstagramマーケティングの専門家です。
画像を分析し、エンゲージメントを最大化するInstagram投稿文とハッシュタグを日本語で作成してください。

投稿文のルール：
- 200〜400文字程度
- 絵文字を適度に使用（3〜5個）
- 読者が共感・行動したくなる文章
- 最後に行動を促すCTA（例：「保存して後で見返してね！」）

ハッシュタグのルール：
- 15〜25個
- 人気タグと中規模タグを混ぜる
- 日本語と英語を混ぜる
- # は含めない（配列で返す）

必ず以下のJSON形式で返してください：
{
  "caption": "投稿文をここに",
  "hashtags": ["タグ1", "タグ2", ...]
}`,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: imageUrl, detail: "high" },
          },
          {
            type: "text",
            text: "この画像に最適なInstagram投稿文とハッシュタグを作成してください。",
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1000,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("OpenAI からレスポンスがありませんでした");

  const parsed = JSON.parse(content) as GeneratedContent;
  return parsed;
}
