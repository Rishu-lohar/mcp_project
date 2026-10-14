from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any


@dataclass
class NormalizedJob:
    title: str
    company: str
    location: str
    employment_type: str | None = None
    experience: str | None = None
    skills: list[str] = field(default_factory=list)
    posting_date: str | None = None
    source: str = "configured-provider"
    url: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "employment_type": self.employment_type,
            "experience": self.experience,
            "skills": self.skills,
            "posting_date": self.posting_date,
            "source": self.source,
            "url": self.url,
        }


class JobProvider:
    name: str
    description: str

    def is_configured(self) -> bool:
        return False

    def status(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "configured": False,
            "status": "not_configured",
            "message": "Live job search is not configured yet.",
        }

    def search(
        self,
        keyword: str,
        location: str = "",
        experience: str = "",
        remote_only: bool = False,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        raise NotImplementedError


def filter_job(job: dict[str, Any], *, keyword: str, location: str, experience: str, remote_only: bool) -> bool:
    target_text = " ".join(
        [
            str(job.get("title", "")),
            str(job.get("company", "")),
            str(job.get("location", "")),
            " ".join(str(skill) for skill in job.get("skills", []) or []),
        ]
    ).lower()

    keyword_value = keyword.strip().lower()
    location_value = location.strip().lower()
    experience_value = experience.strip().lower()

    if keyword_value and keyword_value not in target_text:
        return False

    if location_value and location_value not in str(job.get("location", "")).lower():
        return False

    if experience_value:
        experience_text = str(job.get("experience", "")).lower()
        if experience_value not in experience_text:
            return False

    if remote_only:
        location_text = str(job.get("location", "")).lower()
        if "remote" not in location_text and "hybrid" not in location_text:
            return False

    return True


def normalize_job(job: dict[str, Any], source_name: str) -> dict[str, Any]:
    normalized = NormalizedJob(
        title=str(job.get("title") or "Untitled role").strip(),
        company=str(job.get("company") or "Unknown company").strip(),
        location=str(job.get("location") or "Remote").strip(),
        employment_type=(job.get("employment_type") or job.get("employmentType") or None),
        experience=(job.get("experience") or job.get("experience_level") or None),
        skills=[str(skill).strip() for skill in (job.get("skills") or []) if str(skill).strip()],
        posting_date=(job.get("posting_date") or job.get("posted_at") or job.get("published_at") or None),
        source=str(source_name).strip() or "configured-provider",
        url=(job.get("url") or job.get("application_url") or job.get("apply_url") or None),
    )
    return normalized.as_dict()


class NoopJobProvider(JobProvider):
    name = "live-job-search"
    description = "No configured job provider. Add Adzuna, Greenhouse or Lever credentials to enable live results."

    def is_configured(self) -> bool:
        return False

    def status(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "configured": False,
            "status": "not_configured",
            "message": "Live job search is not configured yet. Add Adzuna, Greenhouse or Lever credentials to enable live results.",
        }

    def search(
        self,
        keyword: str,
        location: str = "",
        experience: str = "",
        remote_only: bool = False,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        return []


class AdzunaProvider(JobProvider):
    name = "adzuna"
    description = "Adzuna API jobs. Requires APP_ID and API_KEY."

    def is_configured(self) -> bool:
        return bool(os.getenv("ADZUNA_APP_ID") and os.getenv("ADZUNA_API_KEY"))

    def status(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "configured": self.is_configured(),
            "status": "configured" if self.is_configured() else "not_configured",
            "message": "Adzuna API is configured." if self.is_configured() else "Missing ADZUNA_APP_ID or ADZUNA_API_KEY.",
        }

    def search(
        self,
        keyword: str,
        location: str = "",
        experience: str = "",
        remote_only: bool = False,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        if not self.is_configured():
            return []

        return []


class GreenhouseProvider(JobProvider):
    name = "greenhouse"
    description = "Greenhouse public job boards. Requires a board URL or token."

    def is_configured(self) -> bool:
        return bool(os.getenv("GREENHOUSE_BOARD_URL") or os.getenv("GREENHOUSE_BOARD_TOKEN"))

    def status(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "configured": self.is_configured(),
            "status": "configured" if self.is_configured() else "not_configured",
            "message": "Greenhouse board is configured." if self.is_configured() else "Missing GREENHOUSE_BOARD_URL or GREENHOUSE_BOARD_TOKEN.",
        }

    def search(
        self,
        keyword: str,
        location: str = "",
        experience: str = "",
        remote_only: bool = False,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        if not self.is_configured():
            return []

        return []


class LeverProvider(JobProvider):
    name = "lever"
    description = "Lever public postings. Requires a board URL."

    def is_configured(self) -> bool:
        return bool(os.getenv("LEVER_BOARD_URL") or os.getenv("LEVER_API_URL"))

    def status(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "configured": self.is_configured(),
            "status": "configured" if self.is_configured() else "not_configured",
            "message": "Lever board is configured." if self.is_configured() else "Missing LEVER_BOARD_URL or LEVER_API_URL.",
        }

    def search(
        self,
        keyword: str,
        location: str = "",
        experience: str = "",
        remote_only: bool = False,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        if not self.is_configured():
            return []

        return []


def list_job_providers() -> list[JobProvider]:
    providers: list[JobProvider] = []

    for provider in (AdzunaProvider(), GreenhouseProvider(), LeverProvider()):
        if provider.is_configured():
            providers.append(provider)

    if not providers:
        providers.append(NoopJobProvider())

    return providers


def get_job_provider_status() -> list[dict[str, Any]]:
    return [provider.status() for provider in list_job_providers()]
