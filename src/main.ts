import {createApp} from 'vue'
import App from './App.vue'

import {
    Button,
    Checkbox,
    Drawer,
    Form,
    Popover,
    Progress,
    Select,
    SelectOption,
    Tooltip,
    Row,
    Col,
    Input,
    Space,
    Switch,
} from 'ant-design-vue'
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
app.use(Drawer)
app.use(Form)
app.use(Row)
app.use(Col)
app.use(Input)
app.use(Space)
app.use(Switch)

app.mount('#app')
