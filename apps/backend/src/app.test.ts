import assert from 'node:assert/strict'
import { test } from 'node:test'
import request from 'supertest'
import { isAllowedGoogleMapsUrl } from '@planleggreise/models'
import type {
  Activity,
  CreateActivityInput,
  CreateHousingStayInput,
  CreateMealInput,
  CreateTripInput,
  HousingStay,
  Meal,
  Trip,
  TripDetail,
  UpdateTripInput,
  UpdateActivityInput,
} from '@planleggreise/models'
import type { AuthService } from './auth.js'
import { createApp } from './app.js'
import {
  createGooglePlacesResolver,
  type GooglePlacesResolver,
} from './google-places.js'
import type { TripRepository } from './trip-repository.js'

const testTrip: Trip = {
  id: 'trip-1',
  name: 'Testreise',
  startDate: '2026-08-10',
  endDate: '2026-08-12',
  notes: null,
}

const testTripDetail: TripDetail = {
  ...testTrip,
  days: [
    { date: '2026-08-10', dayNumber: 1, notes: null, activities: [] },
    { date: '2026-08-11', dayNumber: 2, notes: null, activities: [] },
    { date: '2026-08-12', dayNumber: 3, notes: null, activities: [] },
  ],
  housingStays: [],
  meals: [],
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
  googleMapsUrl: null,
  placeName: null,
  placeAddress: null,
  sortOrder: 0,
}

function createTestApp(googlePlacesResolver?: GooglePlacesResolver) {
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
    updateDay: async (_userId, _accessToken, _tripId, tripDate, input) => ({
      date: tripDate,
      dayNumber: 1,
      notes: input.notes ?? null,
      activities: [],
    }),
    getHousingStay: async () => null,
    createHousingStay: async (
      _userId,
      _accessToken,
      tripId,
      input: CreateHousingStayInput,
    ): Promise<HousingStay> => ({
      id: 'housing-1',
      tripId,
      ...input,
    }),
    updateHousingStay: async () => null,
    deleteHousingStay: async () => true,
    getMeal: async () => null,
    createMeal: async (
      _userId,
      _accessToken,
      tripId,
      input: CreateMealInput,
    ): Promise<Meal> => ({
      id: 'meal-1',
      tripId,
      ...input,
      googleMapsUrl: input.googleMapsUrl ?? null,
      placeName: input.placeName ?? null,
      placeAddress: input.placeAddress ?? null,
      sortOrder: 0,
    }),
    updateMeal: async () => null,
    deleteMeal: async () => true,
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
    reorderActivities: async (
      _userId,
      _accessToken,
      _tripId,
      input,
    ) =>
      input.activities.map((activity) => ({
        ...testActivity,
        id: activity.activityId,
        tripDate: activity.tripDate,
        sortOrder: activity.sortOrder,
      })),
    reorderDayItems: async (
      _userId,
      _accessToken,
      _tripId,
      input,
    ) => ({
      activities: input.items
        .filter((item) => item.itemType === 'activity')
        .map((item) => ({
          ...testActivity,
          id: item.itemId,
          tripDate: item.tripDate,
          sortOrder: item.sortOrder,
        })),
      meals: input.items
        .filter((item) => item.itemType === 'meal')
        .map((item) => ({
          id: item.itemId,
          tripId: 'trip-1',
          tripDate: item.tripDate,
          title: 'Test meal',
          startTime: null,
          endTime: null,
          allDay: true,
          notes: null,
          googleMapsUrl: null,
          placeName: null,
          placeAddress: null,
          sortOrder: item.sortOrder,
        })),
    }),
    deleteActivity: async () => true,
  }

  return createApp({ authService, tripRepository, googlePlacesResolver })
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
    notes: null,
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

test('authenticated users can update a trip note', async () => {
  const response = await request(createTestApp())
    .patch('/api/trips/trip-1')
    .set('Authorization', 'Bearer valid-token')
    .send({ notes: 'Bestill tog på forhånd' })

  assert.equal(response.status, 200)
  assert.equal(response.body.notes, 'Bestill tog på forhånd')
})

test('authenticated users can update a day note', async () => {
  const response = await request(createTestApp())
    .patch('/api/trips/trip-1/days/2026-08-11')
    .set('Authorization', 'Bearer valid-token')
    .send({ notes: 'Start tidlig' })

  assert.equal(response.status, 200)
  assert.equal(response.body.date, '2026-08-11')
  assert.equal(response.body.notes, 'Start tidlig')
})

test('authenticated users can create a housing stay with a note', async () => {
  const response = await request(createTestApp())
    .post('/api/trips/trip-1/housing')
    .set('Authorization', 'Bearer valid-token')
    .send({
      name: 'Hotell',
      checkIn: '2026-08-10',
      checkOut: '2026-08-11',
      notes: 'Be om rom høyt oppe',
    })

  assert.equal(response.status, 201)
  assert.equal(response.body.notes, 'Be om rom høyt oppe')
})

test('authenticated users can create a meal with a note', async () => {
  const response = await request(createTestApp())
    .post('/api/trips/trip-1/meals')
    .set('Authorization', 'Bearer valid-token')
    .send({
      tripDate: '2026-08-11',
      title: 'Middag',
      startTime: '18:00',
      endTime: '20:00',
      allDay: false,
      notes: 'Bestill bord',
    })

  assert.equal(response.status, 201)
  assert.equal(response.body.notes, 'Bestill bord')
})

test('meal creation resolves a Google Maps link', async () => {
  const response = await request(
    createTestApp(async () => ({
      name: 'Mathallen',
      address: 'Vulkan 5, Oslo',
    })),
  )
    .post('/api/trips/trip-1/meals')
    .set('Authorization', 'Bearer valid-token')
    .send({
      tripDate: '2026-08-11',
      title: null,
      googleMapsUrl: 'https://maps.app.goo.gl/UqkAP8Bc5mx1tcVq6',
      startTime: null,
      endTime: null,
      allDay: true,
      notes: null,
    })

  assert.equal(response.status, 201)
  assert.equal(response.body.title, null)
  assert.equal(response.body.placeName, 'Mathallen')
  assert.equal(response.body.placeAddress, 'Vulkan 5, Oslo')
})

test('meal creation keeps a custom title when resolving a Google Maps link', async () => {
  const response = await request(
    createTestApp(async () => ({
      name: 'Mathallen',
      address: 'Vulkan 5, Oslo',
    })),
  )
    .post('/api/trips/trip-1/meals')
    .set('Authorization', 'Bearer valid-token')
    .send({
      tripDate: '2026-08-11',
      title: 'Dinner at Mathallen',
      googleMapsUrl: 'https://maps.app.goo.gl/UqkAP8Bc5mx1tcVq6',
      startTime: null,
      endTime: null,
      allDay: true,
      notes: null,
    })

  assert.equal(response.status, 201)
  assert.equal(response.body.title, 'Dinner at Mathallen')
  assert.equal(response.body.placeName, 'Mathallen')
})

test('full Google Maps place links are accepted', () => {
  const url =
    'https://www.google.com/maps/place/Oslo+Camping/@59.9144959,10.7426482,782m/data=!3m2!1e3!4b1!4m6!3m5!1s0x46416e625634a04b:0xdbce3291121aff6e!8m2!3d59.9144933!4d10.7475191!16s%2Fg%2F11c1q7nvxj?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D'

  assert.equal(isAllowedGoogleMapsUrl(url), true)
  assert.equal(isAllowedGoogleMapsUrl(`  ${url}\n`), true)
})

test('Google Places resolves a full place URL without redirect resolution', async () => {
  const url =
    'https://www.google.com/maps/place/Oslo+Camping/@59.9144959,10.7426482,782m/data=!3m2!1e3!4b1!4m6!3m5!1s0x46416e625634a04b:0xdbce3291121aff6e!8m2!3d59.9144933!4d10.7475191!16s%2Fg%2F11c1q7nvxj?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D'
  const originalFetch = globalThis.fetch
  const requests: string[] = []

  globalThis.fetch = async (input) => {
    requests.push(String(input))
    return new Response(
      JSON.stringify({
        places: [
          {
            displayName: { text: 'Oslo Camping' },
            formattedAddress: 'Ekebergveien 65, Oslo',
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    const place = await createGooglePlacesResolver('test-key')(url)

    assert.deepEqual(place, {
      name: 'Oslo Camping',
      address: 'Ekebergveien 65, Oslo',
    })
    assert.deepEqual(requests, [
      'https://places.googleapis.com/v1/places:searchText',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
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

test('activity creation resolves a Google Maps link', async () => {
  const response = await request(
    createTestApp(async () => ({
      name: 'Colosseum',
      address: 'Piazza del Colosseo, 1, Rome',
    })),
  )
    .post('/api/trips/trip-1/activities')
    .set('Authorization', 'Bearer valid-token')
    .send({
      tripDate: '2026-08-11',
      title: 'Colosseum entrance',
      googleMapsUrl: 'https://maps.app.goo.gl/UqkAP8Bc5mx1tcVq6',
      startTime: null,
      endTime: null,
      allDay: true,
      notes: null,
    })

  assert.equal(response.status, 201)
  assert.equal(response.body.title, 'Colosseum entrance')
  assert.equal(response.body.placeName, 'Colosseum')
  assert.equal(response.body.placeAddress, 'Piazza del Colosseo, 1, Rome')
})

test('activity updates resolve a Google Maps link', async () => {
  const response = await request(
    createTestApp(async () => ({
      name: 'Colosseum',
      address: 'Piazza del Colosseo, 1, Rome',
    })),
  )
    .patch('/api/trips/trip-1/activities/activity-1')
    .set('Authorization', 'Bearer valid-token')
    .send({
      googleMapsUrl: 'https://maps.app.goo.gl/UqkAP8Bc5mx1tcVq6',
    })

  assert.equal(response.status, 200)
  assert.equal(response.body.title, 'Besøke museet')
  assert.equal(response.body.placeName, 'Colosseum')
})

test('activity updates preserve a custom title when a Google Maps link is added', async () => {
  const response = await request(
    createTestApp(async () => ({
      name: 'Colosseum',
      address: 'Piazza del Colosseo, 1, Rome',
    })),
  )
    .patch('/api/trips/trip-1/activities/activity-1')
    .set('Authorization', 'Bearer valid-token')
    .send({
      title: 'Visit the Colosseum',
      googleMapsUrl: 'https://maps.app.goo.gl/UqkAP8Bc5mx1tcVq6',
    })

  assert.equal(response.status, 200)
  assert.equal(response.body.title, 'Visit the Colosseum')
  assert.equal(response.body.placeName, 'Colosseum')
})

test('activity creation requires a title or Google Maps link', async () => {
  const response = await request(createTestApp())
    .post('/api/trips/trip-1/activities')
    .set('Authorization', 'Bearer valid-token')
    .send({
      tripDate: '2026-08-11',
      title: null,
      googleMapsUrl: null,
      startTime: null,
      endTime: null,
      allDay: true,
      notes: null,
    })

  assert.equal(response.status, 400)
})

test('activity updates cannot clear the only title without a Google Maps link', async () => {
  const response = await request(createTestApp())
    .patch('/api/trips/trip-1/activities/activity-1')
    .set('Authorization', 'Bearer valid-token')
    .send({
      title: null,
      googleMapsUrl: null,
    })

  assert.equal(response.status, 400)
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
      notes: 'Husk billetter',
    })

  assert.equal(response.status, 200)
  assert.equal(response.body.title, 'Oppdatert aktivitet')
  assert.equal(response.body.notes, 'Husk billetter')
})

test('authenticated users can reorder activities in one request', async () => {
  const response = await request(createTestApp())
    .patch('/api/trips/trip-1/activities/reorder')
    .set('Authorization', 'Bearer valid-token')
    .send({
      activities: [
        {
          activityId: 'activity-1',
          tripDate: '2026-08-12',
          sortOrder: 0,
        },
      ],
    })

  assert.equal(response.status, 200)
  assert.equal(response.body[0].id, 'activity-1')
  assert.equal(response.body[0].tripDate, '2026-08-12')
  assert.equal(response.body[0].sortOrder, 0)
})

test('authenticated users can reorder activities and meals together', async () => {
  const response = await request(createTestApp())
    .patch('/api/trips/trip-1/day-items/reorder')
    .set('Authorization', 'Bearer valid-token')
    .send({
      items: [
        {
          itemType: 'activity',
          itemId: 'activity-1',
          tripDate: '2026-08-12',
          sortOrder: 1,
        },
        {
          itemType: 'meal',
          itemId: 'meal-1',
          tripDate: '2026-08-12',
          sortOrder: 0,
        },
      ],
    })

  assert.equal(response.status, 200)
  assert.equal(response.body.activities[0].id, 'activity-1')
  assert.equal(response.body.activities[0].tripDate, '2026-08-12')
  assert.equal(response.body.meals[0].id, 'meal-1')
  assert.equal(response.body.meals[0].sortOrder, 0)
})

test('day item reorder rejects duplicate item keys', async () => {
  const response = await request(createTestApp())
    .patch('/api/trips/trip-1/day-items/reorder')
    .set('Authorization', 'Bearer valid-token')
    .send({
      items: [
        {
          itemType: 'meal',
          itemId: 'meal-1',
          tripDate: '2026-08-11',
          sortOrder: 0,
        },
        {
          itemType: 'meal',
          itemId: 'meal-1',
          tripDate: '2026-08-11',
          sortOrder: 1,
        },
      ],
    })

  assert.equal(response.status, 400)
  assert.match(response.body.message, /unique/i)
})

test('day item reorder rejects dates outside the trip', async () => {
  const response = await request(createTestApp())
    .patch('/api/trips/trip-1/day-items/reorder')
    .set('Authorization', 'Bearer valid-token')
    .send({
      items: [
        {
          itemType: 'meal',
          itemId: 'meal-1',
          tripDate: '2026-08-13',
          sortOrder: 0,
        },
      ],
    })

  assert.equal(response.status, 400)
  assert.match(response.body.message, /within the trip/i)
})

test('authenticated users can delete an activity', async () => {
  const response = await request(createTestApp())
    .delete('/api/trips/trip-1/activities/activity-1')
    .set('Authorization', 'Bearer valid-token')

  assert.equal(response.status, 204)
})
