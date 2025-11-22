"""
LangGraph Agent for RAG System
Intelligently routes queries to search professors or courses
"""
from typing import TypedDict, Annotated, Sequence
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from sqlalchemy.orm import Session
import operator

from services.rag_service import search_professors, search_courses, search_all
from config import settings
from langgraph.checkpoint.postgres import PostgresSaver  # <-- Postgres checkpointer

DB_URI = settings.DATABASE_URL


# Define Agent State
class AgentState(TypedDict):
    """State for the agent"""
    messages: Annotated[Sequence[BaseMessage], operator.add]
    professor_results: list
    course_results: list
    combined_results: list
    web_search_results: dict  # Add web search results


# Initialize LLM
def get_llm():
    """Get configured LLM instance"""
    return ChatOpenAI(
        model="gpt-4",  # or "gpt-3.5-turbo" for faster/cheaper
        temperature=0,
        openai_api_key=settings.OPENAI_API_KEY
    )


# System Prompt
SYSTEM_PROMPT = """
You are an intelligent academic assistant at Northeastern University. You help students find:

- Professors (with ratings and detailed student reviews)
- Courses (with course descriptions and expanded coverage of topics taught in the course)
When answering:

Be conversational and helpful
Always cite specific professor names, ratings, departments, and highlight student reviews when the user asks about professors
Always cite specific course codes and titles, and focus more on the topics, content coverage, and learning outcomes when the user asks about courses
If asked about both professors and courses, provide detailed information on both—student reviews for professors and topic coverage for courses
If no relevant results are found, suggest that the user refine their query
Be honest about limitations—don't make up information
Available information from search results will be provided to you. Always base your responses strictly on that information.
"""


def router_node(state: AgentState) -> str:
    """
    Use LLM to intelligently decide which search tool(s) to use
    Returns: "search_professors", "search_courses", "search_both", or "llm"
    """
    llm = get_llm()
    last_message = state["messages"][-1].content

    # Router prompt for the LLM
    router_prompt = f"""You are a query classifier for an academic assistant system. 
Your job is to determine what information the user is asking about.

Available options:
1. "professor" - Questions about professors, instructors, faculty, their ratings, teaching style, or reviews
2. "course" - Questions about courses, classes, curriculum, credit hours, or course content
3. "both" - Questions that involve both professors AND courses (e.g., "who teaches X course?")
4. "general" - General questions not requiring database search (greetings, help requests, etc.)

User Query: "{last_message}"

Classify this query. Respond with ONLY ONE WORD: professor, course, both, or general.

Your classification:"""

    # Get LLM classification
    response = llm.invoke([{"role": "user", "content": router_prompt}])
    classification = response.content.strip().lower()

    # Map classification to node names
    routing_map = {
        "professor": "search_professors",
        "course": "search_courses",
        "both": "search_both",
        "general": "llm"
    }

    # Default to search_both if classification is unclear
    return routing_map.get(classification, "search_both")


def search_professors_node(state: AgentState, db: Session) -> dict:
    """Search for professors"""
    query = state["messages"][-1].content
    results = search_professors(query, limit=5, db=db)
    return {"professor_results": results}


def search_courses_node(state: AgentState, db: Session) -> dict:
    """Search for courses"""
    query = state["messages"][-1].content
    results = search_courses(query, limit=5, db=db)
    return {"course_results": results}


def search_both_node(state: AgentState, db: Session) -> dict:
    """Search both professors and courses"""
    query = state["messages"][-1].content
    results = search_all(query, limit=10, db=db)

    # Separate results by type
    professor_results = [r for r in results if r.type == "professor"]
    course_results = [r for r in results if r.type == "course"]

    return {
        "professor_results": professor_results,
        "course_results": course_results,
        "combined_results": results
    }


def web_search_fallback_node(state: AgentState) -> dict:
    """
    Search the web when no database results found
    """
    from utils.browser_search import search_web_fallback

    query = state["messages"][-1].content

    # Determine search type based on what was searched
    prof_results = state.get("professor_results", [])
    course_results = state.get("course_results", [])

    if prof_results:  # non-empty list
        search_type = "professor"
    elif course_results:  # non-empty list
        search_type = "course"
    else:
        search_type = "general"

    # Perform web search
    web_results = search_web_fallback(query, search_type)

    return {"web_search_results": web_results}


def should_use_web_search(state: AgentState) -> str:
    """
    Decide if we should use web search fallback
    Returns "web_search" if no results found, otherwise "llm"
    """
    return "web_search"


def llm_node(state: AgentState) -> dict:
    """Generate response using LLM with search results context"""
    llm = get_llm()

    messages = [SystemMessage(content=SYSTEM_PROMPT)]

    has_db_results = False

    # Add professor results context
    if state.get("professor_results"):
        has_db_results = True
        prof_context = "**Professor Search Results:**\n"
        for i, r in enumerate(state["professor_results"], 1):
            data = r.data
            prof_context += f"{i}. {data.get('name', 'Unknown')} - {data.get('department', 'N/A')}\n"
            prof_context += f"   Rating: {data.get('rating', 'N/A')}/5.0\n"
            prof_context += f"   Similarity Score: {r.similarity:.2f}\n\n"
        messages.append(SystemMessage(content=prof_context))

    # Add course results context
    if state.get("course_results"):
        has_db_results = True
        course_context = "**Course Search Results:**\n"
        for i, r in enumerate(state["course_results"], 1):
            data = r.data
            course_context += f"{i}. {data.get('course_code', 'N/A')}: {data.get('title', 'Unknown')}\n"
            course_context += f"   Description: {data.get('description', 'N/A')[:200]}...\n"
            course_context += f"   Similarity Score: {r.similarity:.2f}\n\n"
        messages.append(SystemMessage(content=course_context))

    # Add web search results
    if not has_db_results and state.get("web_search_results"):
        web_results = state["web_search_results"]
        if web_results.get("sources"):
            web_context = "**Web Search Results (External Sources):**\n"
            for i, source in enumerate(web_results["sources"], 1):
                web_context += f"{i}. {source['title']}\n"
                web_context += f"   {source['snippet']}\n"
                web_context += f"   Source: {source['link']}\n\n"
            messages.append(SystemMessage(content=web_context))

    # Add conversation history
    for msg in state["messages"]:
        messages.append(msg)

    response = llm.invoke(messages)
    return {"messages": [AIMessage(content=response.content)]}


def create_agent_graph(db: Session,  checkpointer=None) -> StateGraph:
    """
    Create and compile the LangGraph agent with web search fallback
    
    Args:
        db: Database session for searching
    
    Returns:
        Compiled agent graph
    """
    # Create graph
    graph = StateGraph(AgentState)

    # Add nodes with database session bound
    graph.add_node("search_professors",
                   lambda state: search_professors_node(state, db))
    graph.add_node("search_courses",
                   lambda state: search_courses_node(state, db))
    graph.add_node("search_both", lambda state: search_both_node(state, db))
    graph.add_node("web_search", web_search_fallback_node)
    graph.add_node("llm", llm_node)

    # Define routing function that returns next node
    def route_query(state: AgentState) -> str:
        """Route to appropriate search node"""
        return router_node(state)

    # Set conditional entry point (no router node needed)
    graph.set_conditional_entry_point(
        route_query,
        {
            "search_professors": "search_professors",
            "search_courses": "search_courses",
            "search_both": "search_both",
            "llm": "llm",
        }
    )

    # Add conditional edges from search nodes
    # Check if results are good, if not go to web search
    graph.add_edge("search_professors", "web_search")
    graph.add_edge("search_courses", "web_search")
    graph.add_edge("search_both", "web_search")
    # Web search goes to LLM
    graph.add_edge("web_search", "llm")
    graph.add_edge("llm", END)

    # Compile and return
    return graph.compile(checkpointer=checkpointer)


def run_agent_with_history(messages: list, db: Session, conversation_id: int = "default") -> str:
    with PostgresSaver.from_conn_string(DB_URI) as checkpointer:
        
        # checkpointer.setup()
        agent = create_agent_graph(db, checkpointer=checkpointer)
        config = {"configurable": {"thread_id": conversation_id}}

        langchain_messages = [
            HumanMessage(content=m["content"]) if m["role"] == "user" else AIMessage(
                content=m["content"])
            for m in messages
        ]
        initial_state = {
            "messages": langchain_messages,
            "professor_results": [],
            "course_results": [],
            "combined_results": [],
            "web_search_results": {}
        }


        # Run agent
        final_state = agent.invoke(
            initial_state, config=config)

        return final_state["messages"][-1].content
