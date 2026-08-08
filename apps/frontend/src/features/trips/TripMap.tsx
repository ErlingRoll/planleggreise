import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import {
  LngLatBounds,
  Map as MapLibreMapConstructor,
  Marker,
  NavigationControl,
  Popup,
  type Map as MapLibreMap,
  type Marker as MapLibreMarker,
} from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { formatDate } from "../../lib/date-format"

export type TripMapMarker = {
  id: string
  type: "activity" | "meal"
  title: string
  date: string
  latitude: number
  longitude: number
}

type TripMapProps = {
  markers: TripMapMarker[]
}

const defaultMapStyle = "https://tiles.openfreemap.org/styles/liberty"

export function TripMap({ markers }: TripMapProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRefs = useRef<MapLibreMarker[]>([])

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const map = new MapLibreMapConstructor({
      container: containerRef.current,
      style: import.meta.env.VITE_MAP_STYLE_URL?.trim() || defaultMapStyle,
      center: [10.7522, 59.9139],
      zoom: 2,
    })
    map.addControl(new NavigationControl(), "top-right")
    mapRef.current = map

    return () => {
      markerRefs.current.forEach((marker) => marker.remove())
      markerRefs.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current

    if (!map) {
      return
    }

    markerRefs.current.forEach((marker) => marker.remove())
    markerRefs.current = []

    if (markers.length === 0) {
      return
    }

    const bounds = new LngLatBounds()

    markers.forEach((marker) => {
      const element = document.createElement("button")
      element.className = `trip-map-marker trip-map-marker-${marker.type}`
      element.setAttribute("aria-label", `${marker.title}, ${formatDate(marker.date)}`)
      element.type = "button"

      const popup = new Popup({ offset: 18 }).setText(`${marker.title}\n${formatDate(marker.date)}`)

      const mapMarker = new Marker({ element })
        .setLngLat([marker.longitude, marker.latitude])
        .setPopup(popup)
        .addTo(map)

      markerRefs.current.push(mapMarker)
      bounds.extend([marker.longitude, marker.latitude])
    })

    if (markers.length === 1) {
      map.flyTo({
        center: [markers[0].longitude, markers[0].latitude],
        zoom: 13,
        essential: true,
      })
    } else {
      map.fitBounds(bounds, { padding: 56, maxZoom: 13, duration: 500 })
    }
  }, [markers])

  return (
    <section className="rounded-2xl border border-border-card bg-surface p-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="font-semibold text-brand">{t("tripMap.title")}</h2>
        <span className="text-xs text-muted">
          {t("tripMap.locations", { count: markers.length })}
        </span>
      </div>
      <div className="relative mt-3 overflow-hidden rounded-xl">
        <div className="h-[60vh] min-h-72 w-full lg:h-96" ref={containerRef} />
        {markers.length === 0 && (
          <div className="absolute inset-0 grid place-items-center bg-surface-muted/80 p-6 text-center text-sm text-muted">
            {t("tripMap.noLocations")}
          </div>
        )}
      </div>
    </section>
  )
}
