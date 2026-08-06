import assert from 'node:assert/strict'
import { test } from 'node:test'
import request from 'supertest'
import type {
  Activity,
  CreateActivityInput,
  CreateTripInput,
  Trip,
  TripDetail,
  UpdateTripInput,
  UpdateActivityInput,
} from '@planleggreise/models'
import type { AuthService } from './auth.js'
import { createApp } from './app.js'
import type { TripRepository } from './trip-repository.js'

const testTrip: Trip = {
  id: 'trip-1',
  name: 'Testreise',
  startDate: '2026-08-10',
  endDate: '2026-08-12',
}

const testTripDetail: TripDetail = {
  ...testTrip,
  days: [
    { date: '2026-08-10', dayNumber: 1, activities: [] },
    { date: '2026-08-11', dayNumber: 2, activities: [] },
    { date: '2026-08-12', dayNumber: 3, activities: [] },
  ],
}

const testActivity: Activity = {
  id: 'activity-1',
  tripId: 'trip-1',
  tripDate: '2026-08-11',
  title: 'Besøke museet',
  startTime: '10:00',
  endTime: '12:00',
  allDay: false,
  notes: null,
  sortOrder: 0,
}

function createTestApp() {
  const authService: AuthService = {
    authenticate: async (accessToken) =>
      accessToken === 'valid-token'
        ? { id: 'user-1', email: 'user@example.com' }
        : null,
  }
  const tripRepository: TripRepository = {
    listTrips: async () => [testTrip],
    getTrip: async () => testTripDetail,
    createTrip: async (_userId, _accessToken, input: CreateTripInput) => ({
      id: 'trip-2',
      ...input,
    }),
    updateTrip: async (
      _userId,
      _accessToken,
      _tripId,
      input: UpdateTripInput,
    ) => ({
      ...testTripDetail,
      ...input,
    }),
    deleteTrip: async () => true,
    getActivity: async () => testActivity,
    createActivity: async (
      _userId,
      _accessToken,
      tripId,
      input: CreateActivityInput,
    ) => ({
      id: 'activity-2',
      tripId,
      ...input,
      sortOrder: 0,
    }),
    updateActivity: async (
      _userId,
      _accessToken,
      _tripId,
      _activityId,
      input: UpdateActivityInput,
    ) => ({
      ...testActivity,
      ...input,
    }),
    deleteActivity: async () => true,
  }

  return createApp({ authService, tripRepository })
}

test('health endpoint is public', async () => {
  const response = await request(createTestApp()).get('/api/health')

  assert.equal(response.status, 200)
  assert.equal(response.body.status, 'ok')
})

test('trip list requires authentication', async () => {
  const response = await request(createTestApp()).get('/api/trips')

  assert.equal(response.status, 401)
  assert.equal(response.body.message, 'Authentication required')
})

test('authenticated users can list trips', async () => {
  const response = await request(createTestApp())
    .get('/api/trips')
    .set('Authorization', 'Bearer valid-token')

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, [testTrip])
})

test('trip creation rejects an inverted date range', async () => {
  const response = await request(createTestApp())
    .post('/api/trips')
    .set('Authorization', 'Bearer valid-token')
    .send({
      name: 'Ugyldig reise',
      startDate: '2026-08-12',
      endDate: '2026-08-10',
    })

  assert.equal(response.status, 400)
  assert.match(response.body.message, /end date/i)
})

test('authenticated users can create trips', async () => {
  const response = await request(createTestApp())
    .post('/api/trips')
    .set('Authorization', 'Bearer valid-token')
    .send({
      name: 'Ny testreise',
      startDate: '2026-09-01',
      endDate: '2026-09-03',
    })

  assert.equal(response.status, 201)
  assert.deepEqual(response.body, {
    id: 'trip-2',
    name: 'Ny testreise',
    startDate: '2026-09-01',
    endDate: '2026-09-03',
  })
})

test('trip creation rejects trips longer than 60 days', async () => {
  const response = await request(createTestApp())
    .post('/api/trips')
    .set('Authorization', 'Bearer valid-token')
    .send({
      name: 'For lang testreise',
      startDate: '2026-01-01',
      endDate: '2026-03-02',
    })

  assert.equal(response.status, 400)
  assert.match(response.body.message, /60 days/i)
})

test('trip creation allows a 60-day trip', async () => {
  const response = await request(createTestApp())
    .post('/api/trips')
    .set('Authorization', 'Bearer valid-token')
    .send({
      name: 'Seksti dagers testreise',
      startDate: '2026-01-01',
      endDate: '2026-03-01',
    })

  assert.equal(response.status, 201)
})

test('authenticated users can archive a trip', async () => {
  const response = await request(createTestApp())
    .delete('/api/trips/trip-1')
    .set('Authorization', 'Bearer valid-token')

  assert.equal(response.status, 204)
})

test('authenticated users can update trip settings', async () => {
  const response = await request(createTestApp())
    .patch('/api/trips/trip-1')
    .set('Authorization', 'Bearer valid-token')
    .send({
      name: 'Oppdatert testreise',
      startDate: '2026-08-09',
      endDate: '2026-08-13',
    })

  assert.equal(response.status, 200)
  assert.equal(response.body.name, 'Oppdatert testreise')
  assert.equal(response.body.startDate, '2026-08-09')
})

test('trip updates reject trips longer than 60 days', async () => {
  const response = await request(createTestApp())
    .patch('/api/trips/trip-1')
    .set('Authorization', 'Bearer valid-token')
    .send({
      startDate: '2026-01-01',
      endDate: '2026-03-02',
    })

  assert.equal(response.status, 400)
  assert.match(response.body.message, /60 days/i)
})

test('trip details include every date in the inclusive range', async () => {
  const response = await request(createTestApp())
    .get('/api/trips/trip-1')
    .set('Authorization', 'Bearer valid-token')

  assert.equal(response.status, 200)
  assert.equal(response.body.days.length, 3)
  assert.equal(response.body.days[0].date, '2026-08-10')
  assert.equal(response.body.days[2].date, '2026-08-12')
})

test('authenticated users can create an activity within a trip', async () => {
  const response = await request(createTestApp())
    .post('/api/trips/trip-1/activities')
    .set('Authorization', 'Bearer valid-token')
    .send({
      tripDate: '2026-08-11',
      title: 'Ny aktivitet',
      startTime: '14:00',
      endTime: '15:30',
      allDay: false,
      notes: null,
    })

  assert.equal(response.status, 201)
  assert.equal(response.body.title, 'Ny aktivitet')
  assert.equal(response.body.tripDate, '2026-08-11')
})

test('activity creation rejects dates outside the trip', async () => {
  const response = await request(createTestApp())
    .post('/api/trips/trip-1/activities')
    .set('Authorization', 'Bearer valid-token')
    .send({
      tripDate: '2026-08-13',
      title: 'Ugyldig aktivitet',
      startTime: null,
      endTime: null,
      allDay: true,
      notes: null,
    })

  assert.equal(response.status, 400)
  assert.match(response.body.message, /within the trip/i)
})

test('authenticated users can update an activity', async () => {
  const response = await request(createTestApp())
    .patch('/api/trips/trip-1/activities/activity-1')
    .set('Authorization', 'Bearer valid-token')
    .send({
      title: 'Oppdatert aktivitet',
    })

  assert.equal(response.status, 200)
  assert.equal(response.body.title, 'Oppdatert aktivitet')
})

test('authenticated users can delete an activity', async () => {
  const response = await request(createTestApp())
    .delete('/api/trips/trip-1/activities/activity-1')
    .set('Authorization', 'Bearer valid-token')

  assert.equal(response.status, 204)
})
