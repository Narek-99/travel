import React, { createContext, useContext, useState, useEffect } from 'react'
import { Platform } from 'react-native'
import {
    initConnection,
    endConnection,
    flushFailedPurchasesCachedAsPendingAndroid,
    getSubscriptions,
    getAvailablePurchases,
    requestSubscription,
    purchaseUpdatedListener,
    finishTransaction
} from 'react-native-iap'

export const SubscriptionContext = createContext({
    isSubscribed: false,
    SUB_IDS: ['com.travel.ai.yearly.1', 'com.travel.ai.monthly.1'],
    setisSubscribed: (val: boolean) => { },
    subsciptionList: [],
    handlePurchase: (val: 'com.travel.ai.yearly.1' | 'com.travel.ai.monthly.1'  ) => { },
    getAvailablePurchase: () => { }
})

export const useSubscriptions = () => useContext(SubscriptionContext)

export const SubscriptionProvider = ({ children }: any) => {
    const [isSubscribed, setisSubscribed] = useState<any>(false)
    const [subsciptionList, setsubsciptionList] = useState<any>([])
    const [loading, setLoading] = useState(false)
    const SUB_IDS = ['com.travel.ai.yearly.1', 'com.travel.ai.monthly.1']

    const getSubs = async () => {
        try {
            const res = await getSubscriptions({ skus: SUB_IDS })
            setsubsciptionList(res)
        } catch (error: any) {
            console.error('Error getting subscriptions:', error.message || error)
        }
    }

    const validateReceipt = async (receipt: any) => {
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
        } catch (error: any) {
            console.error("Error during receipt validation:", error.message || error);
            throw error;
        }
    };

    const handlePurchase = async (id: 'com.travel.ai.yearly.1' | 'com.travel.ai.monthly.1'  ) => {
        console.log('Purchasing...');
        setLoading(true);
        try {
            if (subsciptionList?.length > 0) {
                const SelectedSub = subsciptionList.find((sub: any) => sub?.productId === id);
    
                const res = await requestSubscription({
                    sku: SelectedSub?.productId,
                });
                console.log('Purchase result:', res);
                setisSubscribed(true);
                getAvailablePurchase();
                console.log('Subscription purchased successfully.');
                return true;  // Return true on success
            }
        } catch (error: any) {
            console.error('Purchase error:', error.message || error);
            return false;  // Return false on error
        } finally {
            setLoading(false);
        }
    };

    const hasSubscription = (userSubscriptions: any, availableSubscriptions: any) => {
        for (let userSub of userSubscriptions) {
            for (let availableSub of availableSubscriptions) {
                if (userSub.productId === availableSub.productId && userSub.transactionReceipt) {
                    return true;
                }
            }
        }
        return false;
    }

    const getAvailablePurchase = async () => {
        try {
            const subscriptions = await getSubscriptions({ skus: SUB_IDS });
            const purchases = await getAvailablePurchases({
                alsoPublishToEventListener: false,
                onlyIncludeActiveItems: true,
                automaticallyFinishRestoredTransactions: false,
            });

            const subscribed = hasSubscription(purchases, subscriptions);
            setisSubscribed(subscribed);
        } catch (error: any) {
            console.error('Error getting available purchases:', error.message || error);
        }
    }

    useEffect(() => {
        const init = async () => {
            try {
                console.log('Connecting to store...');
                await initConnection();
                console.log('Connected to store.');
                if (Platform.OS === 'android') {
                    await flushFailedPurchasesCachedAsPendingAndroid();
                }
                await getSubs();
                await getAvailablePurchase();
            } catch (error: any) {
                console.error('Error during initialization:', error.message || error);
            }
        }

        init();

        const purchaseUpdateSubscription = purchaseUpdatedListener(
            async (purchase) => {
                const receipt = purchase.transactionReceipt;
                if (receipt) {
                    try {
                        const validationResponse = await validateReceipt(receipt);
                        if (validationResponse.status === 0) { // Success
                            await finishTransaction({ purchase, isConsumable: false });
                            getAvailablePurchase();
                        } else {
                            console.error('Receipt validation failed:', validationResponse);
                        }
                    } catch (error: any) {
                        console.error('Error during transaction completion:', error.message || error);
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
                getAvailablePurchase
            }}>
            {children}
        </SubscriptionContext.Provider>
    );
};