"""
Free Browser Search Tools
Uses DuckDuckGo (no API key needed) and web scraping
"""
from typing import List, Dict, Any
import requests
from bs4 import BeautifulSoup
from config import Settings
from serpapi import GoogleSearch


def duckduckgo_search(query: str, max_results: int = 2, api_key: str = "") -> List[Dict[str, Any]]:
    """
    Search using SerpAPI with Google Search

    Args:
        query: Search query
        max_results: Maximum number of results
        api_key: Your SerpAPI key

    Returns:
        List of search results with title, snippet, link
    """
    api_key = "7f99b371ac185fc5209a03aaa22783eb9be48ad492ab594082e7f62e68c68ca4"

    params = {
        "q": query,
        "engine": "duckduckgo",
        "api_key": api_key,
        "num": max_results,
    }

    try:
        search = GoogleSearch(params)
        results = search.get_dict()

        output = []
        if "organic_results" in results:
            for item in results["organic_results"][:max_results]:
                output.append({
                    "title": item.get("title", ""),
                    "snippet": item.get("snippet", ""),
                    "link": item.get("link", "")
                })
        return output

    except Exception as e:
        print(f"SerpAPI search error: {e}")
        return []


def fetch_webpage_content(url: str) -> str:
    """
    Fetch and extract text content from a webpage
    
    Args:
        url: Webpage URL
    
    Returns:
        Extracted text content
    """
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')

        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()

        # Get text
        text = soup.get_text()

        # Clean up text
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip()
                  for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)

        # Limit length
        return text

    except Exception as e:
        print(f"Webpage fetch error: {e}")
        return ""


# def search_web_fallback(query: str, search_type: str = "general") -> Dict[str, Any]:
#     """
#     Comprehensive web search fallback
    
#     Args:
#         query: Search query
#         search_type: "professor", "course", or "general"
    
#     Returns:
#         Search results with summaries
#     """
#     results = {
#         "query": query,
#         "search_type": search_type,
#         "sources": [],
#         "summary": ""
#     }

#     try:
#         # Enhance query based on type
#         if search_type == "professor":
#             enhanced_query = f"{query} Northeastern University professor rating reviews"
#         elif search_type == "course":
#             enhanced_query = f"{query} bnrordsp.neu.edu"
#         else:
#             enhanced_query = query

#         # # Try DuckDuckGo first (more reliable)
#         search_results = duckduckgo_search(enhanced_query, max_results=5)

#         # Process results
#         for result in search_results[:3]:  # Top 3 results
#             source = {
#                 "title": result['title'],
#                 "link": result['link'],
#                 "snippet": result['snippet']
#             }

#             if result['link']:
#                 content = fetch_webpage_content(result['link'])
#                 source['content'] = content[:1000]  # First 1000 chars

#             results["sources"].append(source)

#         # Create summary from snippets
#         if results["sources"]:
#             snippets = [s['snippet']
#                         for s in results["sources"] if s['snippet']]
#             results["summary"] = " ".join(
#                 snippets[:2])  # Combine first 2 snippets

#     except Exception as e:
#         print(f"Web fallback search error: {e}")
#         results["error"] = str(e)

#     return results