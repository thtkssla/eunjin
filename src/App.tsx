import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { 
  ChefHat, 
  RotateCcw, 
  Send, 
  HelpCircle, 
  Sparkles, 
  ChevronRight 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  role: "user" | "bot";
  text: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle textarea self-resizing
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${newHeight > 120 ? 120 : newHeight}px`;
    }
  };

  // Predefined FAQs
  const faqList = [
    {
      id: "faq1",
      short: "보존식 보관 기준 및 방법",
      full: "보존식 보관 기준 및 방법은 어떻게 되나요?"
    },
    {
      id: "faq2",
      short: "장갑 및 앞치마 색상 구분",
      full: "용도별 고무장갑과 앞치마 색상 구분은 어떻게 해야 하나요?"
    },
    {
      id: "faq3",
      short: "생채소/과일 소독 농도와 세척",
      full: "생채소 및 과일 소독액 적정 농도와 소독 방법은 무엇인가요?"
    },
    {
      id: "faq4",
      short: "식재료 가열 시 중심온도 기준",
      full: "식재료 가열 시 중심온도 기준은 몇 도인가요?"
    }
  ];

  // Submit query
  const submitMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    // Add user message to history
    const newMessages: Message[] = [...messages, { role: "user", text: trimmed }];
    setMessages(newMessages);
    setInput("");
    
    // Reset textarea sizing
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setIsLoading(true);

    try {
      // Map message log to api format
      const historyPayload = messages.map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        text: msg.text
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "통신 오류 발생");
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: "bot", text: data.text }]);
    } catch (error: any) {
      console.error(error);
      const isApiKeyError = error.message && (error.message.includes("GEMINI_API_KEY") || error.message.includes("API key"));
      
      const errorText = isApiKeyError 
        ? "선생님, 현재 AI 답변 시스템을 이용하기 위한 API 키가 올바르게 설정되지 않았습니다.\n\n**[해결 방법]**:\n우측 상단의 **설정 메뉴(Settings 톱니바퀴 아이콘) -> Secrets** 메뉴로 이동하셔서 **GEMINI_API_KEY**라는 이름으로 실제 구글 제미나이 API 키를 입력해 주시기 바랍니다!"
        : `선생님, 답변을 불러오는 중에 오류가 발생했습니다.\n\n**[상세 오류 내용]**:\n${error.message || "서버 통신 실패"}\n\n잠시 후 다시 질문해주시기 바랍니다!`;

      setMessages(prev => [
        ...prev, 
        { 
          role: "bot", 
          text: errorText
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitMessage(input);
    }
  };

  const resetChat = () => {
    if (window.confirm("대화 내역을 모두 초기화하고 처음 화면으로 돌아가시겠습니까?")) {
      setMessages([]);
      setInput("");
    }
  };

  // Custom text highlight parser for older user base (dark frosted transparent text tweaks)
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n");

    return (
      <div className="space-y-3">
        {lines.map((line, idx) => {
          let isListItem = false;
          let listSymbol = "";
          let content = line;

          if (line.trim().startsWith("- ")) {
            isListItem = true;
            listSymbol = "•";
            content = line.trim().substring(2);
          } else if (line.trim().startsWith("• ")) {
            isListItem = true;
            listSymbol = "•";
            content = line.trim().substring(2);
          } else if (/^\d+\.\s/.test(line.trim())) {
            isListItem = true;
            const match = line.trim().match(/^(\d+)\.\s(.*)/);
            if (match) {
              listSymbol = `${match[1]}.`;
              content = match[2];
            }
          }

          const elements: React.ReactNode[] = [];
          
          // Regular expression to catch bold text and special highlighted terms in vibrant high-contrast chips
          const regexStr = /(\*\*.*?\*\*|분홍색|흰색|빨간색|파란색|초록색|노란색|검은색|85℃|90℃|1분 이상|144시간|6일|5분간|100ppm|200ppm|3회 이상|전처리|조리|세척)/g;
          const parts = content.split(regexStr);

          parts.forEach((part, pIdx) => {
            if (part!.startsWith("**") && part!.endsWith("**")) {
              const boldVal = part!.slice(2, -2);
              elements.push(<span key={pIdx} className="font-extrabold text-slate-900 underline decoration-orange-500 decoration-3 underline-offset-4">{boldVal}</span>);
            } else if (part === "분홍색") {
              elements.push(<span key={pIdx} className="inline-flex items-center gap-1.5 px-3 py-0.5 mx-1.5 rounded-full bg-pink-100 text-pink-700 border border-pink-300 font-black text-[15px] shadow-sm select-none">분홍색 💗</span>);
            } else if (part === "흰색") {
              elements.push(<span key={pIdx} className="inline-flex items-center gap-1.5 px-3 py-0.5 mx-1.5 rounded-full bg-slate-100 text-slate-755 border border-slate-300 font-black text-[15px] shadow-sm select-none">흰색 🤍</span>);
            } else if (part === "빨간색") {
              elements.push(<span key={pIdx} className="inline-flex items-center gap-1.5 px-3 py-0.5 mx-1.5 rounded-full bg-red-100 text-red-700 border border-red-300 font-black text-[15px] shadow-sm select-none">빨간색 ❤️</span>);
            } else if (part === "파란색") {
              elements.push(<span key={pIdx} className="inline-flex items-center gap-1.5 px-3 py-0.5 mx-1.5 rounded-full bg-blue-100 text-blue-700 border border-blue-300 font-black text-[15px] shadow-sm select-none">파란색 💙</span>);
            } else if (part === "초록색") {
              elements.push(<span key={pIdx} className="inline-flex items-center gap-1.5 px-3 py-0.5 mx-1.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 font-black text-[15px] shadow-sm select-none">초록색 💚</span>);
            } else if (part === "노란색") {
              elements.push(<span key={pIdx} className="inline-flex items-center gap-1.5 px-3 py-0.5 mx-1.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 font-black text-[15px] shadow-sm select-none">노란색 💛</span>);
            } else if (part === "검은색") {
              elements.push(<span key={pIdx} className="inline-flex items-center gap-1.5 px-3 py-0.5 mx-1.5 rounded-full bg-slate-800 text-white border border-slate-900 font-black text-[15px] shadow-sm select-none">검은색 🖤</span>);
            } else if (part === "85℃" || part === "90℃") {
              elements.push(<span key={pIdx} className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded bg-red-100 text-red-700 border border-red-300 font-black text-lg shadow-xs">{part}</span>);
            } else if (part === "1분 이상" || part === "144시간" || part === "6일" || part === "5분간" || part === "3회 이상" || part === "100ppm" || part === "200ppm") {
              elements.push(<span key={pIdx} className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-black text-[17px] shadow-xs">{part}</span>);
            } else if (part === "전처리") {
              elements.push(<span key={pIdx} className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded bg-pink-10 border border-pink-200 text-pink-700 font-bold text-base">{part}</span>);
            } else if (part === "조리") {
              elements.push(<span key={pIdx} className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-bold text-base">{part}</span>);
            } else if (part === "세척") {
              elements.push(<span key={pIdx} className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded bg-red-50 border border-red-200 text-red-700 font-bold text-base">{part}</span>);
            } else {
              elements.push(<span key={pIdx}>{part}</span>);
            }
          });

          if (isListItem) {
            return (
              <div key={idx} className="flex items-start gap-2.5 pl-2 py-1">
                <span className="flex-shrink-0 text-orange-500 font-extrabold mt-1 text-lg select-none">{listSymbol}</span>
                <span className="leading-relaxed text-slate-800 text-lg md:text-xl font-normal">{elements}</span>
              </div>
            );
          }

          return (
            <p key={idx} className="leading-relaxed text-slate-700 text-lg md:text-xl font-normal min-h-[1.5rem]">
              {elements}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div id="app-root" className="min-h-screen bg-[#FCFAF2] font-sans relative selection:bg-orange-500/15 selection:text-orange-950 overflow-hidden text-slate-800 flex flex-col">
      
      {/* Soft warm light-yellow peach backdrop mesh gradient layer */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-yellow-300/20 blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[60%] rounded-full bg-orange-200/15 blur-[100px]"></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-amber-200/20 blur-[80px]"></div>
      </div>

      {/* 1. Frosted Glass Header component (Without Mobile Guide Buttons) */}
      <header id="app-header" className="relative z-10 flex items-center justify-between px-4 py-4 md:px-8 md:py-5 backdrop-blur-md bg-white/40 border-b border-slate-200/60 flex-shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-400 to-orange-600 flex items-center justify-center shadow-md shadow-orange-500/20">
            <ChefHat size={28} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">학교급식 위생 AI 도우미</h1>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold hidden md:block mt-0.5">School Meal Hygiene Intelligent Assistant</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Reset button with modern glass trigger */}
          <button 
            id="reset-chat-btn"
            onClick={resetChat} 
            className="p-3 bg-white/80 border border-slate-200/80 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all text-slate-700 flex items-center gap-2 hover:text-slate-950 shadow-sm"
            aria-label="채팅 초기화"
          >
            <RotateCcw size={18} />
            <span className="text-xs md:text-sm font-bold hidden sm:inline">대화방 리셋</span>
          </button>
        </div>
      </header>

      {/* 2. Main Layout - Single Column Layout (No Sidebar) Optimized for Desktop & Mobile Reading */}
      <main id="app-workspace" className="relative z-10 flex-1 w-full max-w-[1000px] mx-auto p-3 md:p-6 overflow-hidden h-[calc(100vh-5.5rem)] flex flex-col justify-center">
        
        {/* Full screen Chat workspace (Premium frosted pane with shadows) */}
        <section 
          id="chat-workspace-panel" 
          className="w-full flex-1 flex flex-col bg-white/70 backdrop-blur-2xl rounded-3xl border border-white/90 shadow-xl overflow-hidden h-full max-h-[84vh]"
        >
          {/* Scrollable messages container */}
          <div 
            id="chat-messages-scroll" 
            className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-6"
          >
            {messages.length === 0 ? (
              // Initial welcome space elegantly overlaid in transparent style
              <div id="welcome-chat-overlay" className="space-y-6 max-w-2xl mx-auto py-2">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Sparkles size={24} />
                  </div>
                  <div className="bg-white border border-slate-200/80 p-5 rounded-3xl rounded-tl-none shadow-md leading-relaxed text-slate-700">
                    <p className="text-xl md:text-2xl font-black text-slate-900 mb-2">반갑습니다, 급식 위생관리 도우미입니다! 😊</p>
                    <p className="text-base md:text-lg text-slate-600 leading-relaxed font-normal">
                      조리사 선생님! 매일 수백 수천 명 우리 학생들을 위해 땀 흘려 안전하고 위생적인 식탁을 채워주셔서 늘 감사합니다.
                      <br className="my-1.5 block" />
                      본 도우미는 <strong className="text-orange-600 font-extrabold">부산광역시교육청</strong> 최신 지침과 안전 표준 지침서를 철저히 학습했습니다.
                      고무장갑 색상 구분선, 조리 중심온도 기록 기준, 식재료 소독 시간 약품 비율 등 궁금하신 사항을 쉽게 편안하게 찾아보세요.
                    </p>
                  </div>
                </div>

                {/* Grid FAQ Buttons styled beautifully */}
                <div className="mt-4 px-1 space-y-3">
                  <h3 className="font-bold text-slate-500 text-sm tracking-widest uppercase flex items-center gap-1.5 px-1">
                    <HelpCircle size={16} className="text-orange-600" /> 
                    선생님들이 가장 궁금해하는 핵심 위생 문의
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {faqList.map(faq => (
                      <button
                        key={faq.id}
                        id={faq.id}
                        onClick={() => submitMessage(faq.full)}
                        className="bg-white/80 border border-slate-200/80 text-slate-700 p-4 rounded-2xl shadow-xs hover:border-orange-400/30 hover:bg-orange-50/50 hover:text-slate-950 text-left active:scale-98 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <span className="text-[15px] md:text-base font-bold leading-snug">
                          <span className="text-orange-600 font-extrabold mr-1.5">Q.</span> 
                          {faq.short}
                        </span>
                        <ChevronRight size={18} className="text-orange-600 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Chat messaging stack
              <div id="messages-list-stack" className="space-y-6">
                <AnimatePresence initial={false}>
                  {messages.map((msg, index) => {
                    const isUser = msg.role === "user";
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 md:gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                      >
                        {/* Avatar Column */}
                        {!isUser && (
                          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                            <ChefHat size={18} />
                          </div>
                        )}
                        
                        {/* Text card balloon with Frosted effects */}
                        <div 
                          className={`p-4 md:p-5 rounded-2xl max-w-[85%] md:max-w-[78%] shadow-sm break-words border ${
                            isUser 
                              ? "bg-orange-50 border-orange-200/80 rounded-tr-none text-left ml-auto text-slate-800" 
                              : "bg-white border-slate-200/85 rounded-tl-none text-left mr-auto text-slate-800 shadow-xs"
                          }`}
                        >
                          {isUser ? (
                            <p className="leading-relaxed text-lg md:text-xl font-bold tracking-tight">
                              {msg.text}
                            </p>
                          ) : (
                            renderFormattedText(msg.text)
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* In-progress glass typing indicator */}
            {isLoading && (
              <div id="typing-loader-element" className="flex gap-3 md:gap-4 flex-row">
                <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                  <ChefHat size={18} />
                </div>
                <div className="bg-white border border-slate-200/80 p-4 rounded-2xl rounded-tl-none shadow-xs flex items-center justify-center">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-orange-400/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2 h-2 bg-orange-400/75 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                  <span className="ml-2.5 text-xs text-slate-500 font-bold tracking-tight">지침 데이터를 분석하고 있습니다...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom operational chat input within beautiful frosted card bottom section */}
          <footer className="p-3 md:p-4 bg-white/50 border-t border-slate-200/85 flex-shrink-0 relative">
            <div className="absolute inset-0 bg-white/20 blur-lg -z-10 rounded-b-3xl"></div>
            <form onSubmit={handleFormSubmit} className="flex items-end gap-2.5 max-w-4xl mx-auto w-full relative z-10">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="궁금한 위생 수칙(중심온도, 앞치마 색상 등)을 입력해보세요..."
                disabled={isLoading}
                className="flex-1 bg-white border border-slate-200/80 rounded-2xl py-3.5 px-4 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 resize-none max-h-32 text-slate-800 placeholder-slate-400 leading-normal text-md md:text-lg shadow-inner font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                required
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-orange-500 hover:bg-orange-400 text-white rounded-2xl w-14 h-14 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/35 active:scale-95 disabled:bg-slate-100 disabled:border-slate-200/80 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 transition-all cursor-pointer"
                aria-label="메시지 전송"
              >
                <Send size={22} className="ml-0.5 text-white" />
              </button>
            </form>
            <p className="text-center text-[11px] text-slate-500 mt-2 font-semibold select-none tracking-tight">
              ※ 답변 내용은 부산광역시교육청 공식 급식위생 매뉴얼을 준수합니다. 특수 배선 조리 환경은 현장 담당관 권장을 지켜주십시오.
            </p>
          </footer>
        </section>
      </main>

      {/* Sub-footer / Legal Office info */}
      <footer className="relative z-10 px-4 md:px-8 py-3 bg-slate-100/90 border-t border-slate-200/80 flex flex-col sm:flex-row justify-between items-center text-slate-500 gap-1.5 flex-shrink-0">
        <p className="text-[10px] tracking-widest font-semibold uppercase text-center sm:text-left text-slate-500">
          © 2026 Busan Metropolitan Office of Education • Food Hygiene Assistant System
        </p>
        <div className="flex gap-4 text-[10px] font-bold tracking-wider uppercase select-none text-slate-400">
          <span>Model: Gemini 2.5/3.5 Flash</span>
          <span className="flex items-center gap-1 text-emerald-600"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Network Stable</span>
        </div>
      </footer>
    </div>
  );
}
