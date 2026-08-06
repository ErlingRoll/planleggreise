import { z } from 'zod'

const allowedGoogleHosts = new Set([
  'goo.gl',
  'google.com',
  'consent.google.com',
  'maps.app.goo.gl',
  'maps.google.com',
  'www.google.com',
])

const placeDetailsSchema = z.object({
  displayName: z.object({ text: z.string().min(1) }),
  formattedAddress: z.string().min(1),
})

const placeSearchSchema = z.object({
  places: z.array(placeDetailsSchema).min(1),
})

export type ResolvedGooglePlace = {
  name: string
  address: string
}

export type GooglePlacesResolver = (
  googleMapsUrl: string,
) => Promise<ResolvedGooglePlace>

export class GooglePlacesError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 503 = 400,
  ) {
    super(message)
    this.name = 'GooglePlacesError'
  }
}

function parseAllowedGoogleUrl(value: string) {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw new GooglePlacesError('Google Maps link is invalid')
  }

  if (url.protocol !== 'https:' || !allowedGoogleHosts.has(url.hostname)) {
    throw new GooglePlacesError('Google Maps link is invalid')
  }

  return url
}

async function resolveRedirectUrl(inputUrl: URL): Promise<URL> {
  let currentUrl = inputUrl

  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      headers: { 'User-Agent': 'planleggreise/1.0' },
      redirect: 'manual',
    })

    if (response.status < 300 || response.status >= 400) {
      if (!response.ok) {
        throw new GooglePlacesError('Could not resolve Google Maps link')
      }
      return currentUrl
    }

    const location = response.headers.get('location')

    if (!location) {
      throw new GooglePlacesError('Could not resolve Google Maps link')
    }

    currentUrl = parseAllowedGoogleUrl(new URL(location, currentUrl).toString())
  }

  throw new GooglePlacesError('Could not resolve Google Maps link')
}

function getPlaceQuery(url: URL): string | null {
  const queryParameter = url.searchParams.get('query') ?? url.searchParams.get('q')

  if (queryParameter) {
    return queryParameter
  }

  const pathParts = url.pathname.split('/').filter(Boolean)
  const placeIndex = pathParts.findIndex(
    (part) => part === 'place' || part === 'search',
  )
  const placePart = placeIndex >= 0 ? pathParts[placeIndex + 1] : null

  if (!placePart || placePart.startsWith('@')) {
    return null
  }

  return decodeURIComponent(placePart.replace(/\+/g, ' '))
}

async function requestGooglePlaces(
  apiKey: string,
  url: string,
): Promise<ResolvedGooglePlace> {
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress',
    },
    body: JSON.stringify({
      languageCode: 'nb',
      textQuery: url,
    }),
  })

  if (!response.ok) {
    throw new GooglePlacesError('Could not resolve Google Maps link')
  }

  const result = placeSearchSchema.safeParse(await response.json())

  if (!result.success) {
    throw new GooglePlacesError('No place found for Google Maps link')
  }

  return {
    name: result.data.places[0].displayName.text,
    address: result.data.places[0].formattedAddress,
  }
}

export function createGooglePlacesResolver(
  apiKey = process.env.GOOGLE_PLACES_API_KEY,
): GooglePlacesResolver {
  return async (googleMapsUrl) => {
    if (!apiKey) {
      throw new GooglePlacesError('Google Places is not configured', 503)
    }

    const inputUrl = parseAllowedGoogleUrl(googleMapsUrl)
    const resolvedUrl = await resolveRedirectUrl(inputUrl)
    const placeQuery = getPlaceQuery(resolvedUrl)

    if (!placeQuery) {
      throw new GooglePlacesError('Could not resolve Google Maps link')
    }

    return requestGooglePlaces(apiKey, placeQuery)
  }
}
