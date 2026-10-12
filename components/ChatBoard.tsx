
"use client";

import { useState } from "react";
import {
    Bot, MessageSquare, BookOpen, Bookmark, History, Settings,
    Search, Sun, Moon, Send, Paperclip, Plus, Heart,
    Copy, Pencil, ThumbsUp, ThumbsDown, MoreHorizontal,
    ChevronDown, PanelLeftClose, Sparkles, Menu, LoaderCircle
} from "lucide-react";

type Message = {
    role: "user" | "assistant";
    text: string;
};

const initialChats = [
    { title: "Today's job search", time: "Just now" },
    { title: "DevOps career roadmap", time: "Yesterday" },
    { title: "Resume improvement", time: "Yesterday" },
    { title: "Python interview preparation", time: "2 days ago" },
    { title: "Cloud certifications", time: "2 days ago" },
    { title: "Frontend developer roles", time: "3 days ago" },
];


const suggestions = [
    "Find the latest DevOps jobs in Bengaluru",
    "Create a career roadmap for a fresher",
    "Help me prepare for a technical interview",
    "Review my resume against a job description",
    "Explain MCP tools, resources and prompts",
    "Show me a filesystem MCP practical",
];


export default function ChatBoard() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            text: "Hi there! 👋 I'm your job search assistant. Ask me about job opportunities, career paths, skills, or interview preparation. We'll connect real job sources and MCP tools in a later phase."
        }
    ]);
    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [activeNav, setActiveNav] = useState("Chat Generator");
    const [activeChat, setActiveChat] = useState("Today's job search");
    const [chats, setChats] = useState(initialChats);
    const [searchHistory, setSearchHistory] = useState("");
    const [savedMessages, setSavedMessages] = useState<string[]>([]);
    const [darkMode, setDarkMode] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showPrompts, setShowPrompts] = useState(false);



    async function sendMessage(text = input) {
        const clean = text.trim();
        if (!clean || isSending) return;

        const nextMessages = [...messages, { role: "user" as const, text: clean }];
        setMessages(nextMessages);
        setIsSending(true);

        setInput("");
        setActiveNav("Chat Generator");

        if (!chats.some((chat) => chat.title === clean)) {
            setChats((previous) => [
                { title: clean, time: "Just now" },
                ...previous,
            ]);
        }

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: nextMessages.slice(-20).map(({ role, text }) => ({
                        role,
                        content: text,
                    })),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "AI request failed.");
            }

            setMessages((previous) => [
                ...previous,
                {
                    role: "assistant",
                    text: data.reply,
                },
            ]);
        } catch (error) {
            console.error("Chat API error:", error);

            setMessages((previous) => [
                ...previous,
                {
                    role: "assistant",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Bhai, AI se connect nahi ho paya.",
                },
            ]);
        } finally {
            setIsSending(false);
        }
    }


    function newChat() {
        setMessages([]);
        setInput("");
        setActiveChat("New conversation");
        setActiveNav("Chat Generator");
    }

    function toggleSave(text: string) {
        setSavedMessages((previous) =>
            previous.includes(text)
                ? previous.filter((item) => item !== text)
                : [...previous, text]
        );
    }

    const bg = darkMode ? "bg-slate-950 text-slate-100" : "bg-[#f5f6fa] text-slate-800";
    const panel = darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-[#e8e8ef]";
    const muted = darkMode ? "text-slate-400" : "text-slate-500";
    const field = darkMode
        ? "bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-400"
        : "bg-white border-[#e5e5ec] text-slate-800 placeholder:text-slate-400";

    return (
        <main className={`flex h-dvh min-h-[600px] overflow-hidden ${bg}`}>
            {/* LEFT: Navigation */}
            {sidebarOpen && (
                <aside className="flex w-[220px] shrink-0 flex-col bg-[#172451] px-3 py-5 text-white max-md:w-[68px] max-md:px-2">
                    <div className="mb-8 flex items-center gap-2 px-2">
                        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10">
                            <Bot size={23} />
                        </div>
                        <span className="text-lg font-bold tracking-tight max-md:hidden">
                            Hunt<span className="text-[#f19b91]">Board</span>
                        </span>
                    </div>

                    <button
                        onClick={newChat}
                        className="mb-7 flex items-center justify-center gap-2 rounded-lg bg-[#e9928b] px-3 py-3 text-sm font-semibold text-[#18234a] transition hover:bg-[#f3aaa3]"
                    >
                        <Plus size={17} />
                        <span className="max-md:hidden">New conversation</span>
                    </button>

                    <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[1.5px] text-blue-200/70 max-md:hidden">
                        Workspace
                    </p>

                    {[
                        { name: "Chat Generator", icon: MessageSquare },
                        { name: "Prompt Library", icon: BookOpen },
                        { name: "My Saves", icon: Bookmark },
                        { name: "History", icon: History },
                    ].map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.name}
                                onClick={() => setActiveNav(item.name)}
                                className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-3 text-left text-[12px] transition max-md:justify-center max-md:px-1 ${activeNav === item.name
                                    ? "bg-[#e9928b] font-semibold text-[#18234a]"
                                    : "text-blue-50/85 hover:bg-white/10"
                                    }`}
                                title={item.name}
                            >
                                <Icon size={17} />
                                <span className="max-md:hidden">{item.name}</span>
                                {item.name === "My Saves" && savedMessages.length > 0 && (
                                    <span className="ml-auto max-md:hidden">{savedMessages.length}</span>
                                )}
                            </button>
                        );
                    })}

                    <div className="my-5 border-t border-white/15" />
                    <button
                        onClick={() => setActiveNav("Settings")}
                        className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left text-xs hover:bg-white/10 max-md:justify-center max-md:px-1 ${activeNav === "Settings" ? "bg-white/10" : "text-blue-50/85"
                            }`}
                    >
                        <Settings size={17} />
                        <span className="max-md:hidden">Settings</span>
                    </button>

                    <div className="mt-auto border-t border-white/15 pt-4">
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className="mb-4 flex items-center gap-2 rounded-full bg-white/10 p-2 text-xs"
                            title="Toggle theme"
                        >
                            {darkMode ? <Moon size={16} /> : <Sun size={16} />}
                            <span className="max-md:hidden">{darkMode ? "Dark mode" : "Light mode"}</span>
                        </button>
                        <div className="flex items-center gap-2 rounded-lg bg-white/10 p-2">
                            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e9928b] text-xs font-bold text-[#172451]">
                                HB
                            </div>
                            <div className="min-w-0 max-md:hidden">
                                <p className="truncate text-xs font-semibold">Job Seeker</p>
                                <p className="truncate text-[10px] text-blue-100/65">Personal workspace</p>
                            </div>
                        </div>
                    </div>
                </aside>
            )}

            {/* CENTER: Chat history */}
            <section className={`flex w-[285px] shrink-0 flex-col border-r max-lg:w-[240px] max-md:hidden ${panel}`}>
                <div className={`flex h-[68px] items-center justify-between border-b px-5 ${darkMode ? "border-slate-700" : "border-[#eeeeF3]"}`}>
                    <div>
                        <h2 className="text-sm font-bold">Chat History</h2>
                        <p className={`mt-1 text-[10px] ${muted}`}>{chats.length} conversations</p>
                    </div>
                    <button onClick={newChat} className={`rounded-md p-2 ${muted} hover:bg-slate-100/10`} title="New chat">
                        <Plus size={17} />
                    </button>
                </div>

                <div className="p-4">
                    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 ${field}`}>
                        <Search size={15} className={muted} />
                        <input
                            value={searchHistory}
                            onChange={(e) => setSearchHistory(e.target.value)}
                            placeholder="Search conversations"
                            className="w-full min-w-0 bg-transparent text-xs outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 pb-4">
                    <p className={`mb-2 px-2 text-[10px] font-bold uppercase tracking-wider ${muted}`}>
                        Recent conversations
                    </p>
                    {chats
                        .filter((chat) => chat.title.toLowerCase().includes(searchHistory.toLowerCase()))
                        .map((chat) => (
                            <button
                                key={chat.title}
                                onClick={() => {
                                    setActiveChat(chat.title);
                                    setMessages([
                                        { role: "assistant", text: `Welcome back to "${chat.title}". This is a local demo conversation. Actual saved chat restoration will be implemented later.` }
                                    ]);
                                    setActiveNav("Chat Generator");
                                }}
                                className={`mb-1 w-full rounded-lg border p-3 text-left transition ${activeChat === chat.title
                                    ? darkMode ? "border-slate-600 bg-slate-800" : "border-[#f0d6d3] bg-[#fff3f1]"
                                    : "border-transparent hover:bg-slate-500/5"
                                    }`}
                            >
                                <div className="flex items-start gap-2">
                                    <MessageSquare size={15} className={`mt-0.5 shrink-0 ${activeChat === chat.title ? "text-[#d77972]" : muted}`} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-semibold">{chat.title}</p>
                                        <p className={`mt-2 text-[10px] ${muted}`}>{chat.time}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                </div>

                <div className={`border-t p-4 ${darkMode ? "border-slate-700" : "border-[#eeeeF3]"}`}>
                    <div className="flex items-center justify-between">
                        <span className={`text-[10px] ${muted}`}>MCP learning workspace</span>
                        <span className="size-2 rounded-full bg-emerald-500" />
                    </div>
                </div>
            </section>

            {/* RIGHT: Main conversation */}
            <section className="flex min-w-0 flex-1 flex-col">
                <header className={`flex h-[68px] shrink-0 items-center justify-between border-b px-6 max-sm:px-3 ${panel}`}>
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            className={`rounded-md p-2 ${muted} hover:bg-slate-500/10`}
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            title="Toggle sidebar"
                        >
                            {sidebarOpen ? <PanelLeftClose size={18} /> : <Menu size={18} />}
                        </button>
                        <div className="min-w-0">
                            <h1 className="truncate text-sm font-bold">{activeNav === "Chat Generator" ? activeChat : activeNav}</h1>
                            <p className={`mt-1 text-[10px] ${muted}`}>HuntBoard assistant <span className="mx-1">·</span> Demo mode</p>
                        </div>
                    </div>
                    <button className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${darkMode ? "border-slate-700" : "border-[#e9e9ef]"}`}>
                        <Sparkles size={15} className="text-[#d77972]" />
                        <span className="max-sm:hidden">Assistant</span>
                        <ChevronDown size={14} className={muted} />
                    </button>
                </header>

                {activeNav === "My Saves" ? (
                    <div className="flex-1 overflow-y-auto p-6 max-sm:p-3">
                        <h2 className="mb-2 text-xl font-bold">My Saves</h2>
                        <p className={`mb-6 text-sm ${muted}`}>Messages you've bookmarked in this session.</p>
                        {savedMessages.length ? savedMessages.map((text) => (
                            <div key={text} className={`mb-3 rounded-xl border p-4 ${panel}`}>
                                <p className="whitespace-pre-wrap text-sm">{text}</p>
                                <button onClick={() => toggleSave(text)} className="mt-3 text-xs text-rose-500">Remove saved message</button>
                            </div>
                        )) : <p className={`text-sm ${muted}`}>No saved messages yet. Use the bookmark button on an assistant reply.</p>}
                    </div>
                ) : activeNav === "Prompt Library" ? (
                    <div className="flex-1 overflow-y-auto p-6 max-sm:p-3">
                        <h2 className="mb-2 text-xl font-bold">Prompt Library</h2>
                        <p className={`mb-6 text-sm ${muted}`}>Choose a starter prompt to begin a conversation.</p>
                        {[
                            "Find the latest DevOps jobs in Bengaluru",
                            "Create a roadmap for a fresher learning cloud computing",
                            "Help me prepare for a technical interview",
                            "Review my resume against a job description",
                        ].map((prompt) => (
                            <button key={prompt} onClick={() => sendMessage(prompt)} className={`mb-3 block w-full rounded-xl border p-4 text-left text-sm hover:border-[#e9928b] ${panel}`}>
                                <Sparkles size={16} className="mb-3 text-[#d77972]" />{prompt}
                            </button>
                        ))}
                    </div>
                ) : activeNav === "Settings" || activeNav === "History" ? (
                    <div className="flex-1 p-6 max-sm:p-3">
                        <h2 className="text-xl font-bold">{activeNav}</h2>
                        <p className={`mt-2 text-sm ${muted}`}>{activeNav === "History" ? "Choose a conversation from the center panel." : "Settings and persistent storage will be added in a later phase."}</p>
                    </div>
                ) : (
                    <>
                        <div className={`flex-1 overflow-y-auto px-6 py-8 max-sm:px-3 ${darkMode ? "bg-slate-950" : "bg-[#fbfbfd]"}`}>
                            <div className="mx-auto flex max-w-[790px] flex-col gap-7">
                                <div className="mb-2 text-center">
                                    <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-[#172451] text-white shadow-sm">
                                        <Bot size={26} />
                                    </div>
                                    <h2 className="text-lg font-bold">How can I help you today?</h2>
                                    <p className={`mt-2 text-xs ${muted}`}>Explore careers, practice job searching, or learn with MCP.</p>
                                </div>

                                {messages.map((message, index) => (
                                    <div key={`${index}-${message.role}`} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                                        <div className={`grid size-8 shrink-0 place-items-center rounded-full ${message.role === "assistant" ? "bg-[#172451] text-white" : "bg-[#e9928b] text-[#172451]"
                                            }`}>
                                            {message.role === "assistant" ? <Bot size={17} /> : <span className="text-[10px] font-bold">YOU</span>}
                                        </div>
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-3.5 text-sm leading-7 ${message.role === "assistant"
                                            ? darkMode ? "border border-slate-700 bg-slate-900" : "border border-[#ededf3] bg-white shadow-[0_2px_8px_rgba(20,25,60,0.025)]"
                                            : "bg-[#f9e7e4] text-[#342c45]"
                                            }`}>
                                            <p className="whitespace-pre-wrap">{message.text}</p>
                                            {message.role === "assistant" && (
                                                <div className={`mt-3 flex flex-wrap items-center gap-1 border-t pt-2 ${darkMode ? "border-slate-700" : "border-[#eeeeF3]"}`}>
                                                    <button title="Save message" onClick={() => toggleSave(message.text)} className={`rounded-md p-2 hover:bg-slate-500/10 ${savedMessages.includes(message.text) ? "text-[#d77972]" : muted}`}>
                                                        <Bookmark size={14} />
                                                    </button>
                                                    <button title="Copy message" onClick={() => void navigator.clipboard?.writeText(message.text)} className={`rounded-md p-2 hover:bg-slate-500/10 ${muted}`}>
                                                        <Copy size={14} />
                                                    </button>
                                                    <button title="Like" className={`rounded-md p-2 hover:bg-slate-500/10 ${muted}`}><ThumbsUp size={14} /></button>
                                                    <button title="Dislike" className={`rounded-md p-2 hover:bg-slate-500/10 ${muted}`}><ThumbsDown size={14} /></button>
                                                    <button title="More actions" className={`rounded-md p-2 hover:bg-slate-500/10 ${muted}`}><MoreHorizontal size={15} /></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isSending && (
                                    <div className={`flex items-center gap-2 text-xs ${muted}`} role="status">
                                        <LoaderCircle size={15} className="animate-spin" />
                                        HuntBoard is thinking...
                                    </div>
                                )}
                                {messages.length <= 1 && (
                                    <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                                        {[
                                            { title: "Explore job opportunities", desc: "Search by role, skills or location", prompt: "Find the latest DevOps jobs in Bengaluru" },
                                            { title: "Build a career roadmap", desc: "Plan your next learning steps", prompt: "Create a career roadmap for a fresher" },
                                            { title: "Prepare for interviews", desc: "Practice technical questions", prompt: "Help me practice a technical interview" },
                                            { title: "Learn MCP practically", desc: "Explore tools, resources and prompts", prompt: "Explain how we will practice MCP in this project" },
                                        ].map((item) => (
                                            <button key={item.title} onClick={() => sendMessage(item.prompt)} className={`rounded-xl border p-4 text-left transition hover:border-[#e9928b] ${panel}`}>
                                                <span className="text-xs font-semibold">{item.title}</span>
                                                <span className={`mt-2 block text-[11px] leading-5 ${muted}`}>{item.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={`shrink-0 border-t px-6 pb-4 pt-4 max-sm:px-3 ${panel}`}>
                            <form onSubmit={(event) => { event.preventDefault(); sendMessage(); }} className={`mx-auto max-w-[790px] rounded-2xl border p-3 ${field}`}>
                                <textarea
                                    value={input}
                                    onChange={(event) => setInput(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" && !event.shiftKey && !isSending) {
                                            event.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                    rows={2}
                                    placeholder="Ask me anything about jobs, careers or MCP..."
                                    className="w-full resize-none bg-transparent px-1 py-1 text-sm outline-none"
                                />
                                <div className="flex items-center justify-between pt-2">
                                    <div className="flex items-center gap-1">
                                        <button type="button" title="Attachments (coming later)" className={`rounded-lg p-2 ${muted} hover:bg-slate-500/10`}><Paperclip size={17} /></button>
                                        <button type="button" onClick={() => setShowPrompts(!showPrompts)} className={`flex items-center gap-1 rounded-lg px-2 py-2 text-[11px] ${muted} hover:bg-slate-500/10`}>
                                            <BookOpen size={15} /> Prompts
                                        </button>
                                    </div>
                                    <button type="submit" disabled={!input.trim() || isSending} className="grid size-9 place-items-center rounded-xl bg-[#e9928b] text-[#172451] transition hover:bg-[#f3aaa3] disabled:cursor-not-allowed disabled:opacity-40" title={isSending ? "Sending message" : "Send message"}>
                                        {isSending ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}
                                    </button>
                                </div>
                            </form>

                            {showPrompts && (
                                <div className="mx-auto mt-2 flex max-w-[790px] flex-wrap gap-2">
                                    {suggestions.map((prompt) => (
                                        <button key={prompt} onClick={() => { setInput(prompt); setShowPrompts(false); }} className={`rounded-full border px-3 py-2 text-[10px] hover:border-[#e9928b] ${field}`}>{prompt}</button>
                                    ))}
                                </div>
                            )}
                            <p className={`mt-3 text-center text-[10px] ${muted}`}>Demo interface · Live job listings are not connected yet.</p>
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}
