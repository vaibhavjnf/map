import { ref } from 'vue'

export const activeMenu = ref<'explore' | 'options' | 'chat' | null>(null)

export const setActiveMenu = (menu: 'explore' | 'options' | 'chat' | null) => {
  activeMenu.value = menu
}
