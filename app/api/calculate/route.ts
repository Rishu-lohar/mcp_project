
import { NextResponse } from "next/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";


export async function POST(request: Request) {
  let client: Client | undefined;

  try {
    const { a, b, operation } = await request.json();

    if (
      typeof a !== "number" ||
      typeof b !== "number" ||
      !Number.isFinite(a) ||
      !Number.isFinite(b)
    ) {
      return NextResponse.json(
        { error: "Please provide two valid numbers." },
        { status: 400 }
      );
    }

    const toolMap: Record<string, string> = {
      add: "add",
      subtract: "subtract",
      multiply: "multiply",
      divide: "divide",
    };

    if (typeof operation !== "string" || !(operation in toolMap)) {
      return NextResponse.json(
        { error: "Please provide a valid operation." },
        { status: 400 }
      );
    }

    client = new Client({
      name: "chatboard-client",
      version: "1.0.0",
    });

    const transport = new StreamableHTTPClientTransport(
      new URL("http://127.0.0.1:8000/mcp")
    );

    await client.connect(transport);

    const result = await client.callTool({
      name: toolMap[operation],
      arguments: { a, b },
    });

    return NextResponse.json({ result });
  } catch (error) {
    console.error("MCP connection error:", error);

    return NextResponse.json(
      { error: "Could not connect to the MCP server." },
      { status: 500 }
    );
  } finally {
    await client?.close().catch(() => { });
  }
}
