import cors from 'cors'
import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import {
  CreateTripInputSchema,
  type Trip,
  type TripDetail,
} from '@planleggreise/models'
import {
  createSupabaseAuthService,
  type AuthenticatedUser,
  type AuthService,
} from './auth.js'
import {
  createSupabaseTripRepository,
  isValidDateRange,
  type TripRepository,
} from './trip-repository.js'

type AuthenticatedRequest = Request & {
  accessToken: string
  user: AuthenticatedUser
}

export type AppDependencies = {
  authService?: AuthService
  tripRepository?: TripRepository
}

function getAccessToken(request: Request): string | null {
  const authorization = request.header('authorization')

  if (!authorization?.startsWith('Bearer ')) {
    return null
  }

  const token = authorization.slice('Bearer '.length).trim()
  return token || null
}

function requireAuthenticatedUser(
  authService: AuthService,
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const accessToken = getAccessToken(request)

  if (!accessToken) {
    response.status(401).json({ message: 'Authentication required' })
    return
  }

  void authService
    .authenticate(accessToken)
    .then((user) => {
      if (!user) {
        response.status(401).json({ message: 'Invalid authentication token' })
        return
      }

      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.accessToken = accessToken
      authenticatedRequest.user = user
      next()
    })
    .catch(next)
}

export function createApp(dependencies: AppDependencies = {}) {
  const app = express()
  const authService = dependencies.authService ?? createSupabaseAuthService()
  const tripRepository =
    dependencies.tripRepository ?? createSupabaseTripRepository()
  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
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

  app.get(
    '/api/trips',
    (request, response, next) =>
      requireAuthenticatedUser(authService, request, response, next),
    async (request: Request, response: Response<Trip[]>, next: NextFunction) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest
        const trips = await tripRepository.listTrips(
          authenticatedRequest.user.id,
          authenticatedRequest.accessToken,
        )
        response.json(trips)
      } catch (error) {
        next(error)
      }
    },
  )

  app.get(
    '/api/trips/:tripId',
    (request, response, next) =>
      requireAuthenticatedUser(authService, request, response, next),
    async (
      request: Request,
      response: Response<TripDetail | { message: string }>,
      next: NextFunction,
    ) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest
        const { tripId } = request.params

        if (typeof tripId !== 'string') {
          response.status(400).json({ message: 'Trip id is required' })
          return
        }

        const trip = await tripRepository.getTrip(
          authenticatedRequest.user.id,
          authenticatedRequest.accessToken,
          tripId,
        )

        if (!trip) {
          response.status(404).json({ message: 'Trip not found' })
          return
        }

        response.json(trip)
      } catch (error) {
        next(error)
      }
    },
  )

  app.post(
    '/api/trips',
    (request, response, next) =>
      requireAuthenticatedUser(authService, request, response, next),
    async (
      request: Request,
      response: Response<Trip | { message: string; issues?: unknown }>,
      next: NextFunction,
    ) => {
      try {
        const parsedInput = CreateTripInputSchema.safeParse(request.body)

        if (!parsedInput.success) {
          response.status(400).json({
            message: 'Invalid trip data',
            issues: parsedInput.error.issues,
          })
          return
        }

        if (
          !isValidDateRange(
            parsedInput.data.startDate,
            parsedInput.data.endDate,
          )
        ) {
          response.status(400).json({
            message: 'The trip end date must be on or after the start date',
          })
          return
        }

        const authenticatedRequest = request as AuthenticatedRequest
        const trip = await tripRepository.createTrip(
          authenticatedRequest.user.id,
          authenticatedRequest.accessToken,
          parsedInput.data,
        )
        response.status(201).json(trip)
      } catch (error) {
        next(error)
      }
    },
  )

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
