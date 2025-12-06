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

from services.rag_service import search_professors, search_courses, search_both, suggest_courses
from services.user_service import get_courses_taken_by_conversation
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
    suggestion_results: dict
    conversation_id: str


# Initialize LLM
def get_llm():
    """Get configured LLM instance"""
    return ChatOpenAI(
        model="gpt-4o",  # or "gpt-3.5-turbo" for faster/cheaper
        temperature=0,
        openai_api_key=settings.OPENAI_API_KEY
    )


SYSTEM_PROMPT = """
You are an intelligent academic assistant
You help students find: 
- Professors (with ratings and detailed student reviews)
- Courses (with course descriptions and expanded coverage of topics taught in the course) 

When answering: 
Be conversational and helpful 
Completely ignore all university affiliations in the search results. Do NOT reject information because it comes from a different university.
Always cite specific professor names, ratings, departments, and highlight student reviews when the user asks about professors 
Always cite specific course codes and titles, and focus more on the topics, content coverage, and learning outcomes when the user asks about courses 
If asked about both professors and courses, provide detailed information on both—student reviews for professors and topic coverage for courses 
If no relevant results are found, suggest that the user refine their query 
Be honest about limitations—don't make up information 
Available information from search results will be provided to you. 
Always base your responses strictly on that information.

**IMPORTANT: Always include a "Sources:" section at the end of your response, listing all sources used with their titles and URLs.**
"""


def router_node(state: AgentState) -> str:
    """
    Use LLM to intelligently decide which search tool(s) to use
    Returns: "search_professors", "search_courses", "search_both",
             "course_suggestions", or "llm"
    """
    llm = get_llm()
    last_message = state["messages"][-1].content

    # Router prompt for the LLM
    router_prompt = f"""You are a query classifier for an academic assistant system.
Your job is to determine what information the user is asking about.

Available options:
1. "professor" - Questions about professors, instructors, faculty, their ratings, teaching style, or reviews
2. "course" - Questions specifically requesting details about a particular course (content, difficulty, credits, syllabus)
3. "both" - Questions involving both professor AND course (e.g., "Who teaches Machine Learning?")
4. "suggestion" - Questions asking for course recommendations, best courses, which course to take, or course advice
5. "general" - General help, greetings, system usage questions

User Query: "{last_message}"

Classify this query. Respond with ONLY ONE WORD:
professor, course, both, suggestion, or general.

Your classification:"""

    # Get LLM classification
    response = llm.invoke([{"role": "user", "content": router_prompt}])
    classification = response.content.strip().lower()

    # Map classification to node names
    routing_map = {
        "professor": "search_professors",
        "course": "search_courses",
        "both": "search_both",
        "suggestion": "course_suggestions",
        "general": "llm"
    }

    # Default to search_both if classification is unclear
    return routing_map.get(classification, "search_both")


def search_professors_node(state: AgentState) -> dict:
    """Search for professors"""
    query = state["messages"][-1].content
    results = search_professors(query)
    return {"professor_results": results}


def search_courses_node(state: AgentState) -> dict:
    """Search for courses"""
    query = state["messages"][-1].content
    results = search_courses(query)
    return {"course_results": results}


def search_both_node(state: AgentState) -> dict:
    """Search both professors and courses"""
    query = state["messages"][-1].content
    results = search_both(query)
    return {"combined_results": results}


def course_suggestions_node(state: AgentState, db: Session, limit=3) -> dict:
    """
    Get course suggestions based on query AND courses already taken.
    Uses RAG to find courses similar to both the query and the user's course history.
    Filters out already-taken courses from results.
    """
    query = state["messages"][-1].content
    conversation_id = state.get("conversation_id")

    # Get courses already taken by this user
    courses_taken = get_courses_taken_by_conversation(conversation_id, db)
    courses_taken_set = set(courses_taken)

    # Build enhanced query combining user query + courses taken
    # This creates a richer context for RAG similarity search
    if courses_taken:
        enhanced_query = f"{query}. Student has completed: {', '.join(courses_taken)}"
    else:
        enhanced_query = query

    # Get RAG-based suggestions using enhanced query
    # The RAG will find courses similar to BOTH the query and the taken courses
    # Request more to account for filtering
    raw_results = suggest_courses(enhanced_query, limit * 2, db)

    # Filter out already-taken courses
    filtered_results = [
        r for r in raw_results
        if r.data.get("course_code") not in courses_taken_set
    ]

    # Return top 'limit' results after filtering
    return {"suggestion_results": filtered_results[:limit]}


def llm_node(state: AgentState) -> dict:
    """Generate response using LLM with search results context"""
    llm = get_llm()

    messages = [SystemMessage(content=SYSTEM_PROMPT)]

    # Add professor results context
    if state.get("professor_results"):
        data = state["professor_results"]
        prof_context = "**Professor Information Retrieved:**\n"
        prof_context += f"Query: {data.get('query', 'N/A')}\n\n"
        prof_context += f"Summary:\n{data.get('summary', 'No summary available')}\n\n"
        if data.get("sources"):
            prof_context += "📚 Sources used:\n"
            for i, src in enumerate(data["sources"], 1):
                prof_context += f"{i}. {src.get('title', 'Untitled')}\n"
                prof_context += f"   {src.get('snippet', 'No description')}\n\n"
        messages.append(SystemMessage(content=prof_context))

    # Add course results context (dictionary-based response)
    if state.get("course_results"):
        data = state["course_results"]
        course_context = "**Course Information Retrieved:**\n"
        course_context += f"Query: {data.get('query', 'N/A')}\n\n"
        course_context += f"Summary:\n{data.get('summary', 'No summary available')}\n\n"
        if data.get("sources"):
            course_context += "📚 Sources used:\n"
            for i, src in enumerate(data["sources"], 1):
                course_context += f"{i}. {src.get('title', 'Untitled')}\n"
                course_context += f"   {src.get('snippet', 'No description')}\n\n"
        messages.append(SystemMessage(content=course_context))

    # Add combined results (professor + course info)
    if state.get("combined_results"):
        data = state["combined_results"]
        combined_context = "**Instructor and Course Information:**\n"
        combined_context += f"Query: {data.get('query', 'N/A')}\n\n"
        combined_context += f"Summary:\n{data.get('summary', 'No summary available')}\n\n"
        if data.get("sources"):
            combined_context += "📘 Sources:\n"
            for i, src in enumerate(data["sources"], 1):
                combined_context += f"{i}. {src.get('title', 'Untitled')}\n"
                combined_context += f"   {src.get('snippet', 'No description')}\n\n"
        messages.append(SystemMessage(content=combined_context))

    # 🔥 NEW: Add course suggestions (RAG-based)
    if state.get("suggestion_results"):
        sugg_context = "**Recommended Courses Based on Your Interest:**\n"
        for i, r in enumerate(state["suggestion_results"], 1):
            data = r.data
            sugg_context += f"{i}. {data.get('course_code', 'N/A')}: {data.get('title', 'Unknown')}\n"
            sugg_context += f"   Description: {data.get('description', 'N/A')[:200]}...\n"
            sugg_context += f"   Difficulty: {data.get('difficulty', 'N/A')}\n"
            sugg_context += f"   Rating: {data.get('rating', 'N/A')}/5.0\n"
            sugg_context += f"   Similarity Score: {r.similarity:.2f}\n\n"
        messages.append(SystemMessage(content=sugg_context))

    # Add conversation history
    for msg in state["messages"]:
        messages.append(msg)

    messages.append(SystemMessage(
        content="Remember to include a 'Sources:' section at the end with all sources referenced."))

    # Final LLM response
    response = llm.invoke(messages)
    return {"messages": [AIMessage(content=response.content)]}


def create_agent_graph(db: Session, checkpointer= None) -> StateGraph:
    """
    Create and compile the LangGraph agent with RAG and web search functionality
    
    Args:
        db: Database session for searching
    
    Returns:
        Compiled agent graph
    """
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("search_professors",
                   lambda state: search_professors_node(state))
    graph.add_node("search_courses",
                   lambda state: search_courses_node(state))
    graph.add_node("search_both", lambda state: search_both_node(state))
    graph.add_node("course_suggestions", lambda state: course_suggestions_node(
        state, db))  # RAG-based
    graph.add_node("llm", lambda state : llm_node(state))

    # Router
    def route_query(state: AgentState) -> str:
        return router_node(state)

    # Entry mapping
    graph.set_conditional_entry_point(
        route_query,
        {
            "search_professors": "search_professors",
            "search_courses": "search_courses",
            "search_both": "search_both",
            "course_suggestions": "course_suggestions",
            "llm": "llm",
        }
    )

    # 🚨 REMOVED web_search edges — nodes now directly go to llm
    graph.add_edge("search_professors", "llm")
    graph.add_edge("search_courses", "llm")
    graph.add_edge("search_both", "llm")
    graph.add_edge("course_suggestions", "llm")
    graph.add_edge("llm", END)
    return graph.compile(checkpointer=checkpointer)


def run_agent_with_history(messages: list, db: Session, conversation_id: int = "default") -> str:
    # courses_taken = get_courses_taken_by_conversation(conversation_id, db)

    # Convert input messages to LangChain messages first
    langchain_messages = [
        HumanMessage(content=m["content"]) if m["role"] == "user" else AIMessage(
            content=m["content"])
        for m in messages
    ]

    # Now append the SystemMessage to the langchain_messages list
    # if courses_taken:
    #     system_content = f"""
    #     The student has already completed the following courses:{chr(10).join(f"- {c}" for c in courses_taken)}
    #     Use this when making recommendations.
    #     """
    #     langchain_messages.append(SystemMessage(content=system_content))

    with PostgresSaver.from_conn_string(DB_URI) as checkpointer:
        agent = create_agent_graph(db, checkpointer=checkpointer)
        config = {"configurable": {"thread_id": conversation_id}}

        initial_state = {
            "messages": langchain_messages,
            "professor_results": [],
            "course_results": [],
            "combined_results": [],
            "suggestion_results": [],
            "conversation_id": conversation_id
        }

        # Run agent
        final_state = agent.invoke(initial_state, config=config)

        return final_state["messages"][-1].content
    