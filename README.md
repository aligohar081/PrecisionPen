# 🖋️ PrecisionPen – AI Content Generator

**PrecisionPen** is a full-stack AI-powered writing assistant that helps you **generate, refine, and manage articles** through a chat-like interface.  

It leverages **CrewAI** multi-agent orchestration where:  
- 🕵️ **Researcher Agent** → Gathers & synthesizes information from the web via Serper API.  
- ✍️ **Writer Agent** → Crafts polished, engaging, and markdown-formatted content using Cohere LLM.  

---

## ✨ Features
- 💬 Conversational memory across sessions  
- 🧑‍🏫 Human-in-the-loop feedback (✅ Good / ❌ Bad / 🔄 Regenerate)  
- 📝 Markdown rendering (headings, lists, code, citations)  
- 🌙 Dark/Light theme toggle + animated splash screen  
- 🎙️ Voice input (Web Speech API)  
- 💾 Persistent sessions (rename, delete, load)  

---

## 🚀 Demo Workflow

1. **Ask a question**  
   > “Write me a blog post on the future of AI in education.”  
   🔹 PrecisionPen researches and writes a structured article.

2. **Refine the response**  
   > “Summarize this into bullet points.”  
   🔹 Writer agent edits the existing response without re-research.

3. **Give feedback**  
   - ✅ Mark good → saves as quality  
   - ❌ Mark bad → tagged for improvement  
   - 🔄 Regenerate → produces a new response  

---

## 🏗️ Architecture

- **Backend** (Flask + CrewAI)  
  - Manages sessions & conversation history  
  - Orchestrates Researcher + Writer workflow  
  - Cohere API for language generation  
  - Serper API for real-time web search  

- **Frontend** (Vanilla HTML/CSS/JS)  
  - Chat-style user interface  
  - Sidebar with saved sessions  
  - Markdown rendering (`marked.js`)  
  - Voice input, theme switching, splash animations  

---

## ⚙️ Setup Instructions

### 1. Clone & install dependencies
```bash
git clone <your-repo-url>
cd backend
pip install -r requirements.txt

📜 License
This project is open source — feel free to fork, modify, and extend 🚀
