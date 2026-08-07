const allowedGoogleHosts = new Set(["goo.gl", "maps.app.goo.gl", "maps.google.com"])

const googleMapsHosts = new Set(["consent.google.com", "google.com", "www.google.com"])

export function isAllowedGoogleMapsUrl(value: string) {
  try {
    const url = new URL(value.trim())
    return (
      url.protocol === "https:" &&
      (allowedGoogleHosts.has(url.hostname) ||
        (googleMapsHosts.has(url.hostname) &&
          (url.pathname === "/maps" || url.pathname.startsWith("/maps/"))))
    )
  } catch {
    return false
  }
}
