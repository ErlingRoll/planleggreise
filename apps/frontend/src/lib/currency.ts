const currencyByRegion: Record<string, string> = {
  AU: "AUD",
  CA: "CAD",
  CH: "CHF",
  CN: "CNY",
  DK: "DKK",
  GB: "GBP",
  IN: "INR",
  JP: "JPY",
  NZ: "NZD",
  NO: "NOK",
  SE: "SEK",
  US: "USD",
}

export function getDefaultCurrency() {
  const locale = typeof navigator === "undefined" ? "nb-NO" : navigator.language
  const region = locale.split("-")[1]?.toUpperCase()
  return (region && currencyByRegion[region]) || "EUR"
}
