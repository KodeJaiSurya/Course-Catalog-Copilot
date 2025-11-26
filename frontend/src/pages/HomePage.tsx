import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Settings,
} from "lucide-react";

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

// Simple Markdown parser for bold text
const parseMarkdown = (text: string) => {
  // Convert [^1^] to [1] and [^1^]: to [1]:
  let cleanedText = text
    .replace(/\[\^(\d+)\^\]/g, "[$1]") // [^1^] becomes [1]
    .replace(/\[\^(\d+)\^\]:/g, "[$1]:"); // [^1^]: becomes [1]:

  const parts = [];
  let lastIndex = 0;

  // Combined regex for bold, italic, and inline code
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
    <p className="text-base leading-relaxed whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.type === "bold") {
          return (
            <strong key={index} className="font-bold">
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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUser();
    loadConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.messages]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuId !== null) {
        setOpenMenuId(null);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setShowUserMenu(false);
      }
      if (
        plusMenuRef.current &&
        !plusMenuRef.current.contains(e.target as Node)
      ) {
        setShowPlusMenu(false);
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

    // Handle 401 Unauthorized (expired/invalid token)
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
    } catch (error) {
      console.error("Failed to load user:", error);
      if (error.message !== "Session expired") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
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
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const selectConversation = async (id: number) => {
    try {
      const conv = await apiFetch(`/conversations/${id}`);
      setSelectedConversation(conv);
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  const simulateStreaming = (text: string, tempAiId: number) => {
    return new Promise<void>((resolve) => {
      let index = 0;
      const interval = setInterval(() => {
        index++;
        setSelectedConversation((conv) => {
          if (!conv) return conv;
          const updatedMessages = conv.messages.map((m) =>
            m.id === tempAiId ? { ...m, content: text.slice(0, index) } : m
          );
          return { ...conv, messages: updatedMessages };
        });

        if (index >= text.length) {
          clearInterval(interval);
          resolve();
        }
      }, 20);
    });
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

      const latestAiMessage =
        updatedConv.messages[updatedConv.messages.length - 1];

      if (latestAiMessage && latestAiMessage.role === "assistant") {
        const tempAiId = Date.now() + 1;
        setSelectedConversation((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: [
              ...prev.messages,
              { ...latestAiMessage, id: tempAiId, content: "" },
            ],
          };
        });

        setLoading(false);

        await simulateStreaming(latestAiMessage.content, tempAiId);

        setSelectedConversation(updatedConv);
      } else {
        setSelectedConversation(updatedConv);
        setLoading(false);
      }

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

  const goToProfile = () => {
    window.location.href = "/profile";
  };

  const handlePrefixSelect = (prefix: string) => {
    setMessage(prefix);
    setShowPlusMenu(false);
  };

  // Session expired overlay
  if (sessionExpired) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
          <div className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <LogOut className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">
              Session Expired
            </h2>
            <p className="text-gray-600 mb-6">
              Your session has expired. Please log in again to continue.
            </p>
            <Button
              onClick={handleRefresh}
              className="w-full bg-black hover:bg-gray-800 text-white rounded-full py-3"
            >
              Log In Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 bg-white border-r border-gray-200 flex flex-col overflow-hidden`}
      >
        <div className="p-3 border-b border-gray-200">
          <Button
            onClick={createNewConversation}
            className="w-full bg-black hover:bg-gray-800 text-white rounded-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <div key={conv.id} className="group relative">
                {editingId === conv.id ? (
                  <div className="flex items-center gap-1 p-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => saveTitle(conv.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation?.id === conv.id
                        ? "bg-gray-100"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => selectConversation(conv.id)}
                  >
                    <span
                      className="text-sm truncate flex-1"
                      title={conv.title}
                    >
                      {truncateTitle(conv.title)}
                    </span>
                    <div className="relative">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
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
                          className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(conv);
                            }}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Rename
                          </button>
                          <button
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center text-red-600"
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
        </ScrollArea>

        <div className="p-3 border-t border-gray-200">
          <div className="relative" ref={userMenuRef}>
            <div
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setShowUserMenu(!showUserMenu);
              }}
            >
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium">{user?.username}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>

            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                  onClick={goToProfile}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Profile Settings
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center text-red-600"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-200 bg-white p-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold">
            {selectedConversation?.title || "ChatBot AI"}
          </h2>
        </div>

        {selectedConversation ? (
          <>
            <ScrollArea className="flex-1 bg-white">
              <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {selectedConversation.messages.length === 0 && !loading ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-2xl font-semibold mb-3">
                      How can I help you today?
                    </h3>
                    <p className="text-gray-500">
                      Start a conversation by typing a message below
                    </p>
                  </div>
                ) : (
                  <>
                    {selectedConversation.messages.map((msg) => (
                      <div key={msg.id}>
                        {msg.role === "user" ? (
                          // User message - smaller, right aligned
                          <div className="flex justify-end">
                            <div className="flex gap-3 items-start max-w-[70%]">
                              <div className="inline-block rounded-2xl px-5 py-3 bg-gray-200 text-gray-900">
                                <MessageContent content={msg.content} />
                              </div>
                              <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                  <User className="h-4 w-4 text-gray-600" />
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Assistant message - wider, left aligned
                          <div className="flex gap-3 items-start">
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
                                <Sparkles className="h-4 w-4 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 max-w-full">
                              <div className="inline-block rounded-2xl px-5 py-3 bg-white text-gray-800">
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
                          <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="inline-block rounded-2xl px-5 py-3 bg-white">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                              <div
                                className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                                style={{ animationDelay: "150ms" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                                style={{ animationDelay: "300ms" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t border-gray-200 bg-white p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex gap-3 items-end bg-white rounded-2xl p-2 border border-gray-200">
                  <div className="relative" ref={plusMenuRef}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPlusMenu(!showPlusMenu);
                      }}
                      disabled={loading}
                      className="h-10 w-10 p-0 hover:bg-gray-100 rounded-xl"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>

                    {showPlusMenu && (
                      <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        <button
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                          onClick={() => handlePrefixSelect("professor> ")}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Professor
                        </button>
                        <button
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                          onClick={() => handlePrefixSelect("course> ")}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Course
                        </button>
                      </div>
                    )}
                  </div>
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleMessageKeyPress}
                    placeholder="Message ChatBot AI..."
                    disabled={loading}
                    className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={loading || !message.trim()}
                    className="bg-black hover:bg-gray-800 rounded-xl h-10 w-10 p-0"
                  >
                    <Send className="h-4 w-4 text-white" />
                  </Button>
                </div>
                <p className="text-xs text-center text-gray-400 mt-3">
                  ChatBot AI can make mistakes. Check important info.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center px-4">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h2 className="text-3xl font-bold mb-3">Welcome to ChatBot AI</h2>
              <p className="text-gray-600 mb-8 max-w-md">
                Start a new conversation or select an existing one from the
                sidebar
              </p>
              <Button
                onClick={createNewConversation}
                className="bg-black hover:bg-gray-800 rounded-full text-white"
              >
                <Plus className="h-4 w-4 mr-2 text-white" />
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
