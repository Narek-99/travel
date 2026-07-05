import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  Purchase,
  Subscription,
  endConnection,
  finishTransaction,
  flushFailedPurchasesCachedAsPendingAndroid,
  getAvailablePurchases,
  getSubscriptions,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestSubscription,
} from 'react-native-iap';

interface SubscriptionContextType {
  isSubscribed: boolean;
  SUB_IDS: string[];
  setIsSubscribed: (value: boolean) => void;
  subscriptionList: Subscription[];
  handlePurchase: (id: string) => Promise<boolean>;
  getAvailablePurchase: () => Promise<void>;
  isProductListLoading: boolean;
}

const SUBSCRIPTION_IDS = [
  'com.travel.ai.monthly.4',
  'com.travel.ai.yearly.4',
];

export const SubscriptionContext = createContext<SubscriptionContextType>({
  isSubscribed: false,
  SUB_IDS: SUBSCRIPTION_IDS,
  setIsSubscribed: () => {},
  subscriptionList: [],
  handlePurchase: async () => false,
  getAvailablePurchase: async () => {},
  isProductListLoading: true,
});

export const useSubscriptions = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionList, setSubscriptionList] = useState<Subscription[]>([]);
  const [isProductListLoading, setIsProductListLoading] = useState(true);

  const getSubs = useCallback(async () => {
    try {
      setIsProductListLoading(true);
      const subscriptions = await getSubscriptions({ skus: SUBSCRIPTION_IDS });
      setSubscriptionList(subscriptions);
    } catch (error) {
      console.error('Error fetching IAP products:', error);
      setSubscriptionList([]);
    } finally {
      setIsProductListLoading(false);
    }
  }, []);

  const hasActiveSubscription = (purchases: Purchase[]) =>
    purchases.some(
      purchase =>
        SUBSCRIPTION_IDS.includes(purchase.productId) &&
        Boolean(purchase.transactionReceipt),
    );

  const getAvailablePurchase = useCallback(async () => {
    try {
      const purchases = await getAvailablePurchases({
        alsoPublishToEventListener: false,
        onlyIncludeActiveItems: true,
        automaticallyFinishRestoredTransactions: false,
      });

      setIsSubscribed(hasActiveSubscription(purchases));
    } catch (error) {
      console.error('Error checking purchases:', error);
      setIsSubscribed(false);
    }
  }, []);

  const handlePurchase = useCallback(async (id: string) => {
    try {
      if (!subscriptionList.length) {
        await getSubs();
      }

      if (!SUBSCRIPTION_IDS.includes(id)) {
        throw new Error(`Unknown subscription product ${id}`);
      }

      await requestSubscription({ sku: id });
      return true;
    } catch (error) {
      console.error('Purchase error:', error);
      return false;
    }
  }, [getSubs, subscriptionList.length]);

  useEffect(() => {
    const init = async () => {
      try {
        await initConnection();

        if (Platform.OS === 'android') {
          await flushFailedPurchasesCachedAsPendingAndroid();
        }

        await getSubs();
        await getAvailablePurchase();
      } catch (error) {
        console.error('Store init error:', error);
        setIsProductListLoading(false);
      }
    };

    init();

    const purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase: Purchase) => {
      const receipt = purchase.transactionReceipt;

      if (receipt && SUBSCRIPTION_IDS.includes(purchase.productId)) {
        try {
          await finishTransaction({ purchase, isConsumable: false });
          await getAvailablePurchase();
        } catch (error) {
          console.error('Transaction finish error:', error);
        }
      }
    });

    const purchaseErrorSubscription = purchaseErrorListener(error => {
      console.error('Purchase listener error:', error);
    });

    return () => {
      purchaseUpdateSubscription.remove();
      purchaseErrorSubscription.remove();
      endConnection();
    };
  }, [getAvailablePurchase, getSubs]);

  return (
    <SubscriptionContext.Provider
      value={{
        isSubscribed,
        SUB_IDS: SUBSCRIPTION_IDS,
        setIsSubscribed,
        handlePurchase,
        subscriptionList,
        getAvailablePurchase,
        isProductListLoading,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
