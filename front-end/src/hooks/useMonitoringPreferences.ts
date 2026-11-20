import { useState } from 'react'
import { readPreferences, savePreferences, type Preferences } from '../../monitoring-settings/settings'

export function useMonitoringPreferences(scope: string) {
  const [preferences, setPreferences] = useState(() => readPreferences(scope))
  const [collapsed, setCollapsed] = useState(preferences.value.sidebar === 'collapsed')
  function applySettings(value: Preferences) {
    savePreferences(scope, value)
    setPreferences({ value, notice: '' })
    setCollapsed(value.sidebar === 'collapsed')
  }

  function toggleSidebar() {
    setCollapsed(previous => !previous)
  }

  return { preferences, collapsed, applySettings, toggleSidebar }
}
