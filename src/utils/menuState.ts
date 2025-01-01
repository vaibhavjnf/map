import { ref } from 'vue'

export const activeMenu = ref<string | null>(null)

export const setActiveMenu = (menuName: string | null) => {
  activeMenu.value = menuName
}
