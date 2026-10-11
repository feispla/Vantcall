import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/700.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/barlow-condensed/800.css'
import './styles/theme.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import { initAuth } from './lib/auth.js'

// La sesion se resuelve antes de montar: las vistas nunca pintan un estado a medias.
initAuth().finally(() => {
  createApp(App).use(router).mount('#app')
})
