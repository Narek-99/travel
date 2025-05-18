import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  flushFailedPurchasesCachedAsPendingAndroid,
  getSubscriptions,
  getAvailablePurchases,
  requestSubscription,
  requestPurchase,
  getProducts,
  purchaseUpdatedListener,
  finishTransaction,
  Purchase,
  Product,
  Subscription,
} from 'react-native-iap';

interface SubscriptionContextType {
  isSubscribed: boolean;
  SUB_IDS: string[];
  setisSubscribed: (val: boolean) => void;
  subsciptionList: (Product | Subscription)[];
  handlePurchase: (id: string) => Promise<boolean>;
  getAvailablePurchase: () => Promise<void>;
  isProductListLoading: boolean;
}

export const SubscriptionContext = createContext<SubscriptionContextType>({
  isSubscribed: false,
  SUB_IDS: [
    'com.travel.ai.yearly.2',
    'com.travel.ai.monthly.2',
    'com.travel.ai.lifetime2

',
  ],
  setisSubscribed: () => {},
  subsciptionList: [],
  handlePurchase: async () => false,
  getAvailablePurchase: async () => {},
  isProductListLoading: true,
});

export const useSubscriptions = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const [isSubscribed, setisSubscribed] = useState(false);
  const [subsciptionList, setsubsciptionList] = useState<(Product | Subscription)[]>([]);
  const [isProductListLoading, setIsProductListLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const SUB_IDS = [
    'com.travel.ai.yearly.2',
    'com.travel.ai.monthly.2',
    'com.travel.ai.lifetime2

',
  ];

  const getSubs = async () => {
    try {
      setIsProductListLoading(true);
      const subscriptions = await getSubscriptions({ skus: SUB_IDS.slice(0, 2) });
      const lifetime = await getProducts({ skus: [SUB_IDS[2]] });
      const combined = [...subscriptions, ...lifetime];
      setsubsciptionList(combined);
    } catch (error) {
      console.error('Error fetching IAP products:', error);
      setsubsciptionList([]);
    } finally {
      setIsProductListLoading(false);
    }
  };

  const validateReceipt = async (receipt: string) => {
    const productionURL = 'https://buy.itunes.apple.com/verifyReceipt';
    const sandboxURL = 'https://sandbox.itunes.apple.com/verifyReceipt';
    const requestBody = JSON.stringify({
      'receipt-data': receipt,
      'password': 'e087ae2a1b524706abb1441a025f6827',
    });

    try {
      let response = await fetch(productionURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });

      let result = await response.json();

      if (result.status === 21007) {
        response = await fetch(sandboxURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        });
        result = await response.json();
      }

      return result;
    } catch (error) {
      console.error('Receipt validation error:', error);
      throw error;
    }
  };

  const handlePurchase = async (id: string) => {
    setLoading(true);
    try {
      if (!subsciptionList.length) {
        await getSubs();
      }

      const selectedSub = subsciptionList.find((sub) => sub.productId === id);

      if (!selectedSub) {
        throw new Error(`Product ${id} not found`);
      }

      if (id === 'com.travel.ai.lifetime2

') {
        await requestPurchase({ sku: selectedSub.productId });
      } else {
        await requestSubscription({ sku: selectedSub.productId });
      }

      return true;
    } catch (error) {
      console.error('Purchase error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const hasSubscription = (userPurchases: Purchase[], availableSubs: (Product | Subscription)[]) => {
    for (const purchase of userPurchases) {
      if (purchase.productId === 'com.travel.ai.lifetime2

' && purchase.transactionReceipt) {
        if (new Date() <= new Date('2025-05-30')) return true;
      }

      if (
        availableSubs.some(
          (available) =>
            purchase.productId === available.productId && purchase.transactionReceipt
        )
      ) {
        return true;
      }
    }
    return false;
  };

  const getAvailablePurchase = async () => {
    try {
      const subscriptions = await getSubscriptions({ skus: SUB_IDS.slice(0, 2) });
      const lifetime = await getProducts({ skus: [SUB_IDS[2]] });
      const combinedList = [...subscriptions, ...lifetime];

      setsubsciptionList(combinedList);

      const purchases = await getAvailablePurchases({
        alsoPublishToEventListener: false,
        onlyIncludeActiveItems: true,
        automaticallyFinishRestoredTransactions: false,
      });

      const subscribed = hasSubscription(purchases, combinedList);
      setisSubscribed(subscribed);
    } catch (error) {
      console.error('Error checking purchases:', error);
    }
  };

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
      }
    };

    init();

    const purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase: Purchase) => {
      const receipt = purchase.transactionReceipt;
      if (receipt) {
        try {
          const validation = await validateReceipt(receipt);
          if (validation.status === 0) {
            await finishTransaction({ purchase, isConsumable: false });
            await getAvailablePurchase();
          }
        } catch (error) {
          console.error('Transaction error:', error);
        }
      }
    });

    return () => {
      purchaseUpdateSubscription.remove();
      endConnection();
    };
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        isSubscribed,
        SUB_IDS,
        setisSubscribed,
        handlePurchase,
        subsciptionList,
        getAvailablePurchase,
        isProductListLoading,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
