
import asyncio
from fastmcp import Client


async def main():
    async with Client("http://127.0.0.1:8000/mcp") as client:
        # Discover available MCP tools
        tools = await client.list_tools()
        print("Available tools:", [tool.name for tool in tools])

        # Test all four tools
        test_cases = [
            ("add", {"a": 10, "b": 5}),
            ("subtract", {"a": 10, "b": 5}),
            ("multiply", {"a": 10, "b": 5}),
            ("divide", {"a": 10, "b": 5}),
            ("search_jobs", {"keyword": "Python", "location": "Bangalore"}),
                        
            ("get_job_details", {"job_id": 1}),
            ("get_job_details", {"job_id": 99}),

        ]

        for name, args in test_cases:
            result = await client.call_tool(name, args)
            print(f"{name}: {result.structured_content}")
            
            


if __name__ == "__main__":
    asyncio.run(main())
