import assert from 'node:assert/strict'
import { test } from 'node:test'
import request from 'supertest'
import type { CreateTripInput, Trip, TripDetail } from '@planleggreise/models'
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
    { date: '2026-08-10', dayNumber: 1 },
    { date: '2026-08-11', dayNumber: 2 },
    { date: '2026-08-12', dayNumber: 3 },
  ],
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

test('trip details include every date in the inclusive range', async () => {
  const response = await request(createTestApp())
    .get('/api/trips/trip-1')
    .set('Authorization', 'Bearer valid-token')

  assert.equal(response.status, 200)
  assert.equal(response.body.days.length, 3)
  assert.equal(response.body.days[0].date, '2026-08-10')
  assert.equal(response.body.days[2].date, '2026-08-12')
})
