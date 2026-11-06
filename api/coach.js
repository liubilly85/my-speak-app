// 檔案路徑：api/coach.js
// 部署於 Vercel 時，此檔案會自動成為後端 API 端點 (POST /api/coach)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action, title, domain, extract, question, notes, clientApiKey } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY || clientApiKey;

  if (!apiKey) {
    return res.status(400).json({ error: '尚未設定 GEMINI_API_KEY 環境變數' });
  }

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // 後端功能 1：根據維基百科條目，動態生成三個切入角度的口語訓練題
    if (action === 'generate_questions') {
      const prompt = `你是一位頂尖口語表達教練。請根據以下知識條目，設計 3 道適合 1~5 分鐘即興演講的繁體中文題目，並嚴格以 JSON 格式回傳：
領域：${domain}
主題：${title}
背景摘要：${extract}

請回傳格式如下的純 JSON（不要加上 markdown 語法）：
{
  "feynman": "一道要求用生活化比喻向外行人解釋此概念的白話題",
  "critical": "一道探討此概念背後盲點、利弊或個人觀點的思辨題",
  "practical": "一道如何將此概念應用在工作、生活或健康管理的實務題"
}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const questions = JSON.parse(rawText);
      return res.status(200).json({ questions });
    }

    // 後端功能 2：批改使用者的講稿大綱並給出 1 分鐘示範講稿
    if (action === 'evaluate_speech') {
      const prompt = `你是一位專業的口語表達教練。
練習主題：${title}
題目：${question}
背景知識：${extract}
學員撰寫的講稿大綱筆記：${notes || '（學員尚未填寫筆記，請直接提供破題建議與示範講稿）'}

請用繁體中文提供：
1. 【結構與亮點點評】：針對學員大綱給予具體優化建議（若無筆記則給出破題切入點）。
2. 【1分鐘滿分示範講稿】：運用 PREP 或費曼生活化比喻，寫出一篇自然口語、有吸引力的 1 分鐘演講逐字稿。`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      const feedback = data?.candidates?.[0]?.content?.parts?.[0]?.text || '無法取得 AI 回應';
      return res.status(200).json({ feedback });
    }

    return res.status(400).json({ error: '未知的 action 參數' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
