import asyncio 
from fastmcp import Client
from pathlib import Path

async def main():
    async with Client("http://127.0.0.1:8000/mcp") as client:
        result = await client.call_tool("add",{"a":5,"b":3})
        print("Result: ", result) 

if __name__ == "__main__":
    asyncio.run(main())