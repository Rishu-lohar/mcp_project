
import Groq, { APIError } from "groq-sdk";
import { NextResponse } from "next/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;

  const message = value as Record<string, unknown>;

  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0 &&
    message.content.length <= 12_000
  );
}

function compactToolResult(result: unknown, maxLength = 4000): string {
  const serialized = JSON.stringify(result);

  if (serialized.length <= maxLength) {
    return serialized;
  }

  return (
    serialized.slice(0, maxLength) +
    '... [Result truncated to fit the context budget]'
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("messages" in body) ||
    !Array.isArray(body.messages) ||
    body.messages.length === 0 ||
    body.messages.length > 20 ||
    !body.messages.every(isChatMessage)
  ) {
    return NextResponse.json(
      { error: "Please provide up to 20 valid chat messages." },
      { status: 400 }
    );
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is missing from .env.local." },
      { status: 500 }
    );
  }

  const model =
    process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b";

  const groq = new Groq({ apiKey });
  const mcp = new Client({
    name: "huntboard-client",
    version: "1.0.0",
  });

  try {
    // Connect to Python FastMCP.
    const transport = new StreamableHTTPClientTransport(
      new URL(
        process.env.MCP_SERVER_URL?.trim() ||
          "http://127.0.0.1:8000/mcp"
      )
    );

    await mcp.connect(transport);

    // Discover available MCP tools.
    const { tools } = await mcp.listTools();

    // Keep tool definitions compact to reduce input tokens.
    const groqTools = tools.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: (
          tool.description || `MCP tool: ${tool.name}`
        ).slice(0, 200),
        parameters: tool.inputSchema as Record<string, unknown>,
      },
    }));

    // Send only recent messages to Groq.
    const recentMessages = body.messages.slice(-6);

    const messages: Array<Record<string, unknown>> = [
      {
        role: "system",
        content:
          "You are HuntBoard, a helpful career and general AI assistant. Answer general questions normally. Use available MCP tools when needed. Never claim a tool succeeded unless its result confirms success. Use only returned data for job results. Ask for missing information when necessary. Do not create, modify, or delete files unless the user explicitly requests it.",
      },
      ...recentMessages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    // Prevent endless tool-call loops.
    for (let turn = 0; turn < 4; turn++) {
      const completion = await groq.chat.completions.create({
        model,
        reasoning_effort: "low",
        max_completion_tokens: 1024,
        messages: messages as never,
        ...(groqTools.length > 0 ? { tools: groqTools } : {}),
        tool_choice: groqTools.length > 0 ? "auto" : "none",
      });

      const assistantMessage = completion.choices[0]?.message;

      if (!assistantMessage) {
        throw new Error("Groq returned an empty response.");
      }

      messages.push(assistantMessage as unknown as Record<string, unknown>);

      const toolCalls = assistantMessage.tool_calls ?? [];

      if (toolCalls.length === 0) {
        const reply = assistantMessage.content?.trim();

        if (!reply) {
          throw new Error("The AI returned an empty response.");
        }

        return NextResponse.json({ reply });
      }

      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function") continue;

        const toolName = toolCall.function.name;
        let args: Record<string, unknown>;

        try {
          const parsed: unknown = JSON.parse(
            toolCall.function.arguments
          );

          if (
            typeof parsed !== "object" ||
            parsed === null ||
            Array.isArray(parsed)
          ) {
            throw new Error("Tool arguments must be a JSON object.");
          }

          args = parsed as Record<string, unknown>;
        } catch {
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              error: "The model supplied invalid JSON arguments.",
            }),
          });
          continue;
        }

        // Only execute tools advertised by the MCP server.
        if (!tools.some((tool) => tool.name === toolName)) {
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              error: "Unknown MCP tool.",
            }),
          });
          continue;
        }

        try {
          const result = await mcp.callTool({
            name: toolName,
            arguments: args,
          });

          // Limit large tool results sent back to Groq.
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: compactToolResult(result),
          });
        } catch (error) {
          console.error(`MCP tool "${toolName}" failed:`, error);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              error: `MCP tool "${toolName}" failed.`,
            }),
          });
        }
      }
    }

    return NextResponse.json({
      reply:
        "I reached the tool-call limit. Please try a more specific question.",
    });
  } catch (error) {
    console.error("Chat/MCP error:", error);

    if (error instanceof APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: "Groq rejected the API key. Check .env.local." },
          { status: 502 }
        );
      }

      if (error.status === 413 || error.status === 429) {
        return NextResponse.json(
          {
            error:
              "Groq token limit reached. Try a shorter message or wait briefly before retrying.",
          },
          { status: 429 }
        );
      }

      if (error.status === 404) {
        return NextResponse.json(
          { error: `Groq model "${model}" is unavailable.` },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          "Could not complete the AI/MCP request. Check the Python MCP server and inspect the Next.js terminal for details.",
      },
      { status: 502 }
    );
  } finally {
    await mcp.close().catch(() => {});
  }
}
