import { ref } from 'vue'

export type MenuState = 'explore' | 'options' | 'chat' | 'auth' | 'account' | null

export const activeMenu = ref<MenuState>(null)

export const setActiveMenu = (menu: MenuState) => {
  activeMenu.value = menu
}
