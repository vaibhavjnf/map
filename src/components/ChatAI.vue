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
          :disabled="isProcessing"
        ></textarea>
        <button type="submit" :disabled="!userInput.trim() || isProcessing">
          <span class="material-icons">{{ isProcessing ? 'hourglass_empty' : 'send' }}</span>
        </button>
      </form>
    </div>

    <AuthModal 
      v-if="showAuth"
      @close="showAuth = false"
      @auth-success="handleAuthSuccess"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, nextTick, watch, onMounted } from 'vue'
import { activeMenu, setActiveMenu } from '../utils/menuState'
import { currentUser, isAuthenticated } from '../utils/auth'
import AuthModal from './AuthModal.vue'
import { findLocationInText } from '../utils/locationHandler'
import { chatService, db } from '../services/chatService'

interface ChatMessage {
  role: 'user' | 'model'  
  text: string
  loading?: boolean
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
    const showAuth = ref(false)
    const chatInitialized = ref(false)
    const isProcessing = ref(false)
    const cooldownTime = 1000 

    const initializeChat = async () => {
      if (!chatInitialized.value && currentUser.value?.id) {
        const { messages: previousMessages, isNew } = await chatService.initializeChat(currentUser.value.id)
        chatInitialized.value = true
        
        if (isNew) {
          addMessage('model', 'Xin chào! Tôi là AKI BOT.') 
        } else {
          messages.value = previousMessages
        }
      }
    }

    const toggleChat = async () => {
      if (isOpen.value) {
        setActiveMenu(null)
      } else {
        setActiveMenu('chat')
        await initializeChat() 
        nextTick(() => {
          scrollToBottom()
        })
      }
    }

    const loadPreviousMessages = async () => {
      if (currentUser.value?.id) {
        const previousMessages = db.getUserMessages(currentUser.value.id);
        messages.value = previousMessages.map((msg: { role: any; content: any }) => ({
          role: msg.role,
          text: msg.content
        }));
      }
    }

    const typeMessage = async (text: string, delay: number = 30): Promise<string> => {
      let result = ''
      for (let i = 0; i < text.length; i++) {
        result += text[i]
        messages.value[messages.value.length - 1].text = result
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      return result
    }

    const addMessage = async (role: 'user' | 'model', text: string) => {
      messages.value.push({ role, text: role === 'model' ? '' : text })

      if (role === 'model') {
        await typeMessage(text)
      }

      if (currentUser.value?.id) {
        await db.saveUserMessage(currentUser.value.id, {
          role,
          content: text
        })
      }

      nextTick(() => {
        scrollToBottom()
      })
    }

    const formatMessage = (text: string) => {
      return text.replace(/\n/g, '<br>')
    }

    const handleUserMessage = async (message: string) => {
      if (!isAuthenticated.value) {
        showAuth.value = true
        return
      }
    
      try {
        addMessage('user', message)
        messages.value.push({ role: 'model', text: '', loading: true })
    
        const responseText = await chatService.sendMessage(message, currentUser.value!.id)
        
        const location = findLocationInText(responseText)
        if (location) {

          emit('search-location', {
            name: location.name,
            latitude: location.latitude,
            longitude: location.longitude
          })
          
          messages.value.pop()
          const locationMessage = `Đã tìm thấy địa điểm "${location.name}". Đang di chuyển bản đồ đến vị trí...`
          
          addMessage('model', locationMessage)
          
          setTimeout(() => {
            setActiveMenu(null)
          }, 2000)
          
          return
        }
    
        messages.value.pop()
        addMessage('model', responseText)
    
      } catch (error: any) {
        console.error('Chat error:', error)
        messages.value.pop()
        addMessage('model', error.message || 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.')
      }
    }

    const sendMessage = async () => {
      if (isProcessing.value || !userInput.value.trim()) return;
      
      try {
        isProcessing.value = true;
        
        if (!isAuthenticated.value) {
          showAuth.value = true;
          return;
        }

        await handleUserMessage(userInput.value.trim());
        userInput.value = '';

      } catch (error) {
        console.error('Send message error:', error);
      } finally {
        setTimeout(() => {
          isProcessing.value = false;
        }, cooldownTime);
      }
    }

    const handleAuthSuccess = async () => {
      showAuth.value = false
      messages.value = []
      await loadPreviousMessages()
      
      if (!messages.value.length) {
        addMessage('model', `Xin chào! Tôi có thể giúp gì cho bạn?`)
      }
    }

    const scrollToBottom = () => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    }

    onMounted(async () => {
      if (isAuthenticated.value) {
        await initializeChat()
      }
    })

    watch(isAuthenticated, async (newValue) => {
      if (newValue) {
      
        chatInitialized.value = false
        await initializeChat()
      } else {
        
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

    watch(() => messages.value.length, () => {
      nextTick(() => {
        scrollToBottom()
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
      chatInitialized,
      isProcessing,
      scrollToBottom
    }
  }
})
</script>

<style scoped>
@import '../styles/chat.css';
</style>
