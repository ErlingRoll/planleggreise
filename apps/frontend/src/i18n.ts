import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

export type SupportedLanguage = 'nb' | 'en'

const languageStorageKey = 'planleggreise-language'

const resources = {
  nb: {
    translation: {
      common: {
        cancel: 'Avbryt',
        close: 'Lukk',
        delete: 'Slett',
        deleting: 'Sletter ...',
        from: 'Fra',
        loading: 'Laster ...',
        nextMonth: 'Neste måned',
        previousMonth: 'Forrige måned',
        save: 'Lagre',
        saving: 'Lagrer ...',
        to: 'Til',
      },
      auth: {
        continueWithGoogle: 'Fortsett med Google',
        description: 'Logg inn for å samle reisene dine på ett rolig sted.',
        heading: 'Planlegg litt. Opplev mer.',
        openingGoogle: 'Åpner Google ...',
        rememberMe: 'Husk meg på denne enheten',
        tagline: 'Din reise begynner her',
      },
      dashboard: {
        backToTrips: 'Tilbake til reiseoversikten',
        closeNewTrip: 'Lukk',
        heading: 'Hva skal vi planlegge?',
        intro: 'Start med datoene. Fyll resten inn når du vet mer.',
        logOut: 'Logg ut',
        myTrips: 'Mine reiser',
        newTrip: '+ Ny reise',
        noTrips: 'Du har ingen reiser ennå.',
        plan: 'Planen din',
        search: 'Søk',
        searchTrips: 'Søk i reiser',
        tripOverview: 'Reiseoversikt',
      },
      datePicker: {
        chooseDate: 'Velg dato',
        select: 'Velg {{label}}',
        weekdays: ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'],
      },
      errors: {
        activityNotFound: 'Fant ikke aktiviteten.',
        activityOutsideTrip: 'Aktivitetsdatoen må være innenfor reisedatoene.',
        authenticationRequired: 'Innlogging kreves.',
        generic: 'Noe gikk galt.',
        internalServer: 'Noe gikk galt på serveren.',
        invalidActivityData: 'Ugyldige aktivitetsdata.',
        invalidAuthentication: 'Innloggingen er ikke gyldig.',
        invalidTripData: 'Ugyldige reisedata.',
        routeNotFound: 'Fant ikke siden.',
        tripNotFound: 'Fant ikke reisen.',
        tripTooLong: 'En reise kan ikke vare lenger enn {{maxDays}} dager.',
        tripDatesInvalid: 'Sluttdatoen må være på eller etter startdatoen.',
      },
      tripDetails: {
        activity: 'aktivitet',
        activities: 'aktiviteter',
        activitiesCount_one: '{{count}} aktivitet',
        activitiesCount_other: '{{count}} aktiviteter',
        add: '+ Legg til',
        allDay: 'Hele dagen',
        closeSettings: 'Lukk reiseinnstillinger',
        daysToFill_one: '{{count}} dag å fylle',
        daysToFill_other: '{{count}} dager å fylle',
        noPlans: 'Ingen planer ennå',
        saveActivity: 'Lagre aktivitet',
        savingActivity: 'Lagrer ...',
        selectTrip: 'Velg en reise for å se dagene.',
        settings: 'Åpne reiseinnstillinger',
        timeNotSet: 'Tidspunkt ikke satt',
        whatToDo: 'Hva skal dere gjøre?',
        activityPlaceholder: 'For eksempel Besøke Colosseum',
      },
      tripForm: {
        cancel: 'Avbryt',
        create: 'Opprett reise',
        creating: 'Lagrer ...',
        endDate: 'Til',
        name: 'Navn på reisen',
        namePlaceholder: 'For eksempel Sommer i Italia',
        startDate: 'Fra',
        title: 'Lag en ny reise',
        datesRequired: 'Velg både startdato og sluttdato.',
      },
      tripSettings: {
        cancel: 'Avbryt',
        close: 'Lukk reiseinnstillinger',
        delete: 'Slett reisen',
        deleting: 'Sletter ...',
        description: 'Endre grunnleggende informasjon om reisen.',
        endDate: 'Til',
        name: 'Navn på reisen',
        save: 'Lagre endringer',
        saving: 'Lagrer ...',
        startDate: 'Fra',
        title: 'Reiseinnstillinger',
        datesRequired: 'Velg både startdato og sluttdato.',
        deleteConfirmation:
          'Er du sikker på at du vil slette «{{name}}»?\n\nReisen skjules, men dataene beholdes og kan gjenopprettes av administrator.',
      },
      language: {
        label: 'Språk',
        nb: 'Norsk',
        en: 'English',
      },
    },
  },
  en: {
    translation: {
      common: {
        cancel: 'Cancel',
        close: 'Close',
        delete: 'Delete',
        deleting: 'Deleting ...',
        from: 'From',
        loading: 'Loading ...',
        nextMonth: 'Next month',
        previousMonth: 'Previous month',
        save: 'Save',
        saving: 'Saving ...',
        to: 'To',
      },
      auth: {
        continueWithGoogle: 'Continue with Google',
        description: 'Log in to keep all your trips in one calm place.',
        heading: 'Plan a little. Experience more.',
        openingGoogle: 'Opening Google ...',
        rememberMe: 'Remember me on this device',
        tagline: 'Your journey starts here',
      },
      dashboard: {
        backToTrips: 'Back to trip overview',
        closeNewTrip: 'Close',
        heading: 'What shall we plan?',
        intro: 'Start with the dates. Fill in the rest when you know more.',
        logOut: 'Log out',
        myTrips: 'My trips',
        newTrip: '+ New trip',
        noTrips: 'You do not have any trips yet.',
        plan: 'Your plan',
        search: 'Search',
        searchTrips: 'Search trips',
        tripOverview: 'Trip overview',
      },
      datePicker: {
        chooseDate: 'Choose date',
        select: 'Choose {{label}}',
        weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      },
      errors: {
        activityNotFound: 'Activity not found.',
        activityOutsideTrip: 'The activity date must be within the trip dates.',
        authenticationRequired: 'Authentication is required.',
        generic: 'Something went wrong.',
        internalServer: 'Something went wrong on the server.',
        invalidActivityData: 'Invalid activity data.',
        invalidAuthentication: 'The authentication is not valid.',
        invalidTripData: 'Invalid trip data.',
        routeNotFound: 'Page not found.',
        tripNotFound: 'Trip not found.',
        tripTooLong: 'A trip cannot be longer than {{maxDays}} days.',
        tripDatesInvalid: 'The end date must be on or after the start date.',
      },
      tripDetails: {
        activity: 'activity',
        activities: 'activities',
        activitiesCount_one: '{{count}} activity',
        activitiesCount_other: '{{count}} activities',
        add: '+ Add',
        allDay: 'All day',
        closeSettings: 'Close trip settings',
        daysToFill_one: '{{count}} day to fill',
        daysToFill_other: '{{count}} days to fill',
        noPlans: 'No plans yet',
        saveActivity: 'Save activity',
        savingActivity: 'Saving ...',
        selectTrip: 'Select a trip to see its days.',
        settings: 'Open trip settings',
        timeNotSet: 'Time not set',
        whatToDo: 'What are you going to do?',
        activityPlaceholder: 'For example Visit the Colosseum',
      },
      tripForm: {
        cancel: 'Cancel',
        create: 'Create trip',
        creating: 'Saving ...',
        endDate: 'To',
        name: 'Trip name',
        namePlaceholder: 'For example Summer in Italy',
        startDate: 'From',
        title: 'Create a new trip',
        datesRequired: 'Choose both a start date and an end date.',
      },
      tripSettings: {
        cancel: 'Cancel',
        close: 'Close trip settings',
        delete: 'Delete trip',
        deleting: 'Deleting ...',
        description: 'Change the basic information for this trip.',
        endDate: 'To',
        name: 'Trip name',
        save: 'Save changes',
        saving: 'Saving ...',
        startDate: 'From',
        title: 'Trip settings',
        datesRequired: 'Choose both a start date and an end date.',
        deleteConfirmation:
          'Are you sure you want to delete “{{name}}”?\n\nThe trip will be hidden, but its data will be kept and can be restored by an administrator.',
      },
      language: {
        label: 'Language',
        nb: 'Norsk',
        en: 'English',
      },
    },
  },
} as const

export function getDateLocale(language: string) {
  return language === 'en' ? 'en-GB' : 'nb-NO'
}

export function getWeekdayLabels(language: SupportedLanguage) {
  return resources[language].translation.datePicker.weekdays
}

function getInitialLanguage(): SupportedLanguage {
  const storedLanguage = window.localStorage.getItem(languageStorageKey)
  return storedLanguage === 'en' ? 'en' : 'nb'
}

function updateDocumentLanguage(language: string) {
  document.documentElement.lang = language === 'en' ? 'en' : 'nb-NO'
}

const initialLanguage = getInitialLanguage()

void i18n.use(initReactI18next).init({
  lng: initialLanguage,
  fallbackLng: 'nb',
  interpolation: {
    escapeValue: false,
  },
  resources,
})

updateDocumentLanguage(initialLanguage)
i18n.on('languageChanged', (language) => {
  const supportedLanguage: SupportedLanguage = language === 'en' ? 'en' : 'nb'
  window.localStorage.setItem(languageStorageKey, supportedLanguage)
  updateDocumentLanguage(supportedLanguage)
})

export default i18n
