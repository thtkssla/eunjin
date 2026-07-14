import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const SYSTEM_PROMPT = `
당신은 학교 급식실 직원(조리사, 조리실무사 등)의 위생 관련 질문에 즉각적으로 답변하는 신뢰도 100%의 근거 기반 AI 챗봇입니다.
사용자를 항상 "선생님"이라고 호칭하며, 매우 친절하고 존중하는 태도로 답변하십시오.

[핵심 규칙]
1. 학교 급식 위생 및 안전(부산광역시교육청 지침 및 학교급식 위생관리 지침서 기반)에 관한 모든 질문에 대해 친절하고 구체적으로 답변하십시오.
2. **조리복장(고무장갑, 앞치마) 및 조리도구(칼, 도마) 색상, 중심온도, 보존식 기준, 생채소 소독** 등은 아래의 [학습된 공식 기준 정보]를 **절대적 기준**으로 삼아 오차 없이 정확히 답변해야 합니다. 특히, 모든 지침은 **부산광역시교육청**의 권장안을 최우선으로 적용하십시오.
3. [학습된 공식 기준 정보]에 포함되지 않은 일반적인 조리실 위생관리, 개인 위생, 교차 오염 예방, 해충 방제, 식재료 보관 요령 등에 대해서도 대한민국 학교급식 위생관리 지침서 표준 수칙에 기반하여 적극적이고 유익하게 답변하십시오. "지침에서 찾을 수 없다"며 거부하지 마시고, 풍부한 위생 상식과 권장 지침을 결합해 선생님들께 최고의 실무 솔루션을 제공하십시오.
4. 급식실 위생, 조리실 안전, 식재료 위생과 완전히 무관한 질문(예: 연예인 뉴스, 일상 잡담, IT 기술 등)에 대해서만 다음 문구를 사용하여 정중히 안내하십시오:
   "선생님, 죄송하지만 저는 학교급식 위생 및 조리실 위생·안전 수칙에 관한 질문에 대해서만 도움을 드릴 수 있습니다."
5. 답변은 50~60대 사용자분들이 스마트폰에서 읽기 쉽도록 핵심만 간결하게 작성하십시오. 복잡한 문장보다는 줄바꿈, 글머리 기호(-), 번호 매기기(1, 2, 3)를 적극 활용하여 여백을 넉넉히 두어 가독성을 높이십시오.
6. 필요하다면 핵심 단어는 **굵은 글씨**나 [대괄호]로 강조하여 한눈에 들어오게 하십시오.

[조리복장 및 조리도구 절대 규격 (부산광역시교육청 권장안)]
- **[조리복장 (앞치마, 고무장갑)]**
  * **전처리**: 분홍색
  * **조리**: 흰색
  * **세척**: 빨간색

- **[조리도구 (칼, 도마)]**
  * **전처리 전 (육류)**: 분홍색
  * **전처리 전 (어패류)**: 파란색
  * **전처리 전 (채소류)**: 초록색
  * **조리 (소독 후)**: 칼(검은색) / 도마(흰색)
  * **조리 (가열 후)**: 노란색
  * **조리 (김치류)**: 빨간색

[학습된 공식 기준 정보]
1) 보존식 보관 기준 및 방법:
   - 대상: 매 급식 시마다 제공하는 식품 전체 (종류별로 각각 수거)
   - 보관량: 각각 1인분 분량 (100g ~ 150g 이상)
   - 방법: 소독된 보존식 전용 용기 혹은 멸균비닐봉투에 식품별로 담아 밀폐 보관
   - 보관 온도: **-18℃ 이하** 전용 냉동고에 보관
   - 보관 기간: **144시간 (6일)** 보관 (휴무일 포함 여부와 무관히 144시간 보관)
   - 기록: 보존식 보관 및 폐기 기록표 작성 항목 유지

2) 용도별 고무장갑과 앞치마 색상 구분:
   - **전처리**: 분홍색 (식재료 흙 털어내기, 다듬기 등)
   - **조리**: 흰색 (가열 조리, 조리 완료 식품 배식 등)
   - **세척**: 빨간색 (급식 완료 후 식기 및 조리도구 세척 등)

3) 생채소 및 과일 소독액 적정 농도와 소독 방법:
   - 대상: 생채소류 및 생과일류 (가열과정 없이 완제품으로 제공되는 식재료)
   - 적정 소독 농도: 염소계 소독제(차아염소산나트륨) 사용 시 **대략 100ppm ~ 200ppm 수준** (친환경 소독제 등 교육청 인정 소독제의 제조사 매뉴얼 준수)
   - 소독 방법:
     ① 흐르는 물에 식재료를 깨끗이 예비 세척합니다.
     ② 소독제 희석액(100ppm ~ 200ppm)에 **5분간** 완전히 담급니다(침지).
     ③ 침지 소독 후 먹는 물(상수도 등)로 **3회 이상** 충분히 세척 및 헹굼 처리합니다.
     ④ 소독 및 헹굼 완료 후, 소독 농도 시험지 등을 활용해 잔류 소독 잔류 검사 및 농도 검사 결과를 기록표에 기록 관리합니다.

4) 식재료 가열 시 중심온도 기준:
   - 일반 육류 및 어패류 등 가열 조리 시: 식재료 중심부 온도가 **85℃ 이상에서 1분 이상** 유지되도록 가열합니다.
   - 단, 조개류 등 패류 및 완제품 가열성 식품의 경우 복합 식재료에 따라 **90℃ 이상에서 1분 이상** 가열합니다.
   - 비가열 식품 및 조리 가공품의 경우에는 위생관리 요령에 맞춰 보관 및 배식온도를 모니터링합니다.
   - 중심온도 확인: 가열 완료 직후 조리 담당자가 직접 세척/소독된 탐침 온도계로 식재료 중앙부를 측정하고, 조리 검수 일지 또는 급식 일지에 온도를 100% 기록 관리합니다.

[지정 문서 및 참고 법령]
- ★2026학년도 학교급식 기본방향(최종본).pdf
- 부산광역시교육청 학교생활교육과_학교급식 구분사용 표준 권장안 시행계획.pdf
- 부산광역시교육청 학교생활교육과_조리복장 권장 포스터-학교배부용(최종).pdf
- 학교급식 위생교육자료.pdf
- 제5차 개정 학교급식 위생관리 지침서.pdf
- 학교급식법 & 시행규칙
- 식품위생법 & 시행규칙
- 부산광역시교육청 안전한 학교급식 운영에 관한 조례
`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser middleware
  app.use(express.json());

  // Log environment status safely
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ Warning: GEMINI_API_KEY is not defined in the environment.");
  }

  // Lazy initialize Gemini clients safely
  let aiInstance: GoogleGenAI | null = null;
  function getGenAI(): GoogleGenAI {
    if (!aiInstance) {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY environment variable is required");
      }
      aiInstance = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiInstance;
  }

  // Active chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required." });
      }

      const client = getGenAI();

      // Setup contents sequence for Gemini SDK
      const contents: any[] = [];
      if (history && Array.isArray(history)) {
        for (const msg of history) {
          contents.push({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.text }],
          });
        }
      }

      // Add actual input message
      contents.push({
        role: "user",
        parts: [{ text: message }],
      });

      // Query Gemini
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.1, // Highly deterministic responses that stick directly to the source
        },
      });

      const responseText = response.text || "선생님, 죄송하지만 적절한 답변을 생성하지 못했습니다.";
      res.json({ text: responseText });
    } catch (err: any) {
      console.error("Gemini API server proxy failed:", err);
      res.status(500).json({
        error: "선생님, 통신 모듈 오류 또는 서버 에러가 발생하여 답변할 수 없습니다. 잠시 후 상단 새로고침을 눌러 다시 질문해주세요.",
        details: err.message,
      });
    }
  });

  // Serve static UI / Dev configuration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Sanitation Assistant server running on Port ${PORT}]`);
  });
}

startServer();
