<template>
  <div class="chat-container">
    <button class="chat-button" @click="toggleChat">
      <span class="material-icons">{{ isOpen ? 'close' : 'chat' }}</span>
    </button>
    
    <div class="chat-window" :class="{ 'is-open': isOpen }">
      <div class="chat-header">
        <h3>AI Assistant</h3>
        <button class="close-btn" @click="toggleChat">
          <span class="material-icons">close</span>
        </button>
      </div>
      
      <div class="chat-messages" ref="messagesContainer">
        <div v-for="(message, index) in messages" 
          :key="index" 
          :class="['message', message.role]"
        >
          <span class="material-icons avatar">
            {{ message.role === 'user' ? 'person' : 'smart_toy' }}
          </span>
          <div class="message-content">
            <p v-if="message.text" v-html="formatMessage(message.text)"></p>
            <div v-if="message.role === 'model' && message.loading" class="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>
      
      <form class="chat-input" @submit.prevent="sendMessage">
        <textarea 
          v-model="userInput"
          placeholder="Type a message..."
          @keydown.enter.exact.prevent="sendMessage"
          :rows="1"
          ref="inputField"
        ></textarea>
        <button type="submit" :disabled="!userInput.trim()">
          <span class="material-icons">send</span>
        </button>
      </form>
    </div>

    <!-- Add auth modal -->
    <AuthModal 
      v-if="showAuth"
      @close="showAuth = false"
      @auth-success="handleAuthSuccess"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, nextTick, watch, onMounted } from 'vue'
import { GoogleGenerativeAI } from "@google/generative-ai"
import { activeMenu, setActiveMenu } from '../utils/menuState'
import { processUserInput, generateResponse } from '../utils/aiTraining'
import { auth, currentUser, isAuthenticated } from '../utils/auth'
import AuthModal from './AuthModal.vue'
import { systemPrompts, formatPrompt } from '../utils/prompts'
import { db } from '../utils/database' 

interface ChatMessage {
  role: 'user' | 'model'
  text: string
  loading?: boolean
}

interface EntityType {
  place?: string
  category?: string
  start?: string
  end?: string
  coordinates?: number[]; 
}

export default defineComponent({
  name: 'ChatButton',
  components: { AuthModal },
  emits: ['search-location', 'get-directions', 'center-map'],
  setup(_, { emit }) {
    const isOpen = ref(false)
    const userInput = ref('')
    const messages = ref<ChatMessage[]>([])
    const messagesContainer = ref<HTMLElement | null>(null)
    const inputField = ref<HTMLTextAreaElement | null>(null)
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    const chat = model.startChat()
    const showAuth = ref(false)
    const chatInitialized = ref(false)

    const initializeChat = async () => {
      if (!chatInitialized.value && currentUser.value?.id) {
    
        const previousMessages = db.getUserMessages(currentUser.value.id)
        messages.value = previousMessages.map(msg => ({
          role: msg.role,
          text: msg.content
        }))

        await chat.sendMessage(systemPrompts.chatbot)
        chatInitialized.value = true
        
        if (!previousMessages.length) {
          addMessage('model', 'Xin chào! Tôi là AKI BOT. Tôi có thể giúp gì cho bạn?')
        }
      }
    }

    const toggleChat = async () => {
      if (isOpen.value) {
        setActiveMenu(null)
      } else {
        setActiveMenu('chat')
        await initializeChat() 
      }
    }

    const loadPreviousMessages = async () => {
      if (currentUser.value?.id) {
        const previousMessages = db.getUserMessages(currentUser.value.id);
        messages.value = previousMessages.map(msg => ({
          role: msg.role,
          text: msg.content
        }));
      }
    }

    const addMessage = async (role: 'user' | 'model', text: string) => {
 
      messages.value.push({ role, text })

      if (currentUser.value?.id) {
        await db.saveUserMessage(currentUser.value.id, {
          role,
          content: text
        })
      }

      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
      })
    }

    const formatMessage = (text: string) => {
      return text.replace(/\n/g, '<br>')
    }

    const systemPrompt = `You are an AI map assistant named AKI BOT.
Your main features:
- Help users find locations
- Provide information about places
- Suggest nearby places to explore
- Assist with navigation

When asked for your name, always respond with "My name is AKI BOT, I'm your AI map assistant!"

Please be concise and friendly in your responses. For location-related questions, suggest using the map's features.
Format location suggestions like this: [LOCATION]name|latitude|longitude[/LOCATION]`

    const handleUserIntent = async (message: string) => {
      const analysis = processUserInput(message)
      console.log('Intent analysis:', analysis)

      if (analysis.intent === 'identity') {
        return "My name is AKI BOT, I'm your AI map assistant!"
      }

      if (analysis.intent && analysis.entities) {
        const response = generateResponse(analysis.intent, analysis.entities)
        
        if (analysis.intent === 'find_place' && (analysis.entities as EntityType).coordinates) {
          const [lat, lng] = (analysis.entities as EntityType).coordinates
          emit('center-map', { lat, lng, zoom: 16 })
        }
        
        return response
      }

      try {
        const result = await chat.sendMessage(message)
        return result.response.text()
      } catch (error) {
        console.error('AI processing error:', error) 
        return 'Xin lỗi, tôi không hiểu yêu cầu của bạn. Bạn có thể thử hỏi về các địa điểm hoặc dịch vụ cụ thể?'
      }
    }

    const sendMessage = async () => {
      try {
        if (!genAI || !model || !chat) {
          console.error('AI service not initialized');
          addMessage('model', 'AI service is currently unavailable. Please check the API key configuration.');
          return;
        }

        if (!isAuthenticated.value) {
          showAuth.value = true;
          return;
        }

        const message = userInput.value.trim();
        if (!message) return;

        if (!await auth.useAICredits(1)) {
          addMessage('model', 'You have run out of AI credits. Please purchase more to continue.');
          return;
        }

        if (!messages.value.length) {
          await chat.sendMessage(systemPrompts.chatbot)
        }

        addMessage('user', message)
        userInput.value = ''
        messages.value.push({ role: 'model', text: '', loading: true })

        const intent = processUserInput(message)
        if (intent.intent) {
          const response = generateResponse(intent.intent, intent.entities)
          messages.value.pop()
          addMessage('model', response)
          return
        }

        const result = await chat.sendMessage(message)
        if (!result || !result.response) {
          throw new Error('No response from AI service')
        }
        
        messages.value.pop()
        addMessage('model', result.response.text())

      } catch (error) {
        console.error('Chat error:', error)
        messages.value.pop()
        addMessage('model', 'Xin lỗi, tôi gặp lỗi khi xử lý. Bạn có thể thử lại không?')
      }
    }

    const handleAuthSuccess = async () => {
      showAuth.value = false;
      messages.value = []; 
      await loadPreviousMessages(); 
      addMessage('model', `Welcome back! You have ${currentUser.value?.aiCredits} AI credits remaining.`);
    }

    onMounted(async () => {
      if (isAuthenticated.value) {
        await initializeChat()
      }
    })

    watch(isAuthenticated, async (newValue) => {
      if (newValue) {
        // Re-initialize chat when user logs in
        chatInitialized.value = false
        await initializeChat()
      } else {
        // Clear everything when user logs out
        messages.value = []
        chatInitialized.value = false
      }
    }, { immediate: true })

    watch(activeMenu, (newMenu) => {
      isOpen.value = newMenu === 'chat'
    })

    watch(isOpen, () => {
      nextTick(() => {
        if (isOpen.value && inputField.value) {
          inputField.value.focus()
        }
      })
    })

    return {
      isOpen,
      userInput,
      messages,
      messagesContainer,
      inputField,
      toggleChat,
      sendMessage,
      formatMessage,
      showAuth,
      handleAuthSuccess,
      chatInitialized
    }
  }
})
</script>

<style scoped>

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

.chat-container {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  position: fixed;
  z-index: 1000;
}

.chat-button {
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background: linear-gradient(135deg, #1A73E8, #3498db);
  border: none;
  color: white;
  box-shadow: 0 4px 12px rgba(26, 115, 232, 0.3);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.chat-button:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 16px rgba(26, 115, 232, 0.4);
  background: linear-gradient(135deg, #1557B0, #2980b9);
}

.chat-button .material-icons {
  font-size: 24px;
  transition: transform 0.3s ease;
}

.chat-button:hover .material-icons {
  transform: scale(1.1);
}

.chat-window {
  position: fixed;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  visibility: hidden;
  transform: scale(0.95) translateY(10px);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-window.is-open {
  opacity: 1;
  visibility: visible;
  transform: scale(1) translateY(0);
}

.chat-header {
  padding: 16px 20px;
  background: linear-gradient(135deg, #1A73E8, #3498db);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.2px;
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.chat-header h3::before {
  content: '';
  width: 8px;
  height: 8px;
  background: #4CAF50;
  border-radius: 50%;
  display: inline-block;
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: white;
  padding: 6px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

.chat-messages {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  min-height: 300px;
  max-height: 500px;
  scroll-behavior: smooth;
  background: rgba(248, 249, 250, 0.5);
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  opacity: 0;
  transform: translateY(10px);
  animation: messageIn 0.3s ease forwards;
}

@keyframes messageIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  flex-direction: row-reverse;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.message.user .avatar {
  background: #E3F2FD;
  color: #1A73E8;
}

.message.model .avatar {
  background: #1A73E8;
  color: white;
}

.message-content {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 16px;
  position: relative;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.message.user .message-content {
  background: #E3F2FD;
  border-bottom-right-radius: 4px;
}

.message.model .message-content {
  background: white;
  border-bottom-left-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.message-content p {
  margin: 0;
  line-height: 1.6;
  font-size: 14px;
  color: #2c3e50;
  white-space: pre-wrap;
  letter-spacing: -0.1px;
  font-weight: 400;
}

.chat-input {
  padding: 16px 20px;
  background: white;
  border-top: 1px solid #eee;
  display: flex;
  gap: 12px;
  align-items: flex-end;
  position: relative;
}

.chat-input textarea {
  flex: 1;
  border: 1px solid #e0e0e0;
  border-radius: 24px;
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  max-height: 120px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: -0.1px;
  font-family: inherit;
  background: #f8f9fa;
  transition: all 0.2s ease;
}

.chat-input textarea::placeholder {
  color: #94a3b8;
  font-weight: 400;
}

.chat-input textarea:focus {
  outline: none;
  border-color: #1A73E8;
  background: white;
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
}

.chat-input button {
  background: #1A73E8;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chat-input button:not(:disabled):hover {
  background: #1557B0;
  transform: scale(1.05);
}

.chat-input button:disabled {
  background: #e0e0e0;
  cursor: not-allowed;
}

.typing-indicator {
  padding: 12px 16px;
  display: flex;
  gap: 4px;
  align-items: center;
  height: 24px;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #1A73E8;
  animation: typing 1.4s infinite;
  opacity: 0.6;
}

.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

@media (min-width: 768px) {
  .chat-container {
    bottom: 20px;
    right: 110px;
  }

  .chat-window {
    bottom: 80px;
    right: 110px;
    width: 400px;
    height: 600px;
    transform-origin: bottom right;
  }

  .message-content {
    backdrop-filter: blur(10px);
  }
}

@media (max-width: 767px) {
  .chat-container {
    bottom: 80px;
    right: 10px;
  }

  .chat-window {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    border-radius: 0;
    transform-origin: bottom right;
  }

  .chat-messages {
    height: calc(100vh - 140px);
    max-height: none;
  }

  .chat-header {
    padding-top: max(16px, env(safe-area-inset-top));
  }

  .chat-input {
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

@media screen and (-webkit-min-device-pixel-ratio: 2),
       screen and (min-resolution: 2dppx) {
  .chat-container {
    -webkit-font-smoothing: subpixel-antialiased;
  }
}
</style>
