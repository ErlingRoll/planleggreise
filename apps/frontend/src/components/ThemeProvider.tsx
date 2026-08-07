import { useLayoutEffect, useMemo, useState, type ReactNode } from "react"
import { ThemeContext, type Theme } from "./theme-context"
import { readMigratedStorageValue, storageKeys } from "../lib/brand"

const themeStorageKey = storageKeys.theme

function getInitialTheme(): Theme {
  const storedTheme = readMigratedStorageValue(themeStorageKey, storageKeys.legacyTheme)

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem(themeStorageKey, theme)
  }, [theme])

  const contextValue = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark")),
    }),
    [theme],
  )

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
}
