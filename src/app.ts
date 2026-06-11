import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import router from './routes'
import { errorHandler } from './middlewares/errorHandler'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }))

app.use('/api', router)

app.use(errorHandler)

export default app
