import { useEffect } from 'react'
import { useApp } from '../App'

/** Pull latest employees/settings (and all store data) when a page opens. */
export function useRefreshDataOnMount() {
  const { refreshData } = useApp()
  useEffect(() => {
    refreshData()
  }, [refreshData])
}
