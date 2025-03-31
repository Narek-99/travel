import { useAsyncStorage } from '@react-native-async-storage/async-storage'
import { format } from 'date-fns'
import { useRef } from 'react'
import * as StoreReview from 'react-native-store-review'

export const LAST_REVIEW_DATE = '@last-review-date-4'

export default function useRating() {
  const reviewAsked = useRef(false)

  const { setItem, getItem } = useAsyncStorage(LAST_REVIEW_DATE)

  const showRating = async () => {
    const asked = await getItem()

    if (reviewAsked.current || asked) {
      return
    }

    try {
      await StoreReview.requestReview()
    } catch (error) {
      console.log(error)
    } finally {
      reviewAsked.current = true
      await setItem(format(new Date(), 'MM/dd/yyyy'))
    }
  }

  return {
    showRating,
  }
}
