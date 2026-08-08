import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  LngLatBounds,
  Map as MapLibreMapConstructor,
  Marker,
  NavigationControl,
  Popup,
  type Map as MapLibreMap,
  type Marker as MapLibreMarker,
  type StyleSpecification,
} from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { formatDate } from "../../lib/date-format"

export type TripMapMarker = {
  id: string
  type: "activity" | "meal" | "housing"
  title: string
  date: string
  latitude: number
  longitude: number
}

type TripMapProps = {
  markers: TripMapMarker[]
}

function fitMapToMarkers(map: MapLibreMap, markers: TripMapMarker[]) {
  if (markers.length === 0) {
    return
  }

  if (markers.length === 1) {
    map.flyTo({
      center: [markers[0].longitude, markers[0].latitude],
      zoom: 13,
      essential: true,
    })
    return
  }

  const bounds = new LngLatBounds()
  markers.forEach((marker) => bounds.extend([marker.longitude, marker.latitude]))
  map.fitBounds(bounds, { padding: 56, maxZoom: 13, duration: 500 })
}

function getMarkerLabel(title: string) {
  const maxLength = 20
  return title.length > maxLength ? `${title.slice(0, maxLength - 1).trimEnd()}…` : title
}

const defaultMapStyle: StyleSpecification = {
  version: 8,
  sources: {
    openStreetMap: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "openStreetMap",
      type: "raster",
      source: "openStreetMap",
    },
  ],
}

export function TripMap({ markers }: TripMapProps) {
  const { t } = useTranslation()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
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

    markers.forEach((marker) => {
      const element = document.createElement("button")
      element.className = `trip-map-marker trip-map-marker-${marker.type}`
      element.setAttribute("aria-label", `${marker.title}, ${formatDate(marker.date)}`)
      element.title = marker.title
      element.type = "button"

      const label = document.createElement("span")
      label.className = "trip-map-marker-label"
      label.textContent = getMarkerLabel(marker.title)
      const pointer = document.createElement("span")
      pointer.className = "trip-map-marker-pointer"
      element.append(label, pointer)

      const popup = new Popup({ offset: 18 }).setText(`${marker.title}\n${formatDate(marker.date)}`)

      const mapMarker = new Marker({ anchor: "bottom", element })
        .setLngLat([marker.longitude, marker.latitude])
        .setPopup(popup)
        .addTo(map)

      markerRefs.current.push(mapMarker)
    })

    fitMapToMarkers(map, markers)
  }, [markers])

  useEffect(() => {
    if (!isMobileOpen || !mapRef.current) {
      return
    }

    const frame = requestAnimationFrame(() => {
      const map = mapRef.current

      if (!map) {
        return
      }

      map.resize()
      fitMapToMarkers(map, markers)
    })

    return () => cancelAnimationFrame(frame)
  }, [isMobileOpen, markers])

  return (
    <>
      <button
        aria-expanded={isMobileOpen}
        className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-on-brand shadow-card lg:hidden"
        onClick={() => setIsMobileOpen(true)}
        type="button"
      >
        {t("tripMap.open")}
      </button>
      <section
        className={`${
          isMobileOpen
            ? "fixed inset-0 z-50 flex h-dvh flex-col rounded-none"
            : "hidden rounded-2xl lg:flex"
        } border border-border-card bg-surface p-3 lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:min-h-96 lg:flex-col`}
      >
        <div className="hidden shrink-0 items-center justify-between gap-3 px-1 lg:flex">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-brand">{t("tripMap.title")}</h2>
            <span className="text-xs text-muted">
              {t("tripMap.locations", { count: markers.length })}
            </span>
          </div>
        </div>
        <div className="relative mt-0 min-h-0 flex-1 overflow-hidden rounded-xl lg:mt-3">
          <div className="h-full min-h-72 w-full" ref={containerRef} />
          {markers.length === 0 && (
            <div className="absolute inset-0 grid place-items-center bg-surface-muted/80 p-6 text-center text-sm text-muted">
              {t("tripMap.noLocations")}
            </div>
          )}
        </div>
        <div className="mt-3 flex shrink-0 items-center justify-between gap-3 px-1 lg:hidden">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-brand">{t("tripMap.title")}</h2>
            <span className="text-xs text-muted">
              {t("tripMap.locations", { count: markers.length })}
            </span>
          </div>
          <button
            aria-label={t("tripMap.close")}
            className="grid size-9 place-items-center rounded-lg text-xl text-on-surface hover:bg-surface-muted"
            onClick={() => setIsMobileOpen(false)}
            type="button"
          >
            ×
          </button>
        </div>
      </section>
    </>
  )
}
