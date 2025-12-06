import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Send,
  Plus,
  LogOut,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  Menu,
  User,
  MoreVertical,
  CircleUser,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

const API_BASE_URL = "http://localhost:8000";

interface User {
  id: number;
  email: string;
  username: string;
}

interface Message {
  id: number;
  content: string;
  role: "user" | "assistant";
  created_at: string;
}

interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

const parseMarkdown = (text: string) => {
  let cleanedText = text
    .replace(/\[\^(\d+)\^\]/g, "[$1]")
    .replace(/\[\^(\d+)\^\]:/g, "[$1]:");

  const parts: { type: string; content: string }[] = [];
  let lastIndex = 0;

  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  let match;

  while ((match = regex.exec(cleanedText)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: cleanedText.slice(lastIndex, match.index),
      });
    }

    const matchedText = match[0];
    if (matchedText.startsWith("**") && matchedText.endsWith("**")) {
      parts.push({
        type: "bold",
        content: matchedText.slice(2, -2),
      });
    } else if (matchedText.startsWith("*") && matchedText.endsWith("*")) {
      parts.push({
        type: "italic",
        content: matchedText.slice(1, -1),
      });
    } else if (matchedText.startsWith("`") && matchedText.endsWith("`")) {
      parts.push({
        type: "code",
        content: matchedText.slice(1, -1),
      });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < cleanedText.length) {
    parts.push({
      type: "text",
      content: cleanedText.slice(lastIndex),
    });
  }

  return parts.length > 0 ? parts : [{ type: "text", content: cleanedText }];
};

const MessageContent = ({ content }: { content: string }) => {
  const parts = parseMarkdown(content);

  return (
    <p className="text-base leading-relaxed whitespace-pre-wrap text-slate-50">
      {parts.map((part, index) => {
        if (part.type === "bold") {
          return (
            <strong key={index} className="font-semibold">
              {part.content}
            </strong>
          );
        }
        return <span key={index}>{part.content}</span>;
      })}
    </p>
  );
};

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationWithMessages | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUser();
    loadConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.messages]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId !== null) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openMenuId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const truncateTitle = (title: string, maxLength: number = 27) => {
    return title.length > maxLength ? title.slice(0, maxLength) + "..." : title;
  };

  const getToken = () => {
    return localStorage.getItem("token");
  };

  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      setSessionExpired(true);
      throw new Error("Session expired");
    }

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "An error occurred" }));
      throw new Error(error.detail || "Request failed");
    }

    return response.json();
  };

  const loadUser = async () => {
    try {
      const userData = await apiFetch("/users/me");
      setUser(userData);
    } catch (error: any) {
      console.error("Failed to load user:", error);
      if (error.message !== "Session expired") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    } finally {
      setInitialLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      const data = await apiFetch("/conversations");
      setConversations(data);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  const createNewConversation = async () => {
    try {
      const newConv = await apiFetch("/conversations", {
        method: "POST",
        body: JSON.stringify({ title: "New Chat" }),
      });
      setConversations([newConv, ...conversations]);
      setSelectedConversation({ ...newConv, messages: [] });
      setMessage("");
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const startConversationWithPrompt = async (
    title: string,
    initialPrompt: string
  ) => {
    try {
      const newConv = await apiFetch("/conversations", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      setConversations([newConv, ...conversations]);
      setSelectedConversation({ ...newConv, messages: [] });
      setMessage(initialPrompt);
    } catch (error) {
      console.error("Failed to start quick action conversation:", error);
    }
  };

  const selectConversation = async (id: number) => {
    try {
      const conv = await apiFetch(`/conversations/${id}`);
      setSelectedConversation(conv);
      setMessage("");
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedConversation || loading) return;

    const userMessage = message;
    const tempMessageId = Date.now();

    const tempUserMessage: Message = {
      id: tempMessageId,
      content: userMessage,
      role: "user",
      created_at: new Date().toISOString(),
    };

    setSelectedConversation((prev) => {
      if (!prev) return prev;
      return { ...prev, messages: [...prev.messages, tempUserMessage] };
    });

    setMessage("");
    setLoading(true);

    try {
      await apiFetch(`/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: userMessage }),
      });

      const updatedConv = await apiFetch(
        `/conversations/${selectedConversation.id}`
      );

      setSelectedConversation(updatedConv);
      setLoading(false);
      loadConversations();
    } catch (error) {
      console.error("Failed to send message:", error);

      setSelectedConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.filter((msg) => msg.id !== tempMessageId),
        };
      });

      setMessage(userMessage);
      setLoading(false);
    }
  };

  const handleMessageKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const deleteConv = async (id: number) => {
    try {
      await apiFetch(`/conversations/${id}`, {
        method: "DELETE",
      });
      setConversations(conversations.filter((c) => c.id !== id));
      if (selectedConversation?.id === id) {
        setSelectedConversation(null);
        setMessage("");
      }
      setOpenMenuId(null);
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const startEditing = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setOpenMenuId(null);
  };

  const saveTitle = async (id: number) => {
    try {
      await apiFetch(`/conversations/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title: editTitle }),
      });
      setConversations(
        conversations.map((c) => (c.id === id ? { ...c, title: editTitle } : c))
      );
      if (selectedConversation?.id === id) {
        setSelectedConversation({ ...selectedConversation, title: editTitle });
      }
      setEditingId(null);
    } catch (error) {
      console.error("Failed to update title:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const handleRefresh = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const handleGoToSettings = () => {
    window.location.href = "/profile";
  };

  const recentConversations = [...conversations]
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
    .slice(0, 5);

  if (sessionExpired) {
    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md mx-4 shadow-2xl">
          <div className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-semibold mb-2 text-slate-50">
              Session expired
            </h2>
            <p className="text-slate-400 mb-6">
              Your session has ended. Please log in again to continue.
            </p>
            <Button
              onClick={handleRefresh}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full py-3"
            >
              Log in again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 bg-slate-900/80 border-r border-slate-700 flex flex-col overflow-hidden shadow-lg shadow-slate-900/40 flex-shrink-0`}
      >
        <div className="px-4 pt-4 pb-3 border-b border-slate-700 flex items-center justify-between">
          <span className="text-xs font-semibold tracking-[0.2em] text-emerald-400 uppercase">
            Course Co-Pilot
          </span>
        </div>

        <div className="p-3 border-b border-slate-700">
          <Button
            onClick={createNewConversation}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            New chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <div key={conv.id} className="group relative">
                {editingId === conv.id ? (
                  <div className="flex items-center gap-1 p-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-50 rounded-xl"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-emerald-400 hover:bg-slate-800 rounded-full"
                      onClick={() => saveTitle(conv.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:bg-slate-800 rounded-full"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-sm transition-colors ${
                      selectedConversation?.id === conv.id
                        ? "bg-slate-800 border border-slate-600"
                        : "hover:bg-slate-800/60"
                    }`}
                    onClick={() => selectConversation(conv.id)}
                  >
                    <span
                      className="truncate flex-1 text-slate-100"
                      title={conv.title}
                    >
                      {truncateTitle(conv.title)}
                    </span>
                    <div className="relative ml-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(
                            openMenuId === conv.id ? null : conv.id
                          );
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {openMenuId === conv.id && (
                        <div
                          className="absolute right-0 mt-1 w-48 bg-slate-900 rounded-xl shadow-lg border border-slate-700 py-1 z-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="w-full px-4 py-2 text-left text-xs hover:bg-slate-800 flex items-center text-slate-100 rounded-xl"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(conv);
                            }}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Rename
                          </button>
                          <button
                            className="w-full px-4 py-2 text-left text-xs hover:bg-slate-800 flex items-center text-rose-400 rounded-xl"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConv(conv.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-slate-700 flex-shrink-0">
          <div className="bg-slate-800/50 rounded-xl p-2 space-y-1">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <User className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate">
                  {user?.username}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-xl h-8"
                onClick={handleGoToSettings}
              >
                <CircleUser className="h-4 w-4 mr-1" />
                <span className="text-xs">Profile</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-xl h-8"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span className="text-xs">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="border-b border-slate-700 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-4 py-3 flex items-center gap-3 shadow-lg shadow-slate-900/40 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:bg-slate-800 rounded-full"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-2">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Your academic journey starts here
            </p>
            <h2 className="text-sm sm:text-base font-semibold text-slate-50">
              {selectedConversation?.title || "Course Planning Copilot"}
            </h2>
          </div>
        </div>

        {selectedConversation ? (
          <>
            {/* Messages area with fixed scrolling */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto min-h-0 bg-slate-950"
            >
              <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {selectedConversation.messages.length === 0 && !loading ? (
                  <div className="text-center py-12">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <MessageSquare className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-3 text-slate-50">
                      How can I help you plan your semester?
                    </h3>
                    <p className="text-slate-400">
                      Ask about course combinations, prerequisites, or professor
                      insights to get started.
                    </p>
                  </div>
                ) : (
                  <>
                    {selectedConversation.messages.map((msg) => (
                      <div key={msg.id}>
                        {msg.role === "user" ? (
                          <div className="flex justify-end">
                            <div className="flex gap-3 items-start max-w-[70%]">
                              <div className="inline-block rounded-2xl px-5 py-3 bg-slate-800 border border-slate-700 text-slate-50 shadow-lg shadow-slate-900/40">
                                <MessageContent content={msg.content} />
                              </div>
                              <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center">
                                  <User className="h-4 w-4 text-slate-200" />
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-3 items-start">
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/40">
                                <Sparkles className="h-4 w-4 text-slate-950" />
                              </div>
                            </div>
                            <div className="flex-1 max-w-full">
                              <div className="inline-block rounded-2xl px-5 py-3 bg-slate-900/80 border border-slate-700 text-slate-50 shadow-lg shadow-slate-900/60">
                                <MessageContent content={msg.content} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {loading && (
                      <div className="flex gap-3 items-start">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/40">
                            <Sparkles className="h-4 w-4 text-slate-950" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="inline-block rounded-2xl px-5 py-3 bg-slate-900/80 border border-slate-700">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                              <div
                                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                                style={{ animationDelay: "150ms" }}
                              />
                              <div
                                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                                style={{ animationDelay: "300ms" }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input area */}
            <div className="border-t border-slate-700 bg-slate-950/95 shadow-lg shadow-slate-900/40 flex-shrink-0">
              <div className="max-w-4xl mx-auto px-4 py-4">
                <div className="flex gap-3 items-end bg-slate-900/80 rounded-2xl p-2 border border-slate-700 shadow-lg shadow-slate-900/60">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleMessageKeyPress}
                    placeholder="Ask about courses, prerequisites, or professors..."
                    disabled={loading}
                    className="flex-1 border-0 bg-transparent text-slate-50 placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={loading || !message.trim()}
                    className="bg-emerald-500 hover:bg-emerald-400 rounded-xl h-10 w-10 p-0 text-slate-950 disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-center text-slate-500 mt-3">
                  Course Co-Pilot uses AI and may make mistakes. Double-check
                  important academic decisions.
                </p>
                <p className="text-[11px] text-center text-slate-600 mt-1">
                  By using Course Co-Pilot, you agree to our{" "}
                  <Link
                    to="/privacy"
                    className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                  >
                    Privacy &amp; Data Use
                  </Link>{" "}
                  policy.
                </p>
                <p className="text-[11px] text-center text-slate-600">
                  Review the{" "}
                  <Link
                    to="/data-sources"
                    className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                  >
                    Data Sources &amp; Accuracy
                  </Link>{" "}
                  overview or our{" "}
                  <Link
                    to="/fairness"
                    className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                  >
                    Fairness &amp; Limitations
                  </Link>{" "}
                  note.
                </p>
              </div>
            </div>
          </>
        ) : (
          // DASHBOARD VIEW
          <div className="flex-1 overflow-y-auto min-h-0 bg-slate-950">
            <div className="flex items-center justify-center px-4 py-10">
              <div className="max-w-5xl w-full mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-400 mb-2 flex items-center justify-center gap-2">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Your academic journey · Planning dashboard
                  </p>
                  <h1 className="text-3xl md:text-4xl font-semibold text-slate-50 mb-2">
                    Hi{user?.username ? `, ${user.username}` : ""} 👋
                  </h1>
                  <p className="text-sm md:text-base text-slate-300 max-w-xl mx-auto">
                    What would you like to do today? Plan a semester, explore
                    electives, or check that you're still on track to graduate.
                  </p>
                </div>

                {/* Quick Actions Grid */}
                <div className="grid md:grid-cols-2 gap-6 items-stretch mb-8 mx-auto max-w-3xl">
                  <button
                    onClick={() =>
                      startConversationWithPrompt(
                        "Plan my next semester",
                        "Help me plan my next semester schedule. Suggest a few courses that provide a manageable workload while keeping me on track to meet my degree requirements"
                      )
                    }
                    className="w-full text-left bg-slate-900/80 border border-slate-700 rounded-2xl p-6 hover:border-emerald-500/70 hover:bg-slate-900 transition-colors shadow-lg shadow-slate-900/40"
                  >
                    <div className="inline-flex h-12 w-12 rounded-xl bg-emerald-500/20 items-center justify-center mb-3">
                      <Sparkles className="h-6 w-6 text-emerald-300" />
                    </div>
                    <p className="text-base font-semibold text-slate-50 mb-2">
                      Plan my next semester
                    </p>
                    <p className="text-sm text-slate-400">
                      Build an ideal schedule with credit limits, time
                      preferences, and graduation goals.
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      startConversationWithPrompt(
                        "Explore electives",
                        "Suggest interesting electives for my program, especially courses related to my interests. Explain why each course might be a good fit."
                      )
                    }
                    className="w-full text-left bg-slate-900/80 border border-slate-700 rounded-2xl p-6 hover:border-emerald-500/70 hover:bg-slate-900 transition-colors shadow-lg shadow-slate-900/40"
                  >
                    <div className="inline-flex h-12 w-12 rounded-xl bg-emerald-500/20 items-center justify-center mb-3">
                      <MessageSquare className="h-6 w-6 text-emerald-300" />
                    </div>
                    <p className="text-base font-semibold text-slate-50 mb-2">
                      Explore electives
                    </p>
                    <p className="text-sm text-slate-400">
                      Discover electives that match your interests, workload
                      preferences, and time constraints.
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      startConversationWithPrompt(
                        "Compare courses",
                        "Help me compare two or more courses in terms of workload, difficulty, overlap, and how they fit my goals."
                      )
                    }
                    className="w-full text-left bg-slate-900/80 border border-slate-700 rounded-2xl p-6 hover:border-emerald-500/70 hover:bg-slate-900 transition-colors shadow-lg shadow-slate-900/40"
                  >
                    <div className="inline-flex h-12 w-12 rounded-xl bg-emerald-500/20 items-center justify-center mb-3">
                      <Sparkles className="h-6 w-6 text-emerald-300" />
                    </div>
                    <p className="text-base font-semibold text-slate-50 mb-2">
                      Compare courses
                    </p>
                    <p className="text-sm text-slate-400">
                      See side-by-side differences in workload, topics, and
                      sequence recommendations.
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      startConversationWithPrompt(
                        "Ask about a professor",
                        "Give me insight into a professor's teaching style, grading, and typical workload for their courses."
                      )
                    }
                    className="w-full text-left bg-slate-900/80 border border-slate-700 rounded-2xl p-6 hover:border-emerald-500/70 hover:bg-slate-900 transition-colors shadow-lg shadow-slate-900/40"
                  >
                    <div className="inline-flex h-12 w-12 rounded-xl bg-emerald-500/20 items-center justify-center mb-3">
                      <User className="h-6 w-6 text-emerald-300" />
                    </div>
                    <p className="text-base font-semibold text-slate-50 mb-2">
                      Ask about a professor
                    </p>
                    <p className="text-sm text-slate-400">
                      Learn about teaching style, expectations, and what
                      previous students say.
                    </p>
                  </button>
                </div>

                {/* Recent Plans */}
                <div className="max-w-4xl mx-auto">
                  <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 shadow-lg shadow-slate-900/60">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-slate-50">
                        Recent plans
                      </h3>
                      {recentConversations.length > 0 && (
                        <span className="text-xs text-slate-500">
                          Last {recentConversations.length} chats
                        </span>
                      )}
                    </div>
                    {recentConversations.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        You haven't started any planning chats yet. Use a quick
                        action above to begin.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {recentConversations.map((conv) => (
                          <button
                            key={conv.id}
                            onClick={() => selectConversation(conv.id)}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-950/40 hover:bg-slate-800/70 border border-transparent hover:border-slate-600 text-left transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-100 truncate">
                                {truncateTitle(conv.title, 40)}
                              </p>
                              <p className="text-xs text-slate-500">
                                Last updated{" "}
                                {new Date(conv.updated_at).toLocaleString()}
                              </p>
                            </div>
                            <span className="text-xs text-emerald-300 ml-3">
                              Continue
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-6 text-center text-[11px] text-slate-600">
                  By using Course Co-Pilot, you agree to our{" "}
                  <Link
                    to="/privacy"
                    className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                  >
                    Privacy &amp; Data Use
                  </Link>{" "}
                  policy.
                </div>
                <p className="text-[11px] text-center text-slate-600 mt-1">
                  Learn more about our{" "}
                  <Link
                    to="/data-sources"
                    className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                  >
                    Data Sources &amp; Accuracy
                  </Link>
                  .
                </p>
                <p className="text-[11px] text-center text-slate-600 mt-1">
                  Review our{" "}
                  <Link
                    to="/fairness"
                    className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                  >
                    Fairness &amp; Limitations
                  </Link>{" "}
                  statement.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
