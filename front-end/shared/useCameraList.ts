import { useEffect, useState } from 'react'
import type { Camera, CameraSource } from '../camera-list/cameraApi'
import { failureMessage } from './playerState'

// W01·W02 공통 목록 조회. 실패해도 마지막으로 받은 목록은 유지한다.
export function useCameraList(source: CameraSource) {
  const [rows, setRows] = useState<Camera[]>([])
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updated, setUpdated] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    async function load() {
      setLoading(true)
      setError('')
      try {
        const next = await source.list(signal, attempt)
        if (!signal.aborted) { setRows(next); setUpdated(true) }
      } catch (err) {
        if (!signal.aborted) setError(failureMessage(err))
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [source, attempt])
  const refresh = () => setAttempt(value => value + 1)
  return { rows, loading, error, updated, refresh }
}
