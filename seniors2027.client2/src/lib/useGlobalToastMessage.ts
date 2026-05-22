import { useEffect, type Dispatch, type SetStateAction } from 'react'
import { pushGlobalToast, type GlobalToastKind } from './globalToast'

export const useGlobalToastMessage = (
  message: string | null | undefined,
  setMessage?: Dispatch<SetStateAction<string | null>>,
  kind: GlobalToastKind = 'info'
) => {
  useEffect(() => {
    if (!message) return
    pushGlobalToast(message, kind)
    setMessage?.(null)
  }, [kind, message, setMessage])
}
