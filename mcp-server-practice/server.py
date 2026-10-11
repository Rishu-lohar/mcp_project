from fastmcp import FastMCP

# Create our MCP server
mcp = FastMCP("My First MCP Server")

# First Tool
@mcp.tool()
def add(a:int, b:int)->int:
    """Add tow numbers and return the result."""
    return a+b

# Start the server
if __name__ == "__main__":
    mcp.run(transport="http", host="127.0.0.1", port=8000)