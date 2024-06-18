import { createApp } from 'vue'
import App from './App.vue'

import { Checkbox, Tooltip, Progress, Popover, Button, Select, SelectOption } from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import './styles/bootstrap.scss'

const app = createApp(App)

app.use(Checkbox)
app.use(Tooltip)
app.use(Progress)
app.use(Popover)
app.use(Button)
app.use(Select)
app.use(SelectOption)

app.mount('#app')
