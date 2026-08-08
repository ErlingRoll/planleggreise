import { useEffect, useRef, useState, type ReactNode } from "react"
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
  renderMarkerDetails?: (marker: TripMapMarker) => ReactNode
  onMarkerClick?: (marker: TripMapMarker) => void
  focusMarker?: TripMapMarker | null
  onFocusMarkerHandled?: () => void
}

const markerDetailsAnimationDuration = 180
const markerOverlapDistance = 28

function setMarkerVisualOffset(marker: MapLibreMarker, offset: [number, number]) {
  marker.setOffset(offset)
  const connector = marker.getElement().querySelector<HTMLElement>(".trip-map-marker-connector")

  if (!connector) {
    return
  }

  const distance = Math.hypot(offset[0], offset[1])
  connector.style.width = `${distance}px`
  connector.style.transform = `rotate(${Math.atan2(-offset[1], -offset[0])}rad)`
  connector.hidden = distance === 0
}

function applyMarkerLayout(map: MapLibreMap, markers: Map<string, MapLibreMarker>) {
  const entries = Array.from(markers.values()).map((marker) => ({
    marker,
    point: map.project(marker.getLngLat()),
  }))
  const groups: (typeof entries)[] = []
  const remaining = [...entries]

  while (remaining.length > 0) {
    const group = [remaining.shift()!]
    let groupChanged = true

    while (groupChanged) {
      groupChanged = false
      for (let index = remaining.length - 1; index >= 0; index -= 1) {
        const candidate = remaining[index]
        const isOverlapping = group.some(
          (entry) =>
            Math.hypot(entry.point.x - candidate.point.x, entry.point.y - candidate.point.y) <=
            markerOverlapDistance,
        )

        if (isOverlapping) {
          group.push(candidate)
          remaining.splice(index, 1)
          groupChanged = true
        }
      }
    }

    groups.push(group)
  }

  groups.forEach((group) => {
    if (group.length === 1) {
      setMarkerVisualOffset(group[0].marker, [0, 0])
      return
    }

    const radius = Math.min(42, Math.max(26, 18 + group.length * 3))
    group.forEach((entry, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / group.length
      setMarkerVisualOffset(entry.marker, [Math.cos(angle) * radius, Math.sin(angle) * radius])
    })
  })
}

function bringMarkerToFront(markers: Map<string, MapLibreMarker>, marker: TripMapMarker) {
  markers.forEach((currentMarker) => {
    currentMarker.getElement().style.zIndex = ""
  })
  markers.get(`${marker.type}:${marker.id}`)?.getElement().style.setProperty("z-index", "10")
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

export function TripMap({
  markers,
  renderMarkerDetails,
  onMarkerClick,
  focusMarker,
  onFocusMarkerHandled,
}: TripMapProps) {
  const { t } = useTranslation()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [selectedMarker, setSelectedMarker] = useState<TripMapMarker | null>(null)
  const [isMarkerDetailsClosing, setIsMarkerDetailsClosing] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRefs = useRef<Map<string, MapLibreMarker>>(new Map())
  const markerDetailsCloseTimeoutRef = useRef<number | null>(null)
  const renderMarkerDetailsRef = useRef(renderMarkerDetails)
  const onMarkerClickRef = useRef(onMarkerClick)
  const onFocusMarkerHandledRef = useRef(onFocusMarkerHandled)
  renderMarkerDetailsRef.current = renderMarkerDetails
  onMarkerClickRef.current = onMarkerClick
  onFocusMarkerHandledRef.current = onFocusMarkerHandled

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
    const markerMap = markerRefs.current

    return () => {
      markerMap.forEach((marker) => marker.remove())
      markerMap.clear()
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
    markerRefs.current.clear()

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
      const connector = document.createElement("span")
      connector.className = "trip-map-marker-connector"
      connector.hidden = true
      element.append(connector, label, pointer)

      if (renderMarkerDetailsRef.current || onMarkerClickRef.current) {
        element.addEventListener("click", (event) => {
          bringMarkerToFront(markerRefs.current, marker)

          if (window.innerWidth >= 1024) {
            if (onMarkerClickRef.current) {
              event.preventDefault()
              event.stopImmediatePropagation()
              onMarkerClickRef.current(marker)
            }
            return
          }

          if (!renderMarkerDetailsRef.current) {
            return
          }

          event.preventDefault()
          event.stopImmediatePropagation()
          if (markerDetailsCloseTimeoutRef.current !== null) {
            window.clearTimeout(markerDetailsCloseTimeoutRef.current)
            markerDetailsCloseTimeoutRef.current = null
          }
          setIsMarkerDetailsClosing(false)
          setSelectedMarker(marker)
        })
      }

      const popup = new Popup({ offset: 18 }).setText(`${marker.title}\n${formatDate(marker.date)}`)

      const mapMarker = new Marker({ anchor: "bottom", element })
        .setLngLat([marker.longitude, marker.latitude])
        .setPopup(popup)
        .addTo(map)

      markerRefs.current.set(`${marker.type}:${marker.id}`, mapMarker)
    })

    fitMapToMarkers(map, markers)
  }, [markers])

  useEffect(() => {
    const map = mapRef.current

    if (!map) {
      return
    }

    const updateMarkerLayout = () => applyMarkerLayout(map, markerRefs.current)
    const frame = requestAnimationFrame(updateMarkerLayout)
    map.on("moveend", updateMarkerLayout)
    map.on("zoomend", updateMarkerLayout)
    map.on("resize", updateMarkerLayout)

    return () => {
      cancelAnimationFrame(frame)
      map.off("moveend", updateMarkerLayout)
      map.off("zoomend", updateMarkerLayout)
      map.off("resize", updateMarkerLayout)
    }
  }, [markers])

  useEffect(() => {
    setSelectedMarker((currentMarker) =>
      currentMarker && markers.some((marker) => marker.id === currentMarker.id)
        ? currentMarker
        : null,
    )
  }, [markers])

  useEffect(() => {
    if (!focusMarker || !mapRef.current) {
      return
    }

    bringMarkerToFront(markerRefs.current, focusMarker)

    const focusMap = () => {
      if (!mapRef.current) {
        return
      }

      mapRef.current.flyTo({
        center: [focusMarker.longitude, focusMarker.latitude],
        essential: true,
        zoom: 14,
      })
      onFocusMarkerHandledRef.current?.()
    }

    if (window.innerWidth < 1024) {
      setIsMobileOpen(true)
      requestAnimationFrame(() => requestAnimationFrame(focusMap))
      return
    }

    focusMap()
  }, [focusMarker])

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

  useEffect(
    () => () => {
      if (markerDetailsCloseTimeoutRef.current !== null) {
        window.clearTimeout(markerDetailsCloseTimeoutRef.current)
      }
    },
    [],
  )

  function closeMarkerDetails() {
    setIsMarkerDetailsClosing(true)
    if (markerDetailsCloseTimeoutRef.current !== null) {
      window.clearTimeout(markerDetailsCloseTimeoutRef.current)
    }
    markerDetailsCloseTimeoutRef.current = window.setTimeout(() => {
      setSelectedMarker(null)
      setIsMarkerDetailsClosing(false)
      markerDetailsCloseTimeoutRef.current = null
    }, markerDetailsAnimationDuration)
  }

  return (
    <>
      <button
        aria-expanded={isMobileOpen}
        className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-on-brand shadow-card lg:hidden"
        onClick={() => {
          if (markerDetailsCloseTimeoutRef.current !== null) {
            window.clearTimeout(markerDetailsCloseTimeoutRef.current)
            markerDetailsCloseTimeoutRef.current = null
          }
          setIsMarkerDetailsClosing(false)
          setSelectedMarker(null)
          setIsMobileOpen(true)
        }}
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
            onClick={() => {
              setSelectedMarker(null)
              setIsMobileOpen(false)
            }}
            type="button"
          >
            ×
          </button>
        </div>
      </section>
      {selectedMarker && renderMarkerDetails && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] p-3 lg:hidden">
          <div
            className={`trip-map-marker-details pointer-events-auto mx-auto max-w-xl${
              isMarkerDetailsClosing ? " trip-map-marker-details-closing" : ""
            }`}
          >
            {renderMarkerDetails(selectedMarker)}
            <div className="flex justify-end pt-2">
              <button
                aria-label={t("tripMap.closeDetails")}
                className="grid size-8 place-items-center rounded-lg bg-surface text-lg text-on-surface shadow-sm hover:bg-surface-muted"
                onClick={closeMarkerDetails}
                type="button"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
