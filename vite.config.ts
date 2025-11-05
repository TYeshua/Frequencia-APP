import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // --- ADICIONE ESTA LINHA ---
  // Substitua 'nome-do-seu-repositorio' pelo nome exato do seu repo no GitHub.
  base: '/Frequencia-APP/', 
  // --- FIM DA ADIÇÃO ---
})