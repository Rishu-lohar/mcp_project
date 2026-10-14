
"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    Bot, MessageSquare, BookOpen, Bookmark, History, Settings,
    Search, Sun, Moon, Send, Paperclip, Plus, Copy,
    ThumbsUp, ThumbsDown, MoreHorizontal, ChevronDown,
    PanelLeftClose, Sparkles, Menu, LoaderCircle, CheckCircle2,
    AlertCircle, PlugZap, Trash2, PencilLine, ShieldCheck
} from "lucide-react";

type Message = {
    role: "user" | "assistant";
    text: string;
};

type ChatItem = {
    title: string;
    time: string;
};

type ConnectorId = "mcp" | "groq" | "jobs";

type ConnectorState = {
    id: ConnectorId;
    label: string;
    type: "local" | "cloud" | "provider";
    status: "connected" | "not_configured" | "warning";
    description: string;
    lastTested: string;
};

const initialChats: ChatItem[] = [
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

function safeExternalUrl(href: string) {
    try {
        const parsed = new URL(href, "https://example.com");
        const protocol = parsed.protocol.toLowerCase();

        if (["http:", "https:", "mailto:", "tel:"].includes(protocol)) {
            return parsed.href;
        }
    } catch {
        // Ignore malformed URLs and fall back to a safe placeholder.
    }

    return "#";
}

function MarkdownBubble({
    content,
    copyText,
    copiedText,
}: {
    content: string;
    copyText: (value: string) => Promise<void>;
    copiedText: string | null;
}) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                a: ({ href, children, ...props }) => {
                    const safeHref = typeof href === "string" ? safeExternalUrl(href) : "#";
                    return (
                        <a
                            {...props}
                            href={safeHref}
                            target={safeHref === "#" ? undefined : "_blank"}
                            rel={safeHref === "#" ? undefined : "noopener noreferrer"}
                            className="font-medium text-[#4c75d9] underline-offset-2 hover:underline"
                        >
                            {children}
                        </a>
                    );
                },
                code: ({ className, children, ...props }) => {
                    const text = String(children).replace(/\n$/, "");
                    const isInline = !className;

                    if (isInline) {
                        return (
                            <code
                                {...props}
                                className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.9em] text-[#172451]"
                            >
                                {children}
                            </code>
                        );
                    }

                    const language = className?.replace(/^language-/, "") || "text";

                    return (
                        <div className="not-prose my-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-950 text-slate-50 shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-slate-300">
                                <span>{language}</span>
                                <button
                                    type="button"
                                    onClick={() => void copyText(text)}
                                    className="rounded-md border border-slate-700 px-2 py-1 text-[10px] text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                                >
                                    {copiedText === text ? "Copied" : "Copy code"}
                                </button>
                            </div>
                            <pre className="overflow-x-auto p-3 text-sm leading-6 text-slate-100">
                                <code className={className}>{children}</code>
                            </pre>
                        </div>
                    );
                },
                table: ({ children }) => (
                    <div className="my-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="min-w-full border-collapse text-left text-sm">{children}</table>
                    </div>
                ),
                th: ({ children }) => <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">{children}</th>,
                td: ({ children }) => <td className="border-b border-slate-200 px-3 py-2 align-top text-slate-600">{children}</td>,
                blockquote: ({ children }) => (
                    <blockquote className="my-4 border-l-4 border-[#d77972] bg-[#fff7f6] px-4 py-2 text-slate-700">
                        {children}
                    </blockquote>
                ),
                ul: ({ children }) => <ul className="my-3 list-disc space-y-2 pl-6 text-slate-700">{children}</ul>,
                ol: ({ children }) => <ol className="my-3 list-decimal space-y-2 pl-6 text-slate-700">{children}</ol>,
                p: ({ children }) => <p className="my-3 leading-7 text-slate-700">{children}</p>,
                h1: ({ children }) => <h1 className="mt-6 mb-3 text-2xl font-bold text-slate-800">{children}</h1>,
                h2: ({ children }) => <h2 className="mt-5 mb-3 text-xl font-bold text-slate-800">{children}</h2>,
                h3: ({ children }) => <h3 className="mt-4 mb-2 text-lg font-bold text-slate-800">{children}</h3>,
            }}
        >
            {content}
        </ReactMarkdown>
    );
}

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
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
    const [showPrompts, setShowPrompts] = useState(false);
    const [copiedText, setCopiedText] = useState<string | null>(null);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [user] = useState<{ name?: string | null; email?: string | null } | null>(null);
    const [connectors, setConnectors] = useState<ConnectorState[]>([
        {
            id: "mcp",
            label: "Python MCP",
            type: "local",
            status: "connected",
            description: "Local tools and workspace access for project-aware guidance.",
            lastTested: "Ready when server is running",
        },
        {
            id: "groq",
            label: "Groq",
            type: "cloud",
            status: "not_configured",
            description: "Model access for assistant responses. Requires GROQ_API_KEY.",
            lastTested: "Not configured yet",
        },
        {
            id: "jobs",
            label: "Job providers",
            type: "provider",
            status: "not_configured",
            description: "Adzuna, Greenhouse and Lever integrations stay disabled until credentials are added.",
            lastTested: "No live providers configured",
        },
    ]);

    async function copyText(value: string) {
        try {
            await navigator.clipboard.writeText(value);
            setCopiedText(value);
            window.setTimeout(() => setCopiedText((previous) => previous === value ? null : previous), 1200);
        } catch (error) {
            console.error("Clipboard write failed:", error);
        }
    }

    function updateConnectorStatus(
        connectorId: ConnectorId,
        status: ConnectorState["status"],
        lastTested: string,
    ) {
        setConnectors((previous) =>
            previous.map((connector) =>
                connector.id === connectorId
                    ? { ...connector, status, lastTested }
                    : connector,
            ),
        );
    }

    async function testConnector(connectorId: ConnectorId) {
        if (connectorId === "mcp") {
            updateConnectorStatus("mcp", "connected", "Last test: local MCP available");
            return;
        }

        if (connectorId === "groq") {
            try {
                const response = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        messages: [{ role: "user", content: "Check Groq connectivity." }],
                    }),
                });

                if (response.ok) {
                    updateConnectorStatus("groq", "connected", "Last test: Groq responded successfully");
                    return;
                }

                const payload = await response.json().catch(() => ({}));
                updateConnectorStatus("groq", "warning", payload.error || "Groq test failed");
                return;
            } catch {
                updateConnectorStatus("groq", "warning", "Last test: request failed");
                return;
            }
        }

        updateConnectorStatus("jobs", "not_configured", "Last test: no live provider credentials configured");
    }

    function renameChat(title: string) {
        const nextTitle = window.prompt("Rename conversation", title);
        const cleaned = nextTitle?.trim();
        if (!cleaned) return;

        setChats((previous) =>
            previous.map((chat) =>
                chat.title === title ? { ...chat, title: cleaned } : chat,
            ),
        );

        if (activeChat === title) {
            setActiveChat(cleaned);
        }
    }

    function deleteChat(title: string) {
        const confirmed = window.confirm(`Delete "${title}"?`);
        if (!confirmed) return;

        setChats((previous) => previous.filter((chat) => chat.title !== title));

        if (activeChat === title) {
            setActiveChat("New conversation");
            setMessages([
                {
                    role: "assistant",
                    text: "A new conversation is ready. Ask me about job opportunities, career paths or MCP tools.",
                },
            ]);
        }
    }

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

    const profileName = user?.name?.trim() || (user?.email ? user.email.split("@")[0] : "Guest");
    const profileEmail = user?.email?.trim() || "Personal workspace";
    const avatarLabel = profileName.slice(0, 2).toUpperCase() || "G";
    const bg = darkMode ? "bg-slate-950 text-slate-100" : "bg-[#f5f6fa] text-slate-800";
    const panel = darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-[#e8e8ef]";
    const muted = darkMode ? "text-slate-400" : "text-slate-500";
    const field = darkMode
        ? "bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-400"
        : "bg-white border-[#e5e5ec] text-slate-800 placeholder:text-slate-400";

    function onSelectNav(itemName: string) {
        setActiveNav(itemName);
        setMobileNavOpen(false);
        if (itemName === "History") {
            setMobileHistoryOpen(true);
        }
    }

    return (
        <main className={`flex h-dvh min-h-[600px] overflow-x-hidden ${bg}`}>
            {mobileNavOpen && (
                <div className="fixed inset-0 z-40 bg-slate-950/35 md:hidden" onClick={() => setMobileNavOpen(false)} />
            )}
            {mobileHistoryOpen && (
                <div className="fixed inset-0 z-40 bg-slate-950/35 md:hidden" onClick={() => setMobileHistoryOpen(false)} />
            )}

            {/* LEFT: Navigation */}
            {sidebarOpen && (
                <aside className="hidden w-[220px] shrink-0 flex-col bg-[#172451] px-3 py-5 text-white md:flex max-md:w-[68px] max-md:px-2">
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
                                onClick={() => onSelectNav(item.name)}
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
                        onClick={() => onSelectNav("Settings")}
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

                        <div className="relative flex items-center gap-2 rounded-lg bg-white/10 p-2">
                            <button
                                type="button"
                                onClick={() => setProfileMenuOpen((value) => !value)}
                                className="flex w-full items-center gap-2 text-left"
                                aria-label="Open profile menu"
                            >
                                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e9928b] text-xs font-bold text-[#172451]">
                                    {avatarLabel}
                                </div>
                                <div className="min-w-0 max-md:hidden">
                                    <p className="truncate text-xs font-semibold">{profileName}</p>
                                    <p className="truncate text-[10px] text-blue-100/65">{profileEmail}</p>
                                </div>
                            </button>

                            {profileMenuOpen && (
                                <div className="absolute bottom-full left-0 z-10 mb-2 w-44 rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-lg">
                                    <button type="button" className="block w-full rounded-lg px-2 py-2 text-left text-xs hover:bg-slate-100">Account</button>
                                    <button type="button" onClick={() => onSelectNav("Settings")} className="block w-full rounded-lg px-2 py-2 text-left text-xs hover:bg-slate-100">Settings</button>
                                    <button type="button" disabled={!user} className="block w-full rounded-lg px-2 py-2 text-left text-xs text-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed">
                                        {user ? "Sign out" : "Sign out (requires auth)"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>
            )}

            {mobileNavOpen && (
                <aside className="fixed left-0 top-0 z-50 flex h-dvh w-[82%] max-w-[260px] flex-col bg-[#172451] px-3 py-5 text-white md:hidden">
                    <div className="mb-6 flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <div className="grid size-9 place-items-center rounded-xl bg-white/10">
                                <Bot size={23} />
                            </div>
                            <span className="text-lg font-bold tracking-tight">Hunt<span className="text-[#f19b91]">Board</span></span>
                        </div>
                        <button type="button" onClick={() => setMobileNavOpen(false)} className="rounded-lg bg-white/10 p-2" aria-label="Close navigation">
                            <PanelLeftClose size={16} />
                        </button>
                    </div>

                    <button onClick={() => { newChat(); setMobileNavOpen(false); }} className="mb-7 flex items-center justify-center gap-2 rounded-lg bg-[#e9928b] px-3 py-3 text-sm font-semibold text-[#18234a] transition hover:bg-[#f3aaa3]">
                        <Plus size={17} />
                        <span>New conversation</span>
                    </button>

                    <div className="space-y-1">
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
                                    onClick={() => { onSelectNav(item.name); setMobileNavOpen(false); }}
                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-[12px] transition ${activeNav === item.name ? "bg-[#e9928b] font-semibold text-[#18234a]" : "text-blue-50/85 hover:bg-white/10"}`}
                                >
                                    <Icon size={17} />
                                    <span>{item.name}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-auto border-t border-white/15 pt-4">
                        <button
                            onClick={() => { setActiveNav("Settings"); setMobileNavOpen(false); }}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-xs hover:bg-white/10 ${activeNav === "Settings" ? "bg-white/10" : "text-blue-50/85"}`}
                        >
                            <Settings size={17} />
                            <span>Settings</span>
                        </button>

                        <button onClick={() => setDarkMode(!darkMode)} className="mt-4 flex items-center gap-2 rounded-full bg-white/10 p-2 text-xs">
                            {darkMode ? <Moon size={16} /> : <Sun size={16} />}
                            <span>{darkMode ? "Dark mode" : "Light mode"}</span>
                        </button>
                    </div>
                </aside>
            )}

            {/* CENTER: Chat history */}
            <section className={`hidden w-[285px] shrink-0 flex-col border-r max-lg:w-[240px] md:flex ${panel}`}>
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
            {mobileHistoryOpen && (
                <aside className="fixed right-0 top-0 z-50 flex h-dvh w-[85%] max-w-[310px] flex-col border-l bg-white md:hidden">
                    <div className="flex h-[68px] items-center justify-between border-b px-4">
                        <div>
                            <h2 className="text-sm font-bold">Chat History</h2>
                            <p className={`mt-1 text-[10px] ${muted}`}>{chats.length} conversations</p>
                        </div>
                        <button onClick={() => setMobileHistoryOpen(false)} className={`rounded-md p-2 ${muted}`} aria-label="Close chat history">
                            <PanelLeftClose size={18} />
                        </button>
                    </div>

                    <div className="p-4">
                        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 ${field}`}>
                            <Search size={15} className={muted} />
                            <input
                                value={searchHistory}
                                onChange={(event) => setSearchHistory(event.target.value)}
                                placeholder="Search conversations"
                                className="w-full min-w-0 bg-transparent text-xs outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 pb-4">
                        {chats
                            .filter((chat) => chat.title.toLowerCase().includes(searchHistory.toLowerCase()))
                            .map((chat) => (
                                <button
                                    key={chat.title}
                                    onClick={() => {
                                        setActiveChat(chat.title);
                                        setActiveNav("Chat Generator");
                                        setMobileHistoryOpen(false);
                                    }}
                                    className={`mb-1 w-full rounded-lg border p-3 text-left transition ${activeChat === chat.title ? (darkMode ? "border-slate-600 bg-slate-800" : "border-[#f0d6d3] bg-[#fff3f1]") : "border-transparent hover:bg-slate-500/5"}`}
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
                </aside>
            )}

            <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <header className={`flex h-[68px] shrink-0 items-center justify-between border-b px-3 sm:px-6 ${panel}`}>
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            className={`rounded-md p-2 ${muted} hover:bg-slate-500/10 md:hidden`}
                            onClick={() => setMobileNavOpen(true)}
                            title="Open navigation"
                            aria-label="Open navigation"
                        >
                            <Menu size={18} />
                        </button>
                        <button
                            className={`hidden rounded-md p-2 ${muted} hover:bg-slate-500/10 md:inline-flex`}
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            title="Toggle sidebar"
                            aria-label="Toggle sidebar"
                        >
                            {sidebarOpen ? <PanelLeftClose size={18} /> : <Menu size={18} />}
                        </button>
                        <div className="min-w-0">
                            <h1 className="truncate text-sm font-bold">{activeNav === "Chat Generator" ? activeChat : activeNav}</h1>
                            <p className={`mt-1 text-[10px] ${muted}`}>HuntBoard assistant <span className="mx-1">·</span> Demo mode</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setMobileHistoryOpen(true)}
                            className="rounded-lg border px-2.5 py-2 text-xs md:hidden"
                            aria-label="Open chat history"
                        >
                            <History size={15} />
                        </button>
                        <button className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${darkMode ? "border-slate-700" : "border-[#e9e9ef]"}`}>
                            <Sparkles size={15} className="text-[#d77972]" />
                            <span className="max-sm:hidden">Assistant</span>
                            <ChevronDown size={14} className={muted} />
                        </button>
                    </div>
                </header>

                {activeNav === "My Saves" ? (
                    <div className="flex-1 overflow-y-auto p-6 max-sm:p-3">
                        <h2 className="mb-2 text-xl font-bold">My Saves</h2>
                        <p className={`mb-6 text-sm ${muted}`}>Messages you have bookmarked in this session.</p>
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
                ) : activeNav === "History" ? (
                    <div className="flex-1 overflow-y-auto p-6 max-sm:p-3">
                        <div className="mx-auto max-w-[780px]">
                            <div className="mb-6 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-bold">History</h2>
                                    <p className={`mt-2 text-sm ${muted}`}>Recent conversations in this local workspace.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={newChat}
                                    className="rounded-xl bg-[#172451] px-3 py-2 text-xs font-semibold text-white"
                                >
                                    New chat
                                </button>
                            </div>

                            <div className="space-y-3">
                                {chats.map((chat) => (
                                    <div
                                        key={chat.title}
                                        className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${activeChat === chat.title ? (darkMode ? "border-slate-600 bg-slate-800" : "border-[#f0d6d3] bg-[#fff3f1]") : panel}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveChat(chat.title);
                                                setActiveNav("Chat Generator");
                                            }}
                                            className="min-w-0 flex-1 text-left"
                                        >
                                            <p className="truncate text-sm font-semibold">{chat.title}</p>
                                            <p className={`mt-1 text-[10px] ${muted}`}>{chat.time}</p>
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                title="Rename conversation"
                                                onClick={() => renameChat(chat.title)}
                                                className={`rounded-lg p-2 hover:bg-slate-500/10 ${muted}`}
                                            >
                                                <PencilLine size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                title="Delete conversation"
                                                onClick={() => deleteChat(chat.title)}
                                                className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : activeNav === "Settings" ? (
                    <div className="flex-1 overflow-y-auto p-6 max-sm:p-3">
                        <div className="mx-auto max-w-[780px]">
                            <div className="mb-6">
                                <h2 className="text-xl font-bold">Connectors & settings</h2>
                                <p className={`mt-2 text-sm ${muted}`}>
                                    Local MCP and external integrations are shown here with clear status and safe configuration guidance.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {connectors.map((connector) => {
                                    const isActive = connector.status === "connected";
                                    const isWarning = connector.status === "warning";

                                    return (
                                        <div key={connector.id} className={`rounded-2xl border p-4 ${darkMode ? "border-slate-700 bg-slate-900" : "border-[#ebedf5] bg-white"}`}>
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-3">
                                                    <div className={`mt-0.5 grid size-9 place-items-center rounded-xl ${isActive ? "bg-emerald-100 text-emerald-700" : isWarning ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                                                        {isActive ? <CheckCircle2 size={18} /> : isWarning ? <AlertCircle size={18} /> : <PlugZap size={18} />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-sm font-semibold">{connector.label}</h3>
                                                            <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${isActive ? "bg-emerald-100 text-emerald-700" : isWarning ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                                                                {isActive ? "Connected" : isWarning ? "Warning" : "Not configured"}
                                                            </span>
                                                        </div>
                                                        <p className={`mt-1 text-xs ${muted}`}>{connector.description}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px]">
                                                    <button
                                                        type="button"
                                                        onClick={() => testConnector(connector.id)}
                                                        className="rounded-lg border border-[#d9dce8] px-2.5 py-2 text-slate-700 hover:border-[#c5c9d8] hover:bg-slate-50"
                                                    >
                                                        Test connection
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="rounded-lg border border-[#d9dce8] px-2.5 py-2 text-slate-700 hover:border-[#c5c9d8] hover:bg-slate-50"
                                                    >
                                                        Configure
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3 text-[11px]">
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <ShieldCheck size={14} />
                                                    {connector.lastTested}
                                                </div>
                                                <div className="text-slate-500">
                                                    {connector.type === "local" ? "Local" : connector.type === "cloud" ? "Cloud" : "Provider"}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
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
                                            {message.role === "assistant" ? (
                                                <div className="markdown-content">
                                                    <MarkdownBubble content={message.text} copyText={copyText} copiedText={copiedText} />
                                                </div>
                                            ) : (
                                                <p className="whitespace-pre-wrap">{message.text}</p>
                                            )}
                                            {message.role === "assistant" && (
                                                <div className={`mt-3 flex flex-wrap items-center gap-1 border-t pt-2 ${darkMode ? "border-slate-700" : "border-[#eeeeF3]"}`}>
                                                    <button title="Save message" onClick={() => toggleSave(message.text)} className={`rounded-md p-2 hover:bg-slate-500/10 ${savedMessages.includes(message.text) ? "text-[#d77972]" : muted}`}>
                                                        <Bookmark size={14} />
                                                    </button>
                                                    <button title="Copy message" onClick={() => void copyText(message.text)} className={`rounded-md p-2 hover:bg-slate-500/10 ${muted}`}>
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
