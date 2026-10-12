
from fastmcp import FastMCP

mcp = FastMCP("My First MCP Server")


@mcp.tool()
def add(a: float, b: float) -> float:
    """Add two numbers."""
    return a + b


@mcp.tool()
def subtract(a: float, b: float) -> float:
    """Subtract b from a."""
    return a - b


@mcp.tool()
def multiply(a: float, b: float) -> float:
    """Multiply two numbers."""
    return a * b


@mcp.tool()
def divide(a: float, b: float) -> float:
    """Divide a by b."""
    if b == 0:
        raise ValueError("Cannot divide by zero.")
    return a / b


# sample job 

# Sample job data for practice
SAMPLE_JOBS = [
    {
        "id": 1,
        "title": "Python Developer Intern",
        "company": "TechNova",
        "location": "Bangalore",
        "experience": "Fresher",
        "skills": ["Python", "SQL"],
    },
    {
        "id": 2,
        "title": "React Developer",
        "company": "WebWorks",
        "location": "Bangalore",
        "experience": "0-1 years",
        "skills": ["React", "JavaScript", "TypeScript"],
    },
    {
        "id": 3,
        "title": "Data Analyst",
        "company": "DataSphere",
        "location": "Remote",
        "experience": "Fresher",
        "skills": ["Python", "SQL", "Excel"],
    },
]


@mcp.tool()
def search_jobs(keyword: str, location: str = "") -> list[dict]:
    """Search sample jobs by keyword and optional location."""
    keyword = keyword.strip().lower()
    location = location.strip().lower()

    results = []

    for job in SAMPLE_JOBS:
        searchable_text = (
            job["title"] + " " + " ".join(job["skills"])
        ).lower()

        if keyword in searchable_text:
            if not location or location in job["location"].lower():
                results.append(job)

    return results



@mcp.tool()
def get_job_details(job_id: int) -> dict:
    """Get complete details of a job using its ID."""

    for job in SAMPLE_JOBS:
        if job["id"] == job_id:
            return job

    return {"error": f"No job found with ID {job_id}"}


if __name__ == "__main__":
    mcp.run(
        transport="http",
        host="127.0.0.1",
        port=8000,
    )
