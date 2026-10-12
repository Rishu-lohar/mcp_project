
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

  const model = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b";
  const groq = new Groq({ apiKey });
  const mcp = new Client({ name: "huntboard-client", version: "1.0.0" });

  try {
    // Connect to the Python FastMCP server.
    const transport = new StreamableHTTPClientTransport(
      new URL(
        process.env.MCP_SERVER_URL?.trim() ||
          "http://127.0.0.1:8000/mcp"
      )
    );

    await mcp.connect(transport);

    // Discover the tools currently registered on the MCP server.
    const { tools } = await mcp.listTools();

    const groqTools = tools.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description || `MCP tool: ${tool.name}`,
        parameters: tool.inputSchema as Record<string, unknown>,
      },
    }));

    const messages = [
      {
        role: "system" as const,
        content:
          "You are HuntBoard, a helpful career and general AI assistant. Answer general questions normally. When a user's request needs an available MCP tool, call the appropriate tool. Never claim a tool succeeded unless its result confirms success. Explain job results using only returned data. Ask for missing information when needed.",
      },
      ...body.messages,
    ];

    // Allow multiple tool calls, but prevent an endless loop.
    for (let turn = 0; turn < 6; turn++) {
      const completion = await groq.chat.completions.create({
        model,
        reasoning_effort: "low",
        max_completion_tokens: 2048,
        messages,
        ...(groqTools.length > 0 ? { tools: groqTools } : {}),
        tool_choice: groqTools.length > 0 ? "auto" : "none",
      });

      const assistantMessage = completion.choices[0]?.message;

      if (!assistantMessage) {
        throw new Error("Groq returned an empty response.");
      }

      messages.push(assistantMessage as (typeof messages)[number]);

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
          const parsed: unknown = JSON.parse(toolCall.function.arguments);
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

        // Only execute tools that the MCP server actually advertised.
        if (!tools.some((tool) => tool.name === toolName)) {
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: "Unknown MCP tool." }),
          });
          continue;
        }

        try {
          const result = await mcp.callTool({
            name: toolName,
            arguments: args,
          });

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
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
        "I reached the tool-call limit for this request. Please try a more specific question.",
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

      if (error.status === 429) {
        return NextResponse.json(
          { error: "Groq rate limit reached. Please wait and retry." },
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
          "Could not complete the AI/MCP request. Check that the Python MCP server is running on port 8000 and inspect the Next.js terminal for details.",
      },
      { status: 502 }
    );
  } finally {
    await mcp.close().catch(() => {});
  }
}
