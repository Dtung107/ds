/**
 * Unified Client-Side Gemini AI Service
 * Supports:
 * 1. Direct Google Gemini REST API using user-configured API key (Mandatory for Android APK)
 * 2. Automatic fallback to local server /api/ai proxy when running on dev/web server
 * 3. Instant API key validation and connectivity test
 */

export const GEMINI_API_KEY_STORAGE = 'pydroid_gemini_api_key';

export function getStoredApiKey(): string {
  try {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE) || '';
  } catch (_) {
    return '';
  }
}

export function setStoredApiKey(key: string): void {
  try {
    const clean = key.trim();
    if (clean) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE, clean);
    } else {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE);
    }
  } catch (_) {}
}

export function removeStoredApiKey(): void {
  try {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE);
  } catch (_) {}
}

/**
 * Test connectivity and validity of a Gemini API key
 */
export async function testGeminiApiKey(apiKey: string): Promise<{ ok: boolean; message: string; model?: string }> {
  const clean = apiKey.trim();
  if (!clean) {
    return { ok: false, message: 'Vui lòng nhập API Key để kiểm tra.' };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(clean)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: 'Ping' }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 5,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const errMsg = data.error?.message || `Lỗi HTTP ${res.status}: ${res.statusText}`;
      if (res.status === 400 || errMsg.toLowerCase().includes('api_key_invalid') || errMsg.toLowerCase().includes('key not valid')) {
        return { ok: false, message: 'Khóa API không hợp lệ. Vui lòng kiểm tra lại mã khóa từ Google AI Studio.' };
      }
      return { ok: false, message: `Lỗi kết nối Gemini: ${errMsg}` };
    }

    return {
      ok: true,
      message: 'Kết nối thành công! Khóa API Gemini 2.5 Flash hợp lệ và sẵn sàng sử dụng trên APK.',
      model: 'gemini-2.5-flash',
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Không thể kết nối đến máy chủ Google Gemini: ${err.message || String(err)}`,
    };
  }
}

/**
 * Client-Side AI Assistant Chat (supports streaming / direct response)
 */
export async function sendGeminiChat(
  messages: Array<{ role: 'user' | 'model'; content: string }>,
  customPrompt?: string
): Promise<string> {
  const apiKey = getStoredApiKey();

  // If user provided a key, call Google Gemini directly (Works in APK standalone!)
  if (apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    
    const formattedContents = messages.map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    if (customPrompt) {
      formattedContents.push({
        role: 'user',
        parts: [{ text: customPrompt }],
      });
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: 'Bạn là Pydroid AI Assistant - Trợ lý gia sư lập trình Python chuyên nghiệp cho người dùng trên điện thoại di động Android. Trả lời bằng tiếng Việt thân thiện, súc tích, giải thích rõ ràng và cung cấp mã nguồn Python chuẩn PEP 8.',
            },
          ],
        },
        contents: formattedContents,
        generationConfig: {
          temperature: 0.7,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || `Lỗi Gemini API: ${res.status}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini không phản hồi văn bản.');
    }
    return text;
  }

  // Fallback to server proxy route when running on Web / Dev Server
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, prompt: customPrompt }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Vui lòng nhập API Key Gemini trong mục Cài đặt (Bánh răng ⚙️) để sử dụng tính năng này trên APK Android.');
  }

  const data = await res.json();
  return data.text || '';
}

/**
 * Client-Side AI Code Debugger
 */
export async function sendGeminiDebug(code: string, errorText: string): Promise<any> {
  const apiKey = getStoredApiKey();

  if (apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    
    const prompt = `Phân tích lỗi Python sau và sửa mã nguồn hoàn chỉnh:
MÃ PYTHON:
\`\`\`python
${code}
\`\`\`

THÔNG BÁO LỖI:
${errorText || 'Không có log lỗi cụ thể, hãy phân tích logic hoặc cú pháp tiềm ẩn.'}

Yêu cầu trả về đúng định dạng JSON:
{
  "errorType": "Tên loại lỗi (SyntaxError, NameError, Logic...)",
  "vietnameseSummary": "Tóm tắt ngắn gọn lỗi bằng tiếng Việt (1 câu)",
  "rootCause": "Nguyên nhân gốc rễ và dòng lỗi",
  "tips": ["Mẹo 1", "Mẹo 2"],
  "fixedCode": "Toàn bộ mã Python đã sửa chuẩn PEP 8",
  "diffExplanation": "Giải thích ngắn các điểm đã sửa"
}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || `Lỗi Gemini API: ${res.status}`);
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Không nhận được dữ liệu phân tích từ Gemini.');
    return JSON.parse(rawText);
  }

  // Fallback to server proxy
  const res = await fetch('/api/ai/debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, errorText }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Vui lòng nhập API Key Gemini trong mục Cài đặt (Bánh răng ⚙️) để sử dụng tính năng sửa lỗi trên APK Android.');
  }
  return data;
}

/**
 * Client-Side Lesson Generator
 */
export async function sendGeminiLessons(topic: string, level: string = 'cơ bản'): Promise<any> {
  const apiKey = getStoredApiKey();

  if (apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    
    const prompt = `Tạo danh sách 3 bài tập lập trình Python về chủ đề "${topic}" với cấp độ "${level}".
Trả về đúng định dạng JSON danh sách mảng:
[
  {
    "title": "Tiêu đề bài tập ngắn",
    "description": "Mô tả yêu cầu chi tiết",
    "level": "basic" | "intermediate" | "advanced",
    "starterCode": "Mã Python gợi ý khung",
    "solutionCode": "Mã Python giải hoàn chỉnh",
    "explanation": "Giải thích chi tiết thuật toán",
    "sampleInput": "Dữ liệu nhập mẫu nếu có",
    "sampleOutput": "Kết quả in ra mong đợi"
  }
]`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || `Lỗi Gemini API: ${res.status}`);
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Không nhận được phản hồi bài tập từ Gemini.');
    return JSON.parse(rawText);
  }

  // Fallback to server
  const res = await fetch('/api/ai/generate-lessons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, level }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Vui lòng nhập API Key Gemini trong mục Cài đặt (Bánh răng ⚙️) để tạo bài học trên APK Android.');
  }
  return data.lessons || [];
}
