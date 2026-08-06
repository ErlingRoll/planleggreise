import cors from 'cors'
import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import {
  ActivitySchema,
  CreateActivityInputSchema,
  CreateHousingStayInputSchema,
  CreateMealInputSchema,
  CreateTripInputSchema,
  HousingStaySchema,
  MealSchema,
  TripDaySchema,
  UpdateHousingStayInputSchema,
  UpdateMealInputSchema,
  UpdateTripDayInputSchema,
  UpdateActivityInputSchema,
  UpdateTripInputSchema,
  isTripDurationWithinLimit,
  type Trip,
  type TripDetail,
  type UpdateActivityInput,
} from '@planleggreise/models'
import {
  createSupabaseAuthService,
  type AuthenticatedUser,
  type AuthService,
} from './auth.js'
import {
  createSupabaseTripRepository,
  isDateWithinTrip,
  isValidDateRange,
  type TripRepository,
} from './trip-repository.js'
import {
  createGooglePlacesResolver,
  GooglePlacesError,
  type GooglePlacesResolver,
} from './google-places.js'

type AuthenticatedRequest = Request & {
  accessToken: string
  user: AuthenticatedUser
}

export type AppDependencies = {
  authService?: AuthService
  tripRepository?: TripRepository
  googlePlacesResolver?: GooglePlacesResolver
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
  const googlePlacesResolver =
    dependencies.googlePlacesResolver ?? createGooglePlacesResolver()
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

  app.patch(
    '/api/trips/:tripId',
    (request, response, next) =>
      requireAuthenticatedUser(authService, request, response, next),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest
        const { tripId } = request.params

        if (typeof tripId !== 'string') {
          response.status(400).json({ message: 'Trip id is required' })
          return
        }

        const parsedInput = UpdateTripInputSchema.safeParse(request.body)

        if (!parsedInput.success) {
          response.status(400).json({
            message: 'Invalid trip data',
            issues: parsedInput.error.issues,
          })
          return
        }

        const currentTrip = await tripRepository.getTrip(
          authenticatedRequest.user.id,
          authenticatedRequest.accessToken,
          tripId,
        )

        if (!currentTrip) {
          response.status(404).json({ message: 'Trip not found' })
          return
        }

        const nextTrip = {
          id: currentTrip.id,
          name: parsedInput.data.name ?? currentTrip.name,
          startDate: parsedInput.data.startDate ?? currentTrip.startDate,
          endDate: parsedInput.data.endDate ?? currentTrip.endDate,
          notes:
            parsedInput.data.notes === undefined
              ? currentTrip.notes
              : parsedInput.data.notes,
        }

        if (!isValidDateRange(nextTrip.startDate, nextTrip.endDate)) {
          response.status(400).json({
            message: 'The trip end date must be on or after the start date',
          })
          return
        }

        if (
          !isTripDurationWithinLimit(nextTrip.startDate, nextTrip.endDate)
        ) {
          response.status(400).json({
            message: 'Trips cannot be longer than 60 days',
          })
          return
        }

        const activities = currentTrip.days.flatMap((day) => day.activities)
        const activityOutsideTrip = activities.some(
          (activity) => !isDateWithinTrip(nextTrip, activity.tripDate),
        )

        if (activityOutsideTrip) {
          response.status(400).json({
            message: 'The new trip dates cannot exclude existing activities',
          })
          return
        }

        const trip = await tripRepository.updateTrip(
          authenticatedRequest.user.id,
          authenticatedRequest.accessToken,
          tripId,
          parsedInput.data,
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

  app.patch(
    '/api/trips/:tripId/days/:tripDate',
    (request, response, next) =>
      requireAuthenticatedUser(authService, request, response, next),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest
        const { tripId, tripDate } = request.params

        if (typeof tripId !== 'string' || typeof tripDate !== 'string') {
          response.status(400).json({ message: 'Trip id and date are required' })
          return
        }

        const parsedInput = UpdateTripDayInputSchema.safeParse(request.body)

        if (!parsedInput.success) {
          response.status(400).json({
            message: 'Invalid day data',
            issues: parsedInput.error.issues,
          })
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

        if (!isDateWithinTrip(trip, tripDate)) {
          response.status(400).json({ message: 'The day must be within the trip dates' })
          return
        }

        const day = await tripRepository.updateDay(
          authenticatedRequest.user.id,
          authenticatedRequest.accessToken,
          tripId,
          tripDate,
          parsedInput.data,
        )

        if (!day) {
          response.status(404).json({ message: 'Day not found' })
          return
        }

        response.json(TripDaySchema.parse(day))
      } catch (error) {
        next(error)
      }
    },
  )

  app.delete(
    '/api/trips/:tripId',
    (request, response, next) =>
      requireAuthenticatedUser(authService, request, response, next),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest
        const { tripId } = request.params

        if (typeof tripId !== 'string') {
          response.status(400).json({ message: 'Trip id is required' })
          return
        }

        const deleted = await tripRepository.deleteTrip(
          authenticatedRequest.user.id,
          authenticatedRequest.accessToken,
          tripId,
        )

        if (!deleted) {
          response.status(404).json({ message: 'Trip not found' })
          return
        }

        response.status(204).send()
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

        if (
          !isTripDurationWithinLimit(
            parsedInput.data.startDate,
            parsedInput.data.endDate,
          )
        ) {
          response.status(400).json({
            message: 'Trips cannot be longer than 60 days',
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

  app.post(
    '/api/trips/:tripId/housing',
    (request, response, next) =>
      requireAuthenticatedUser(authService, request, response, next),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest
        const { tripId } = request.params

        if (typeof tripId !== 'string') {
          response.status(400).json({ message: 'Trip id is required' })
          return
        }

        const parsedInput = CreateHousingStayInputSchema.safeParse(request.body)

        if (!parsedInput.success) {
          response.status(400).json({
            message: 'Invalid housing data',
            issues: parsedInput.error.issues,
          })
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

        const housingStay = await tripRepository.createHousingStay(
          authenticatedRequest.user.id,
          authenticatedRequest.accessToken,
          tripId,
          parsedInput.data,
        )

        if (!housingStay) {
          response.status(404).json({ message: 'Trip not found' })
          return
        }

        response.status(201).json(HousingStaySchema.parse(housingStay))
      } catch (error) {
        next(error)
      }
    },
  )

  app.patch(
    '/api/trips/:tripId/housing/:housingStayId',
    (request, response, next) =>
      requireAuthenticatedUser(authService, request, response, next),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest
        const { tripId, housingStayId } = request.params

        if (
          typeof tripId !== 'string' ||
          typeof housingStayId !== 'string'
        ) {
          response.status(400).json({ message: 'Trip and housing ids are required' })
          return
        }

        const parsedInput = UpdateHousingStayInputSchema.safeParse(request.body)

        if (!parsedInput.success) {
          response.status(400).json({
            message: 'Invalid housing data',
            issues: parsedInput.error.issues,
          })
          return
        }

        const currentHousingStay = await tripRepository.getHousingStay(
          authenticatedRequest.user.id,
          authenticatedRequest.accessToken,
          tripId,
          housingStayId,
        )

        if (!currentHousingStay) {
          response.status(404).json({ message: 'Housing stay not found' })
          return
        }

        const nextHousingStay = CreateHousingStayInputSchema.safeParse({
          name: currentHousingStay.name,
          checkIn: currentHousingStay.checkIn,
          checkOut: currentHousingStay.checkOut,
          notes: currentHousingStay.notes,
          ...parsedInput.data,
        })

        if (!nextHousingStay.success) {
          response.status(400).json({
            message: 'Invalid housing data',
            issues: nextHousingStay.error.issues,
          })
          return
        }

        const housingStay = await tripRepository.updateHousingStay(
          authenticatedRequest.user.id,
          authenticatedRequest.accessToken,
          tripId,
          housingStayId,
          parsedInput.data,
        )

        if (!housingStay) {
          response.status(404).json({ message: 'Housing stay not found' })
          return
        }

        response.json(HousingStaySchema.parse(housingStay))
      } catch (error) {
        next(error)
      }
    },
  )

  app.delete(
    '/api/trips/:tripId/housing/:housingStayId',
    (request, response, next) =>
      requireAuthenticatedUser(authService, request, response, next),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest
        const { tripId, housingStayId } = request.params

        if (
          typeof tripId !== 'string' ||
          typeof housingStayId !== 'string'
        ) {
          response.status(400).json({ message: 'Trip and housing ids are required' })
          return
        }

        const deleted = await tripRepository.deleteHousingStay(
          authenticatedRequest.user.id,
          authenticatedRequest.accessToken,
          tripId,
          housingStayId,
        )

        if (!deleted) {
          response.status(404).json({ message: 'Housing stay not found' })
          return
        }

        response.status(204).send()
      } catch (error) {
        next(error)
      }
    },
  )

  app.post(
    '/api/trips/:tripId/meals',
    (request, response, next) =>
      requireAuthenticatedUser(authService, request, response, next),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest
        const { tripId } = request.params

        if (typeof tripId !== 'string') {
          response.status(400).json({ message: 'Trip id is required' })
          return
        }

        const parsedInput = CreateMealInputSchema.safeParse(request.body)

        if (!parsedInput.success) {
          response.status(400).json({
            message: 'Invalid meal data',
            issues: parsedInput.error.issues,
          })
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

        if (!isDateWithinTrip(trip, parsedInput.data.tripDate)) {
          response.status(400).json({ message: 'The meal date must be within the trip dates' })
          return
        }

        const meal = await tripRepository.createMeal(
          authenticatedRequest.user.id,
          authenticatedRequest.accessToken,
          tripId,
          parsedInput.data,
        )

        if (!meal) {
          response.status(404).json({ message: 'Trip not found' })
          return
        }

        response.status(201).json(MealSchema.parse(meal))
      } catch (error) {
        next(error)
      }
    },
  )

  app.patch(
    '/api/trips/:tripId/meals/:mealId',
    (request, response, next) =>
      requireAuthenticatedUser(authService, request, response, next),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest
        const { tripId, mealId } = request.params

        if (typeof tripId !== 'string' || typeof mealId !== 'string') {
          response.status(400).json({ message: 'Trip and meal ids are required' })
          return
        }

        const parsedInput = UpdateMealInputSchema.safeParse(request.body)

        if (!parsedInput.success) {
          response.status(400).json({
            message: 'Invalid meal data',
            issues: parsedInput.error.issues,
          })
          return
        }

        const [trip, currentMeal] = await Promise.all([
          tripRepository.getTrip(
            authenticatedRequest.user.id,
            authenticatedRequest.accessToken,
            tripId,
          ),
          tripRepository.getMeal(
            authenticatedRequest.user.id,
            authenticatedRequest.accessToken,
            tripId,
            mealId,
          ),
        ])

        if (!trip || !currentMeal) {
          response.status(404).json({ message: 'Meal not found' })
          return
        }

        const nextMeal = CreateMealInputSchema.safeParse({
          tripDate: currentMeal.tripDate,
          title: currentMeal.title,
          startTime: currentMeal.startTime,
          endTime: currentMeal.endTime,
          allDay: currentMeal.allDay,
          notes: currentMeal.notes,
          ...parsedInput.data,
        })

        if (!nextMeal.success) {
          response.status(400).json({
            message: 'Invalid meal data',
            issues: nextMeal.error.issues,
          })
          return
        }

        if (!isDateWithinTrip(trip, nextMeal.data.tripDate)) {
          response.status(400).json({ message: 'The meal date must be within the trip dates' })
          return
        }

        const meal = await tripRepository.updateMeal(
          authenticatedRequest.user.id,
          authenticatedRequest.accessToken,
          tripId,
          mealId,
          parsedInput.data,
        )

        if (!meal) {
          response.status(404).json({ message: 'Meal not found' })
          return
        }

        response.json(MealSchema.parse(meal))
      } catch (error) {
        next(error)
      }
    },
  )

  app.delete(
    '/api/trips/:tripId/meals/:mealId',
    (request, response, next) =>
      requireAuthenticatedUser(authService, request, response, next),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest
        const { tripId, mealId } = request.params

        if (typeof tripId !== 'string' || typeof mealId !== 'string') {
          response.status(400).json({ message: 'Trip and meal ids are required' })
          return
        }

        const deleted = await tripRepository.deleteMeal(
          authenticatedRequest.user.id,
          authenticatedRequest.accessToken,
          tripId,
          mealId,
        )

        if (!deleted) {
          response.status(404).json({ message: 'Meal not found' })
          return
        }

        response.status(204).send()
      } catch (error) {
        next(error)
      }
    },
  )

  app.post(
    '/api/trips/:tripId/activities',
    (request, response, next) =>
      requireAuthenticatedUser(authService, request, response, next),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest
        const { tripId } = request.params

        if (typeof tripId !== 'string') {
          response.status(400).json({ message: 'Trip id is required' })
          return
        }

        const parsedInput = CreateActivityInputSchema.safeParse(request.body)

        if (!parsedInput.success) {
          response.status(400).json({
            message: 'Invalid activity data',
            issues: parsedInput.error.issues,
          })
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

        if (!isDateWithinTrip(trip, parsedInput.data.tripDate)) {
          response.status(400).json({
            message: 'The activity date must be within the trip dates',
          })
          return
        }

        let activityInput = parsedInput.data

        if (activityInput.googleMapsUrl) {
          try {
            const place = await googlePlacesResolver(activityInput.googleMapsUrl)
            activityInput = {
              ...activityInput,
              title: place.name,
              placeName: place.name,
              placeAddress: place.address,
            }
          } catch (error) {
            if (error instanceof GooglePlacesError) {
              response.status(error.statusCode).json({ message: error.message })
              return
            }
            throw error
          }
        }

        const activity = await tripRepository.createActivity(
          authenticatedRequest.user.id,
          authenticatedRequest.accessToken,
          tripId,
          activityInput,
        )

        if (!activity) {
          response.status(404).json({ message: 'Trip not found' })
          return
        }

        response.status(201).json(ActivitySchema.parse(activity))
      } catch (error) {
        next(error)
      }
    },
  )

  app.patch(
    '/api/trips/:tripId/activities/:activityId',
    (request, response, next) =>
      requireAuthenticatedUser(authService, request, response, next),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest
        const { tripId, activityId } = request.params

        if (typeof tripId !== 'string' || typeof activityId !== 'string') {
          response.status(400).json({ message: 'Trip and activity ids are required' })
          return
        }

        const parsedInput = UpdateActivityInputSchema.safeParse(request.body)

        if (!parsedInput.success) {
          response.status(400).json({
            message: 'Invalid activity data',
            issues: parsedInput.error.issues,
          })
          return
        }

        const [trip, currentActivity] = await Promise.all([
          tripRepository.getTrip(
            authenticatedRequest.user.id,
            authenticatedRequest.accessToken,
            tripId,
          ),
          tripRepository.getActivity(
            authenticatedRequest.user.id,
            authenticatedRequest.accessToken,
            tripId,
            activityId,
          ),
        ])

        if (!trip || !currentActivity) {
          response.status(404).json({ message: 'Activity not found' })
          return
        }

        const nextActivity = {
          tripDate: currentActivity.tripDate,
          title: currentActivity.title,
          startTime: currentActivity.startTime,
          endTime: currentActivity.endTime,
          allDay: currentActivity.allDay,
          notes: currentActivity.notes,
          ...parsedInput.data,
        }
        const parsedNextActivity = CreateActivityInputSchema.safeParse(nextActivity)

        if (!parsedNextActivity.success) {
          response.status(400).json({
            message: 'Invalid activity data',
            issues: parsedNextActivity.error.issues,
          })
          return
        }

        if (!isDateWithinTrip(trip, parsedNextActivity.data.tripDate)) {
          response.status(400).json({
            message: 'The activity date must be within the trip dates',
          })
          return
        }

        let activityInput: UpdateActivityInput = parsedInput.data

        if (parsedInput.data.googleMapsUrl) {
          try {
            const place = await googlePlacesResolver(parsedInput.data.googleMapsUrl)
            activityInput = {
              ...activityInput,
              title: place.name,
              placeName: place.name,
              placeAddress: place.address,
            }
          } catch (error) {
            if (error instanceof GooglePlacesError) {
              response.status(error.statusCode).json({ message: error.message })
              return
            }
            throw error
          }
        } else if (parsedInput.data.googleMapsUrl === null) {
          activityInput = {
            ...activityInput,
            placeName: null,
            placeAddress: null,
          }
        }

        const activity = await tripRepository.updateActivity(
          authenticatedRequest.user.id,
          authenticatedRequest.accessToken,
          tripId,
          activityId,
          activityInput,
        )

        if (!activity) {
          response.status(404).json({ message: 'Activity not found' })
          return
        }

        response.json(ActivitySchema.parse(activity))
      } catch (error) {
        next(error)
      }
    },
  )

  app.delete(
    '/api/trips/:tripId/activities/:activityId',
    (request, response, next) =>
      requireAuthenticatedUser(authService, request, response, next),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest
        const { tripId, activityId } = request.params

        if (typeof tripId !== 'string' || typeof activityId !== 'string') {
          response.status(400).json({ message: 'Trip and activity ids are required' })
          return
        }

        const activity = await tripRepository.getActivity(
          authenticatedRequest.user.id,
          authenticatedRequest.accessToken,
          tripId,
          activityId,
        )

        if (!activity) {
          response.status(404).json({ message: 'Activity not found' })
          return
        }

        const deleted = await tripRepository.deleteActivity(
          authenticatedRequest.user.id,
          authenticatedRequest.accessToken,
          tripId,
          activityId,
        )

        if (!deleted) {
          response.status(404).json({ message: 'Activity not found' })
          return
        }

        response.status(204).send()
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
