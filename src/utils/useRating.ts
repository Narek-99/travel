import { useAsyncStorage } from '@react-native-async-storage/async-storage';
import { format, differenceInDays, parse } from 'date-fns';
import { useRef } from 'react';
import * as StoreReview from 'react-native-store-review';

export const LAST_REVIEW_DATE = '@last-review-date-after-engagement-1';

export default function useRating() {
  const reviewAsked = useRef(false);
  const { setItem, getItem } = useAsyncStorage(LAST_REVIEW_DATE);

  const COOLDOWN_DAYS = 7;

  const showRating = async (forceShow = false) => {
    if (!forceShow) {
      if (reviewAsked.current) {
        return;
      }

      const lastReviewDate = await getItem();
      if (lastReviewDate) {
        const parsedDate = parse(lastReviewDate, 'MM/dd/yyyy', new Date());
        const daysSinceLastReview = differenceInDays(new Date(), parsedDate);
        if (daysSinceLastReview < COOLDOWN_DAYS) {
          return;
        }
      }
    }

    try {
      await StoreReview.requestReview();
      reviewAsked.current = true;
      await setItem(format(new Date(), 'MM/dd/yyyy'));
    } catch (error) {
      reviewAsked.current = true;
      await setItem(format(new Date(), 'MM/dd/yyyy'));
    }
  };

  return {
    showRating,
  };
}
