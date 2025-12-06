import re


def clean_course_title(raw_title: str) -> str:
    """Clean course title for display & search."""
    cleaned = re.sub(r"\(.*?\)", "", raw_title)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    cleaned = re.sub(r"(\b[A-Z]{2,}\s*\d{3,4})\.", r"\1", cleaned)
    cleaned = cleaned.rstrip(".")
    return cleaned
