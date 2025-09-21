# backend/app.py
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# --- CrewAI Imports ---
from crewai import Agent, Task, Crew, Process
from langchain_community.llms import Cohere
from crewai_tools import SerperDevTool

# Load environment variables from .env file
load_dotenv()

# --- Initialize Flask App ---
app = Flask(__name__)
CORS(app)


def format_history(messages):
    """Formats the conversation history into a readable string for the AI."""
    if not messages:
        return ""
    
    formatted_string = "Here is the conversation history:\n"
    for msg in messages:
        role = "User" if msg['role'] == 'user' else "Assistant"
        formatted_string += f"- {role}: {msg['content']}\n"
    return formatted_string


def generate_content(session_data):
    """
    Generates content using CrewAI agents based on a session history.
    The last message in the history is the user's current prompt.
    """
    messages = session_data.get('messages', [])
    if not messages:
        raise ValueError("Session has no messages.")
        
    # The user's latest prompt is the last message
    latest_user_prompt = messages[-1]['content']
    
    # The preceding messages form the conversation history for context
    conversation_history = format_history(messages[:-1])

    # Instantiate the LLM
    llm = Cohere(
        model="command-r",
        temperature=0.7,
        max_tokens=4096,
        cohere_api_key=os.environ.get("COHERE_API_KEY")
    )

    # Instantiate the search tool (only used if the prompt requires new research)
    search_tool = SerperDevTool(
        n_results=5,
        api_key=os.environ.get("SERPER_API_KEY")
    )

    # --- AGENT DEFINITIONS ---
    # Agent 1: Senior Research Analyst
    # This agent is good for initial queries that require web searches.
    researcher = Agent(
        role="Senior Research Analyst",
        goal=f"Analyze the user's request, and if new information is needed, research it. Synthesize findings from reliable web sources.",
        backstory=(
            "You are an expert research analyst. Your strength is understanding a user's intent. "
            "If the user is asking a new question, you perform deep web research. "
            "If the user is asking to modify or summarize previous content, you recognize that and prepare the context for the writer. "
            "You are skilled at distinguishing reliable sources and fact-checking."
        ),
        allow_delegation=False,
        verbose=True,
        tools=[search_tool],
        llm=llm
    )

    # Agent 2: Content Writer & Editor
    # This agent writes the final output, either from a research brief or by editing previous content.
    writer = Agent(
        role="Content Writer and Editor",
        goal="Generate a complete, engaging, and well-formatted response that directly addresses the user's latest prompt, using the provided context and research.",
        backstory=(
            "You are a skilled content writer and editor. You can create a new blog post from a research brief, "
            "or you can modify, summarize, or expand on a previously written article based on the user's instructions. "
            "You always maintain a professional and engaging tone, ensuring the final output is a complete piece, not a draft."
        ),
        allow_delegation=False,
        verbose=True,
        llm=llm
    )

    # --- TASK DEFINITIONS ---
    # Task 1: Research & Contextualize
    # This task now includes the full conversation history.
    research_and_context_task = Task(
        description=(
    f"**Conversation History:**\n{conversation_history}\n"
    f"**User's Latest Request:** '{latest_user_prompt}'\n"
    "Analyze the user's latest request in the context of the conversation history. "
    "1. If the user is asking a **new question** or for a new article, conduct comprehensive research on the topic. "
    "2. If the user is asking to **modify, summarize, or expand** on the previous response, identify the relevant text from the history. No new research is needed. "
    "3. Synthesize your findings (either from research or from the history) into a structured brief for the writer."
),
        expected_output=(
            """A structured brief containing either:
- For new topics: An executive summary, key facts, and source links.
- For follow-ups: The original text to be modified and a clear instruction (e.g., 'Summarize this text', 'Expand this into bullet points')."""
        ),
        agent=researcher
    )

    # Task 2: Writing & Editing
    writing_task = Task(
        description=(
            "Using the provided brief and the full conversation context, generate the final response. "
            "If the request was for a new article, write a complete blog post with H1, H3 sub-headings, and citations. "
            "If the request was a follow-up (e.g., 'make it longer', 'summarize'), perform that action on the previous response. "
            "Your final output must be a complete, polished piece of content in markdown, ready for the user."
        ),
        expected_output=(
            "A complete and polished response in markdown format. This could be a full article, a summarized version of a previous article, a list of bullet points, or any other format that fulfills the user's latest request."
        ),
        agent=writer
    )

    # Create and run the Crew
    crew = Crew(
        agents=[researcher, writer],
        tasks=[research_and_context_task, writing_task],
        verbose=True,
        process=Process.sequential
    )

    result = crew.kickoff()
    return result.raw

# --- API Endpoint ---
@app.route('/generate', methods=['POST'])
def handle_generation():
    try:
        data = request.get_json()
        session_data = data.get('session')

        if not session_data or not session_data.get('messages'):
            return jsonify({'status': 'error', 'message': 'Session data with messages is required'}), 400

        print(f"Received request with {len(session_data['messages'])} messages in history.")
        final_output_string = generate_content(session_data)
        
        print("Content generation successful.")
        return jsonify({
            'status': 'success',
            'content': final_output_string
        })

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# --- Run App ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)