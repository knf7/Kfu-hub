import { NextResponse } from 'next/server';

export const maxDuration = 60; // Allow 60s for vision processing

// Fallback Google API Key (User's provided key)
const FALLBACK_API_KEY = "AIzaSyDUDvWBUkfmMNtEVI7HUW4iMlYkvIu3xv0";

export async function POST(req: Request) {
  try {
    const { message, draft, missingFields, recentConversation, imageBase64 } = await req.json();

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || FALLBACK_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is missing' }, { status: 403 });
    }

    const systemPrompt = `
      أنت المساعد الذكي "Rabbit" المختص بالإدخال السريع للقروض في شركة التمويل السعودية (أصيل المالي SaaS).
      مهمتك: قرائت المدخلات النصية والصور بدقة شديدة، استخراج الحقول، اقتراح سؤال متابعة، وتوليد خيارات سريعة. يجب إرجاع الرد بصيغة JSON فقط بدون markdown.

      الهيكل الإلزامي للـ JSON:
      {
        "extracted": {
          "fullName": null | string,
          "nationalId": null | string, // رقم هوية وطنية مكون من 10 أرقام (يبدأ ب 1 أو 2 عادة)
          "mobileNumber": null | string, // رقم سعودي يبدأ بـ 05
          "amount": null | number,
          "profitPercentage": null | number,
          "receiptNumber": null | string,
          "transactionDate": null | string,
          "intent": null | string // يجب أن تكون واحدة من: confirm, collect_more, create
        },
        "assistantReply": null | string, // كلام طبيعي ومرحّب للسرد مثلاً: ممتاز، فهمت أنك تريد إضافة محمد، فقط باقي الهوية!
        "followUpQuestion": null | string, // سؤال محدد عن الحقول الناقصة حالياً.
        "quickReplies": [] // قائمة قصيرة من النصوص لمساعدة المستخدم (اختياري)
      }

      القواعد:
      1. اقرأ الصورة بدقة في حال توفرت وابحث بداخلها عن أي أسماء أو أرقام هويات، أو جولات، أو مبالغ، وحولها لقيم في الحقول.
      2. אם وجدت كل البيانات (الاسم والهوية والجوال والمبلغ) اجعل الـ intent = "create"، وإلا اجعلها "collect_more".
      3. احتفظ بأي قيم مسودة موجودة في الـ Draft الحالي إذا لم تُعطى في الرسالة الحالية.

      بيانات المسودة (Draft) الحالية:
      ${JSON.stringify(draft || {})}

      عليك إكمال ما ينقصها وتحديث معلوماتها من نص المستخدم أو الصورة.
      سياق المحادثة الأخيرة:
      ${recentConversation || "لا يوجد سياق"}
      
      رسالة المستخدم الجديدة:
      ${message || "يوجد صورة مرفقة فقط"}
    `.trim();

    // Prepare Parts
    const parts: any[] = [{ text: systemPrompt }];

    if (imageBase64) {
      const isBase64Obj = typeof imageBase64 === 'object' ? imageBase64.base64 : imageBase64;
      const mimeType = typeof imageBase64 === 'object' && imageBase64.type ? imageBase64.type : 'image/jpeg';
      
      let base64Data = isBase64Obj;
      if (base64Data.includes('base64,')) {
        base64Data = base64Data.split('base64,')[1];
      }

      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          { parts }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err?.error?.message || 'Gemini API Error');
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!candidateText) {
      throw new Error('لم تقم استجابة النموذج بإرجاع نص صالح');
    }

    let parsed;
    try {
      parsed = JSON.parse(candidateText.trim());
    } catch {
      throw new Error('فشل تفسير الاستجابة من الذكاء الاصطناعي');
    }

    return NextResponse.json(parsed);

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
