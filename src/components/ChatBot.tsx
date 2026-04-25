/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Send, User, Bot, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import { BudgetAllocation, Liability, FinancialAccount, PillarStatus } from '../types';
import { getFinancialAdvice } from '../services/geminiService';
import { cn } from '../lib/utils';

interface ChatBotProps {
  context: {
    income: number;
    savingsTarget: number;
    allocations: BudgetAllocation[];
    liabilities: Liability[];
    accounts: FinancialAccount[];
  };
  pillars: PillarStatus[];
}

export default function ChatBot({ context, pillars }: ChatBotProps) {
  const [messages, setMessages] = React.useState<{ role: 'user' | 'assistant'; text: string }[]>([
    { role: 'assistant', text: "สวัสดีครับ ผมคือสถาปนิกการเงิน AI ยินดีที่ได้ช่วยคุณวางแผนจัดการงบประมาณและหนี้สิน! ผมพร้อมวิเคราะห์แผนภาพรวม CSR ของคุณ และช่วยหารอยรั่วทางการเงินเพื่อเป้าหมาย 2.88 ล้านบาทครับ" }
  ]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const SUGGESTIONS = [
    "วิเคราะห์ภาพรวมและแนะนำ",
    "หนี้สินของฉันเยอะไปไหม?",
    "เงินสำรองฉุกเฉินเพียงพอหรือยัง?",
    "ต้องออมเดือนละเท่าไหร่ให้ถึงเป้าหมาย?"
  ];

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    const advice = await getFinancialAdvice(context, pillars, userText);
    
    setMessages(prev => [...prev, { role: 'assistant', text: advice }]);
    setIsLoading(false);
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
    // Auto-send if needed, but better to just set input or use a separate fast-track function
    setTimeout(() => {
      const btn = document.getElementById('chat-send-btn');
      btn?.click();
    }, 10);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 pb-4 scrollbar-hide"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((msg, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-3 rounded-xl text-[13px] leading-relaxed border",
                msg.role === 'user' 
                  ? "bg-blue-600 text-white border-blue-700 ml-6 rounded-tr-none shadow-sm" 
                  : "bg-brand-surface text-brand-text border-brand-border rounded-tl-none"
              )}
            >
              {msg.role === 'assistant' && (
                <p className="text-[10px] font-bold text-blue-700 mb-1 uppercase tracking-widest">สถาปนิกการเงิน</p>
              )}
              <div className={cn(
                "markdown-content",
                msg.role === 'user' ? "text-white" : "text-brand-text"
              )}>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="mb-0.5">{children}</li>,
                    strong: ({ children }) => <strong className={cn("font-bold", msg.role === 'assistant' ? "text-blue-700" : "text-white")}>{children}</strong>,
                    code: ({ children }) => <code className="bg-brand-bg px-1 rounded font-mono text-[11px]">{children}</code>
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-brand-surface border border-brand-border p-3 rounded-xl rounded-tl-none w-12 flex justify-center"
            >
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Suggested Prompts */}
      {!isLoading && messages.length < 5 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTIONS.map((text, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * i }}
              onClick={() => handleSuggestion(text)}
              className="text-[11px] font-bold py-1.5 px-3 rounded-full bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
            >
              {text}
            </motion.button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="pt-4 border-t border-brand-border mt-auto">
        <div className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="สอบถามข้อมูลพอร์ต..."
            className="w-full bg-brand-bg border-none rounded-lg p-3 pr-10 text-[13px] font-medium text-brand-text focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-brand-secondary"
          />
          <button
            id="chat-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-brand-border transition-colors text-brand-secondary hover:text-blue-600 disabled:opacity-0"
          >
            <Send size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
