import { useAsyncStorage } from '@react-native-async-storage/async-storage';
import { format, differenceInDays, parse } from 'date-fns';
import { useRef } from 'react';
import * as StoreReview from 'react-native-store-review';

export const LAST_REVIEW_DATE = '@last-review-date-4';

export default function useRating() {
  const reviewAsked = useRef(false);
  const { setItem, getItem } = useAsyncStorage(LAST_REVIEW_DATE);

  const COOLDOWN_DAYS = 7; // Re-ask weekly if not forced

  const showRating = async (forceShow = false) => {
    // Skip checks if forceShow is true
    if (!forceShow) {
      // Check if the rating prompt was already shown in this session
      if (reviewAsked.current) {
        return;
      }

      // Check if the rating prompt was previously shown and if the cooldown period has passed
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
      // Mark the rating as asked
      reviewAsked.current = true;
      await setItem(format(new Date(), 'MM/dd/yyyy'));
    } catch (error) {
      // If the prompt fails, we still mark it as asked to avoid repeated attempts
      // This aligns with the behavior of react-native-store-review
      reviewAsked.current = true;
      await setItem(format(new Date(), 'MM/dd/yyyy'));
    }
  };

  return {
    showRating,
  };
}
