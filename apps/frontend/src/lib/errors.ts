const errorTranslations: Record<string, string> = {
  'Authentication required': 'Innlogging kreves.',
  'Invalid authentication token': 'Innloggingen er ikke gyldig.',
  'Invalid trip data': 'Ugyldige reisedata.',
  'The trip end date must be on or after the start date':
    'Sluttdatoen må være på eller etter startdatoen.',
  'Trips cannot be longer than 60 days':
    'En reise kan ikke vare lenger enn 60 dager.',
  'Trip not found': 'Fant ikke reisen.',
  'Invalid activity data': 'Ugyldige aktivitetsdata.',
  'The activity date must be within the trip dates':
    'Aktivitetsdatoen må være innenfor reisedatoene.',
  'Activity not found': 'Fant ikke aktiviteten.',
  'Route not found': 'Fant ikke siden.',
  'Internal server error': 'Noe gikk galt på serveren.',
}

export function getErrorMessage(reason: unknown) {
  if (!(reason instanceof Error)) {
    return 'Noe gikk galt'
  }

  return errorTranslations[reason.message] ?? 'Noe gikk galt'
}
