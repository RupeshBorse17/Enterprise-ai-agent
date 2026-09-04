"use client";

import React, { useState, useRef, useEffect } from "react";

const API_BASE_URL = "https://enterprise-ai-agent-r1df.onrender.com";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeFile, setActiveFile] = useState(null);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // PDF Upload Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "PDF upload failed.");

      setActiveFile(file.name);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: `📄 **Document Uploaded:** \`${file.name}\` successfully processed into ChromaDB! Ask your questions below.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: `⚠️ **Server Error:** ${err.message || "FastAPI Server connection failed on port 8000."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Send Chat Query with Timeout Control
  const handleSend = async (customQuery) => {
    const query = customQuery || input;
    if (!query.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customQuery) setInput("");
    setIsLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) throw new Error(data.detail || `Server status: ${response.status}`);

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: data.answer || "No response text received.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      clearTimeout(timeoutId);
      let errorMsg = "";
      if (err.name === "AbortError") {
        errorMsg = "⏱️ **Timeout Error:** FastAPI server took longer than 15 seconds to respond.";
      } else {
        errorMsg = `⚠️ **Connection Error:** ${err.message || `Unable to reach FastAPI backend on ${API_BASE_URL}`}`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          sender: "ai",
          text: errorMsg,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d1527] text-slate-100 font-sans">
      {/* Header */}
      <header className="h-16 border-b border-slate-800/80 bg-[#0f192e] px-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
          AI
        </div>
        <div>
          <h1 className="font-bold text-base text-white tracking-wide">Enterprise AI RAG Agent</h1>
          <p className="text-[11px] text-blue-400 font-medium">Powered by Gemini & ChromaDB</p>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl w-full mx-auto flex flex-col gap-6">
        {/* Upload Card */}
        <div className="bg-[#131f37] border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl">
              📄
            </div>
            <div>
              <h2 className="font-semibold text-sm text-white">Upload Document</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeFile ? `Active: ${activeFile}` : "Upload any PDF to extract insights instantly"}
              </p>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-semibold rounded-xl text-xs transition-all shadow-md disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Choose PDF"}
          </button>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 bg-[#131f37] border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between min-h-[420px] shadow-xl overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-5 my-auto">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-2xl shadow-inner">
                  🤖
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    How can I assist you with your document today?
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Upload a document above or try asking one of these quick queries:
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => handleSend("Summarize this document.")}
                    className="px-4 py-2 bg-[#1a2947] hover:bg-blue-600/20 border border-slate-700/80 hover:border-blue-500/50 rounded-xl text-xs text-slate-200 transition-all flex items-center gap-2"
                  >
                    💡 Summarize this document
                  </button>
                  <button
                    onClick={() => handleSend("What are the key points?")}
                    className="px-4 py-2 bg-[#1a2947] hover:bg-blue-600/20 border border-slate-700/80 hover:border-blue-500/50 rounded-xl text-xs text-slate-200 transition-all flex items-center gap-2"
                  >
                    💡 What are the key points?
                  </button>
                  <button
                    onClick={() => handleSend("Explain the main terms.")}
                    className="px-4 py-2 bg-[#1a2947] hover:bg-blue-600/20 border border-slate-700/80 hover:border-blue-500/50 rounded-xl text-xs text-slate-200 transition-all flex items-center gap-2"
                  >
                    💡 Explain the main terms
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-3xl ${
                    msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      msg.sender === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-blue-400 border border-slate-700"
                    }`}
                  >
                    {msg.sender === "user" ? "U" : "AI"}
                  </div>
                  <div
                    className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-[#1a2947] text-slate-200 border border-slate-700/60 rounded-tl-none"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <span className="text-[9px] text-slate-400 block mt-1 font-mono text-right">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex gap-3 mr-auto">
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-blue-400 flex items-center justify-center text-xs font-bold">
                  AI
                </div>
                <div className="p-3.5 bg-[#1a2947] border border-slate-700/60 rounded-xl rounded-tl-none text-xs text-slate-300 flex items-center gap-2">
                  <span className="animate-spin">⏳</span> Processing query...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Search Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about the document..."
              className="flex-1 bg-[#0d1527] border border-slate-700/80 focus:border-blue-500 text-xs text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-xs rounded-xl transition-all shadow-md"
            >
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}