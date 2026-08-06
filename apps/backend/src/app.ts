import cors from 'cors'
import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from 'express'
import { TripSchema, type Trip } from '@planleggreise/models'

const trips: Trip[] = [
  {
    id: 'lofoten',
    name: 'Northern lights in Lofoten',
    destination: 'Norway',
    dateRange: '12 - 18 Oct 2026',
    duration: '6 days',
    status: 'planning',
    accent: 'aurora',
  },
  {
    id: 'kyoto',
    name: 'Autumn food tour',
    destination: 'Kyoto, Japan',
    dateRange: '3 - 12 Nov 2026',
    duration: '9 days',
    status: 'booked',
    accent: 'saffron',
  },
  {
    id: 'lisbon',
    name: 'A slow weekend by the sea',
    destination: 'Lisbon, Portugal',
    dateRange: '21 - 24 Jan 2027',
    duration: '3 days',
    status: 'planning',
    accent: 'coral',
  },
]

export function createApp() {
  const app = express()
  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())

  app.use(cors({ origin: allowedOrigins }))
  app.use(express.json())

  app.get('/api/health', (_request: Request, response: Response) => {
    response.json({
      status: 'ok',
      service: 'planleggreise-api',
      timestamp: new Date().toISOString(),
    })
  })

  app.get('/api/trips', (_request: Request, response: Response<Trip[]>) => {
    response.json(TripSchema.array().parse(trips))
  })

  app.use((_request: Request, response: Response) => {
    response.status(404).json({ message: 'Route not found' })
  })

  const errorHandler: ErrorRequestHandler = (
    error,
    _request,
    response,
    _next,
  ) => {
    console.error(error)
    response.status(500).json({ message: 'Internal server error' })
  }

  app.use(errorHandler)

  return app
}
