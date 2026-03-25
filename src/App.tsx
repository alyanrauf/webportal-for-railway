/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Sparkles, LogIn, CheckCircle2, X, MessageCircle, Phone, PhoneOff } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { startNewChat, handleToolCalls, initSalonData, SalonSettings } from "./services/geminiService";
import { VoiceCall } from "./components/VoiceCall";
import { Dashboard } from "./components/admin/Dashboard";
import { Settings as AdminSettings } from "./components/admin/Settings";
import { Packages as AdminPackages } from "./components/admin/Packages";
import { Appointments as AdminAppointments } from "./components/admin/Appointments";
import { Login as AdminLogin } from "./components/admin/Login";
import { auth, db, doc, getDoc } from "./services/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface Message {
  role: "user" | "model";
  content: string;
}

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const adminEmail = "alyanraufarpk@gmail.com";
        if (u.email === adminEmail) {
          setIsAdmin(true);
          setLoading(false);
        } else {
          try {
            const userDoc = await getDoc(doc(db, "users", u.uid));
            setIsAdmin(userDoc.exists() && userDoc.data().role === "admin");
          } catch (e) {
            console.error("Admin check error:", e);
            setIsAdmin(false);
          } finally {
            setLoading(false);
          }
        }
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F7F7F4]"><div className="w-8 h-8 border-4 border-[#5A5A40]/30 border-t-[#5A5A40] rounded-full animate-spin" /></div>;
  if (!user || !isAdmin) return <Navigate to="/admin/login" />;
  return <>{children}</>;
};

function Widget() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<SalonSettings | null>(null);
  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const queryParams = new URLSearchParams(window.location.search);
  const isEmbedded = queryParams.get('embedded') === 'true';
  const customBotName = queryParams.get('botName');
  const customPrimaryColor = queryParams.get('primaryColor');

  useEffect(() => {
    console.log("AI Receptionist App: Widget component mounted", { isEmbedded, customBotName, customPrimaryColor });
  }, []);

  useEffect(() => {
    // If embedded, start closed
    if (isEmbedded) {
      setIsOpen(false);
    } else {
      setIsOpen(true); // Full page mode starts open
    }
  }, [isEmbedded]);

  useEffect(() => {
    const init = async () => {
      try {
        const s = await initSalonData();
        setSettings(s);
        
        if (!s.geminiApiKey) {
          setMessages([{ role: "model", content: "👋 Welcome! I'm your AI receptionist. ✨\n\nIt looks like my AI brain (Gemini API Key) hasn't been configured yet. Please go to the **Admin Portal > Settings** to add your API key so I can start helping your clients! 🙏" }]);
          return;
        }

        const c = await startNewChat(s);
        setChat(c);
        
        // Add welcome message if chat is ready
        setMessages([{ role: "model", content: `👋 Hello! Welcome to **${s.salonName}**. I'm your AI receptionist. ✨\n\nHow can I help you today? You can ask about our services, prices, or book an appointment! 💇‍♀️💅` }]);
      } catch (error: any) {
        console.error("Initialization error:", error);
        setMessages([{ role: "model", content: "⚠️ Oops! I'm having some trouble starting up. Please check the console for details or contact support. 🙏" }]);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const prevMessagesLengthRef = useRef(0);
  useEffect(() => {
    const newLength = messages.length;
    const grew = newLength > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = newLength;
    if (grew && !isOpen && messages[messages.length - 1]?.role === "model") {
      setHasUnread(true);
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const message = {
      type: 'WIDGET_RESIZE',
      width: isOpen ? '400px' : '80px',
      height: isOpen ? '600px' : '80px'
    };
    window.parent.postMessage(message, '*');
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setHasUnread(false);
  };

  const startVoiceCall = async () => {
    if (isCalling) {
      setIsCalling(false);
      return;
    }

    if (!window.isSecureContext) {
      setMessages(prev => [...prev, { role: "model", content: "⚠️ Voice calls require a secure connection (HTTPS). Please ensure your site is running over HTTPS. 🙏" }]);
      return;
    }

    setIsCalling(true);
  };

  const sendMessage = async (textareaEl?: HTMLTextAreaElement) => {
    if (!input.trim() || isLoading || !chat) return;

    if (textareaEl) textareaEl.style.height = "42px";

    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      let response = await chat.sendMessage({ message: userMsg });
      let toolResults = await handleToolCalls(response);

      while (toolResults && toolResults.length > 0) {
        response = await chat.sendMessage({ message: toolResults });
        toolResults = await handleToolCalls(response);
      }

      setMessages(prev => [...prev, { role: "model", content: response.text || "I'm sorry, I couldn't process that." }]);
    } catch (error: any) {
      console.error("Chat Error:", error);
      let errorMsg = "Oops! Something went wrong. Please try again later. 🙏";

      if (error.message?.includes("Safety")) {
        errorMsg = "I'm sorry, but I can't discuss that topic. Let's talk about our salon services! ✨";
      } else if (error.message?.includes("409") || error.message?.includes("unavailable")) {
        errorMsg = "That time slot is actually taken! Please try another time or ask me for suggestions. 🥰";
      }

      setMessages(prev => [...prev, { role: "model", content: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Background page — only visible in dev */}
      {!isEmbedded && <div className="min-h-screen bg-transparent" />}

      {/* Chat Widget */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
        <AnimatePresence>
          {isCalling && settings && (
            <VoiceCall settings={settings} onClose={() => setIsCalling(false)} />
          )}
        </AnimatePresence>

        {/* Chat Panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="w-[370px] max-w-[calc(100vw-2rem)] bg-white rounded-[28px] shadow-2xl border border-[#E5E5DF] flex flex-col overflow-hidden"
              style={{ height: "520px" }}
            >
              {/* Header */}
              <div 
                className="text-white px-5 py-4 flex items-center justify-between shrink-0"
                style={{ backgroundColor: customPrimaryColor || "#5A5A40" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                    <Sparkles size={15} className="text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-wide leading-tight font-sans">{customBotName || settings?.salonName || "Beauty Care by Nabila"}</p>
                    <p className="text-[10px] opacity-60 font-sans uppercase tracking-widest">AI Receptionist</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Voice Call Button */}
                  <button
                    onClick={startVoiceCall}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sans transition-colors ${
                      isCalling
                        ? "bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30"
                        : "bg-white/15 hover:bg-white/25"
                    }`}
                  >
                    {isCalling ? <PhoneOff size={11} /> : <Phone size={11} />}
                    {isCalling ? "End" : "Call"}
                  </button>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="ml-1 p-1.5 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 font-sans scroll-smooth bg-[#FAFAF7]"
              >
                {messages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex justify-start"
                  >

                  </motion.div>
                )}

                <AnimatePresence initial={false}>
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[88%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "text-white rounded-tr-none"
                            : "bg-[#F0F0E8] text-[#3A3A2A] rounded-tl-none border border-[#E5E5DF]"
                        }`}
                        style={msg.role === "user" ? { backgroundColor: customPrimaryColor || "#5A5A40" } : {}}
                      >
                        <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-[#F0F0E8] px-4 py-3 rounded-2xl rounded-tl-none border border-[#E5E5DF] flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-[#5A5A40] rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-[#5A5A40] rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-[#5A5A40] rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-[#E5E5DF] bg-white shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={(el) => { if (el) (window as any)._chatTextarea = el; }}
                    rows={1}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e.currentTarget as HTMLTextAreaElement);
                      }
                    }}
                    placeholder="Ask about packages or book..."
                    className="flex-1 bg-[#F7F7F4] border border-[#E5E5DF] rounded-2xl py-2.5 pl-5 pr-4 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans text-sm placeholder:text-[#9A9A80] resize-none overflow-hidden leading-relaxed"
                    style={{ minHeight: "42px", maxHeight: "120px" }}
                  />
                  <button
                    onClick={() => sendMessage((window as any)._chatTextarea)}
                    disabled={isLoading || !input.trim()}
                    className="shrink-0 w-10 h-10 text-white rounded-full flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40"
                    style={{ backgroundColor: customPrimaryColor || "#5A5A40" }}
                  >
                    <Send size={16} />
                  </button>
                </div>
                <p className="text-center text-[10px] text-[#9A9A80] font-sans mt-2">
                  {settings?.salonHours || "Mon–Sun · 11 AM – 9 PM"} · {settings?.salonAddress || "Lahore, Pakistan"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Trigger Button */}
        <motion.button
          onClick={isOpen ? () => setIsOpen(false) : handleOpen}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          className="relative w-14 h-14 text-white rounded-full shadow-xl flex items-center justify-center hover:opacity-90 transition-opacity"
          style={{ backgroundColor: customPrimaryColor || "#5A5A40" }}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <X size={22} />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <MessageCircle size={22} />
              </motion.span>
            )}
          </AnimatePresence>

          {/* Unread dot */}
          <AnimatePresence>
            {hasUnread && !isOpen && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-[#D4AF37] rounded-full border-2 border-white"
              />
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
        <Route path="/admin/packages" element={<ProtectedRoute><AdminPackages /></ProtectedRoute>} />
        <Route path="/admin/appointments" element={<ProtectedRoute><AdminAppointments /></ProtectedRoute>} />
        
        {/* Widget Route (Full page) */}
        <Route path="/widget" element={<Widget />} />
        
        {/* Default Route (Widget) */}
        <Route path="/" element={<Widget />} />
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
