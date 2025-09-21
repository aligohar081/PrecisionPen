document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const form = document.getElementById('message-form');
    const input = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const messagesContainer = document.getElementById('messages-container');
    const loadingOverlay = document.getElementById('loading-overlay');
    const themeToggle = document.querySelector('.theme-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const newChatButton = document.getElementById('new-chat-button');
    const globalMemoryList = document.getElementById('global-memory-list');
    const voiceInputButton = document.getElementById('voice-input-button');

    // --- Configuration & State ---
    const API_URL = 'http://127.0.0.1:5000/generate';
    let globalMemory = []; // Array of session objects
    let currentSession = null; // The active session object { id, name, messages: [] }

    // --- Voice Input (Web Speech API) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isRecording = false;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = true;

        recognition.onstart = () => {
            isRecording = true;
            voiceInputButton.classList.add('recording');
            voiceInputButton.title = 'Stop recording';
        };

        recognition.onend = () => {
            isRecording = false;
            voiceInputButton.classList.remove('recording');
            voiceInputButton.title = 'Start voice input';
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if(event.error === 'not-allowed') {
                alert('Voice input is blocked. Please allow microphone access in your browser settings.');
            }
        };

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            input.value = transcript;
        };
    } else {
        voiceInputButton.style.display = 'none';
        console.warn('Speech Recognition API not supported in this browser.');
    }

    // --- Core Session and Memory Management ---
    const createNewSession = () => {
        const newSession = {
            id: `session_${Date.now()}`,
            name: 'New Chat',
            messages: [] // Message: { id, role, content, feedback? }
        };
        return newSession;
    };

    const saveGlobalMemory = () => {
        localStorage.setItem('aiContentGeneratorGlobalMemory', JSON.stringify(globalMemory));
        renderGlobalMemoryUI();
    };

    const loadGlobalMemory = () => {
        const saved = localStorage.getItem('aiContentGeneratorGlobalMemory');
        globalMemory = saved ? JSON.parse(saved) : [];
        if (!currentSession) {
            currentSession = createNewSession();
        }
        renderGlobalMemoryUI();
        renderCurrentSessionMessages();
    };

    const saveCurrentSession = () => {
        if (!currentSession || currentSession.messages.length === 0) return;

        const existingIndex = globalMemory.findIndex(s => s.id === currentSession.id);
        const firstUserMessage = currentSession.messages.find(m => m.role === 'user');
        if (currentSession.name === 'New Chat' && firstUserMessage) {
            currentSession.name = firstUserMessage.content.substring(0, 40) + (firstUserMessage.content.length > 40 ? '...' : '');
        }

        if (existingIndex > -1) {
            globalMemory[existingIndex] = { ...currentSession };
        } else {
            globalMemory.unshift({ ...currentSession });
        }
        saveGlobalMemory();
    };
    
    // --- UI Rendering ---
    const renderGlobalMemoryUI = () => {
        globalMemoryList.innerHTML = '';
        if (globalMemory.length === 0) {
            globalMemoryList.innerHTML = '<li style="padding: 0.5rem 1rem; color: var(--text-muted); font-style: italic;">No saved chats yet.</li>';
            return;
        }
        globalMemory.forEach(session => {
            const li = document.createElement('li');
            li.className = `memory-item ${currentSession.id === session.id ? 'active' : ''}`;
            li.dataset.id = session.id;
            li.innerHTML = `
                <span class="memory-item-name">${session.name}</span>
                <div class="memory-item-actions">
                    <button class="rename-button" title="Rename"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete-button" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            `;
            li.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                handleLoadSession(session.id);
            });
            globalMemoryList.appendChild(li);
        });
    };

    const renderCurrentSessionMessages = () => {
        messagesContainer.innerHTML = '';
        if (!currentSession || currentSession.messages.length === 0) {
            // *** THIS BLOCK CONTAINS THE CORRECTED PATH ***
            messagesContainer.innerHTML = `<div class="welcome-message">
                <div class="welcome-icon"><img src="pen_5502.png" alt="Logo" style="width: 36px; height: 36px;"></div>
                <div class="welcome-content"><h2>✨ Welcome! ✨</h2><p>I'm your intelligent writing assistant powered by advanced AI agents.How can I help you?</p></div>
            </div>`;
            return;
        }
        currentSession.messages.forEach(msg => addMessageToDOM(msg));
    };

    const addMessageToDOM = (message) => {
        const { id, content, role, feedback } = message;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.dataset.messageId = id;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

        const messageContentWrapper = document.createElement('div');
        messageContentWrapper.className = 'message-content-wrapper';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = role === 'bot' ? marked.parse(content) : content;
        
        messageContentWrapper.appendChild(messageContent);
        
        if (role === 'bot') {
            const feedbackContainer = document.createElement('div');
            feedbackContainer.className = 'message-feedback';
            feedbackContainer.innerHTML = `
                <button class="feedback-button ${feedback === 'good' ? 'selected' : ''}" data-action="good" title="Good response"><i class="fas fa-check-circle"></i></button>
                <button class="feedback-button ${feedback === 'bad' ? 'selected' : ''}" data-action="bad" title="Bad response"><i class="fas fa-times-circle"></i></button>
                <button class="feedback-button" data-action="revise" title="Regenerate response"><i class="fas fa-sync-alt"></i></button>
            `;
            messageContentWrapper.appendChild(feedbackContainer);
        }

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContentWrapper);
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
    };

    const showLoading = () => {
        loadingOverlay.classList.remove('hidden');
        sendButton.disabled = true;
    };

    const hideLoading = () => {
        loadingOverlay.classList.add('hidden');
        sendButton.disabled = false;
    };
    
    // --- Event Handlers ---
    const handleVoiceInput = () => {
        if (!recognition) return;
        if (isRecording) {
            recognition.stop();
        } else {
            try {
                recognition.start();
            } catch (error) {
                console.error("Could not start recognition:", error);
                // This can happen if it's already running and gets clicked again quickly
                isRecording = false;
                voiceInputButton.classList.remove('recording');
            }
        }
    };
    
    const handleNewChat = () => {
        saveCurrentSession();
        currentSession = createNewSession();
        renderCurrentSessionMessages();
        renderGlobalMemoryUI();
        input.focus();
    };

    const handleLoadSession = (sessionId) => {
        if (currentSession.id === sessionId) return;
        saveCurrentSession();
        const sessionToLoad = globalMemory.find(s => s.id === sessionId);
        if (sessionToLoad) {
            currentSession = JSON.parse(JSON.stringify(sessionToLoad));
            renderCurrentSessionMessages();
            renderGlobalMemoryUI();
        }
    };
    
    const handleRenameSession = (sessionId, nameSpan) => {
        const currentName = nameSpan.textContent;
        nameSpan.innerHTML = `<input type="text" class="memory-item-name-input" value="${currentName}" />`;
        const nameInput = nameSpan.querySelector('input');
        nameInput.focus();
        nameInput.select();
        
        const saveName = () => {
            const newName = nameInput.value.trim();
            const session = globalMemory.find(s => s.id === sessionId);
            if (session && newName) {
                session.name = newName;
                if(currentSession.id === sessionId) currentSession.name = newName;
                saveGlobalMemory();
            } else {
                renderGlobalMemoryUI();
            }
        };

        nameInput.addEventListener('blur', saveName);
        nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameInput.blur(); });
    };

    const handleDeleteSession = (sessionId) => {
        if (confirm('Are you sure you want to permanently delete this chat?')) {
            globalMemory = globalMemory.filter(s => s.id !== sessionId);
            saveGlobalMemory();
            if (currentSession.id === sessionId) {
                handleNewChat();
            }
        }
    };

    const handleFeedback = (messageId, action) => {
        const messageIndex = currentSession.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;

        if (action === 'revise') {
            handleRegenerate();
            return;
        }

        const message = currentSession.messages[messageIndex];
        message.feedback = action;
        saveCurrentSession(); // Save the feedback

        // Update UI
        const messageDiv = document.querySelector(`.message[data-message-id="${messageId}"]`);
        if (messageDiv) {
            const feedbackButtons = messageDiv.querySelectorAll('.feedback-button');
            feedbackButtons.forEach(btn => {
                btn.classList.remove('selected');
                if (btn.dataset.action === action) {
                    btn.classList.add('selected');
                }
            });
        }
    };
    
    const callApi = async () => {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session: currentSession }),
                signal: AbortSignal.timeout(300000) // 5 min timeout
            });
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);

            const botMessage = { id: `msg_${Date.now()}`, role: 'bot', content: data.content };
            currentSession.messages.push(botMessage);
            addMessageToDOM(botMessage);

        } catch (error) {
            const errorMessageContent = `❌ **Error:** ${error.message}. Please try again.`;
            const errorMessage = { id: `msg_${Date.now()}`, role: 'bot', content: errorMessageContent };
            currentSession.messages.push(errorMessage);
            addMessageToDOM(errorMessage);
        } finally {
            hideLoading();
            input.focus();
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        const prompt = input.value.trim();
        if (!prompt) return;

        const userMessage = { id: `msg_${Date.now()}`, role: 'user', content: prompt };
        currentSession.messages.push(userMessage);
        addMessageToDOM(userMessage);
        input.value = '';
        showLoading();
        await callApi();
    };

    const handleRegenerate = async () => {
        showLoading();
        await callApi();
    };
    
    // --- Initialization ---
    const init = () => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeToggle.addEventListener('click', () => {
            const newTheme = (document.documentElement.getAttribute('data-theme') || 'light') === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });

        form.addEventListener('submit', handleSubmit);
        newChatButton.addEventListener('click', handleNewChat);
        sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('hidden'));
        if (voiceInputButton) voiceInputButton.addEventListener('click', handleVoiceInput);
        
        globalMemoryList.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            const sessionId = e.target.closest('.memory-item').dataset.id;
            if (button.classList.contains('rename-button')) {
                handleRenameSession(sessionId, button.parentElement.previousElementSibling);
            } else if (button.classList.contains('delete-button')) {
                handleDeleteSession(sessionId);
            }
        });

        messagesContainer.addEventListener('click', (e) => {
            const feedbackButton = e.target.closest('.feedback-button');
            if (feedbackButton) {
                const messageId = feedbackButton.closest('.message').dataset.messageId;
                const action = feedbackButton.dataset.action;
                handleFeedback(messageId, action);
            }
        });

        loadGlobalMemory();
        input.focus();
        console.log('🤖 AI Content Generator Initialized with Conversational Memory, HITL & Voice Input.');
    };

    init();
});