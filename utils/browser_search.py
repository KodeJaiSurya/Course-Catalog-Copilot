"""
Free Browser Search Tools
Uses DuckDuckGo (no API key needed) and web scraping
"""
from typing import List, Dict, Any
import requests
from bs4 import BeautifulSoup
import json


def duckduckgo_search(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """
    Search using DuckDuckGo (free, no API key needed)
    
    Args:
        query: Search query
        max_results: Maximum number of results
    
    Returns:
        List of search results with title, snippet, link
    """
    try:
        # DuckDuckGo HTML search
        url = "https://html.duckduckgo.com/html/"
        params = {"q": query}
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        response = requests.post(url, data=params, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')

        results = []
        for result in soup.find_all('div', class_='result', limit=max_results):
            try:
                title_elem = result.find('a', class_='result__a')
                snippet_elem = result.find('a', class_='result__snippet')

                if title_elem:
                    title = title_elem.get_text(strip=True)
                    link = title_elem.get('href', '')
                    snippet = snippet_elem.get_text(
                        strip=True) if snippet_elem else ""

                    results.append({
                        "title": title,
                        "snippet": snippet,
                        "link": link
                    })
            except Exception as e:
                continue

        return results

    except Exception as e:
        print(f"DuckDuckGo search error: {e}")
        return []


def google_search_scrape(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """
    Scrape Google search results (free, no API key)
    
    Args:
        query: Search query
        max_results: Maximum number of results
    
    Returns:
        List of search results
    """
    try:
        url = f"https://www.google.com/search?q={requests.utils.quote(query)}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')

        results = []

        # Find search result divs
        for g in soup.find_all('div', class_='g', limit=max_results):
            try:
                # Title and link
                anchor = g.find('a')
                title = g.find('h3').text if g.find('h3') else ""
                link = anchor.get('href', '') if anchor else ""

                # Snippet
                snippet_elem = g.find('div', class_='VwiC3b')
                snippet = snippet_elem.text if snippet_elem else ""

                if title and link:
                    results.append({
                        "title": title,
                        "snippet": snippet,
                        "link": link
                    })
            except Exception as e:
                continue

        return results

    except Exception as e:
        print(f"Google scrape error: {e}")
        return []


def search_ratemyprofessors(professor_name: str, university: str = "Northeastern University") -> Dict[str, Any]:
    """
    Search RateMyProfessors for professor information
    
    Args:
        professor_name: Professor's name
        university: University name
    
    Returns:
        Professor information from RateMyProfessors
    """
    try:
        # Search query
        query = f"{professor_name} {university} site:ratemyprofessors.com"
        results = duckduckgo_search(query, max_results=3)

        if not results:
            return None

        # Try to get the first RateMyProfessors link
        rmp_link = None
        for result in results:
            if "ratemyprofessors.com/professor/" in result['link']:
                rmp_link = result['link']
                break

        if not rmp_link:
            return None

        # Scrape RateMyProfessors page
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = requests.get(rmp_link, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')

        # Extract information (structure may vary)
        info = {
            "name": professor_name,
            "url": rmp_link,
            "rating": None,
            "department": None,
            "reviews_summary": []
        }

        # Try to extract rating (this is a simplified example)
        # RMP structure changes, so this might need updates
        rating_elem = soup.find('div', class_='RatingValue__Numerator')
        if rating_elem:
            info['rating'] = rating_elem.text.strip()

        return info

    except Exception as e:
        print(f"RateMyProfessors search error: {e}")
        return None


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
        return text[:5000]

    except Exception as e:
        print(f"Webpage fetch error: {e}")
        return ""


def search_web_fallback(query: str, search_type: str = "general") -> Dict[str, Any]:
    """
    Comprehensive web search fallback
    
    Args:
        query: Search query
        search_type: "professor", "course", or "general"
    
    Returns:
        Search results with summaries
    """
    results = {
        "query": query,
        "search_type": search_type,
        "sources": [],
        "summary": ""
    }

    try:
        # Enhance query based on type
        if search_type == "professor":
            enhanced_query = f"{query} Northeastern University professor rating reviews"
        elif search_type == "course":
            enhanced_query = f"{query} bnrordsp.neu.edu"
        else:
            enhanced_query = query

        # # Try DuckDuckGo first (more reliable)
        search_results = duckduckgo_search(enhanced_query, max_results=5)

        # # If DuckDuckGo fails, try Google scraping
        # if not search_results:
        # search_results = google_search_scrape(
        #         enhanced_query, max_results=3)

        # Process results
        for result in search_results[:3]:  # Top 3 results
            source = {
                "title": result['title'],
                "link": result['link'],
                "snippet": result['snippet']
            }

            # Optionally fetch full content for better context
            # Uncomment if needed (slower but more accurate)
            if result['link']:
                content = fetch_webpage_content(result['link'])
                source['content'] = content[:1000]  # First 1000 chars

            results["sources"].append(source)

        # Create summary from snippets
        if results["sources"]:
            snippets = [s['snippet']
                        for s in results["sources"] if s['snippet']]
            results["summary"] = " ".join(
                snippets[:2])  # Combine first 2 snippets

    except Exception as e:
        print(f"Web fallback search error: {e}")
        results["error"] = str(e)

    return results


def search_northeastern_course(course_code: str) -> Dict[str, Any]:
    """
    Search Northeastern University course catalog
    
    Args:
        course_code: Course code (e.g., "CS 2500")
    
    Returns:
        Course information
    """
    try:
        # Search Northeastern catalog
        query = f"{course_code} Northeastern University course catalog"
        results = duckduckgo_search(query, max_results=3)

        # Try to find official catalog page
        catalog_link = None
        for result in results:
            if "northeastern.edu" in result['link'] and "course" in result['link'].lower():
                catalog_link = result['link']
                break

        info = {
            "course_code": course_code,
            "sources": results[:3],
            "catalog_link": catalog_link
        }

        return info

    except Exception as e:
        print(f"Course search error: {e}")
        return None
