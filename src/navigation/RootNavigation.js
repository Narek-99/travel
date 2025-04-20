import { ActivityIndicator, StyleSheet, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { FIREBASE_COLLECTIONS, SCREEN, USER_STATUS } from '../enums/AppEnums';
import { HistoryScreen, DestinationScreen, CompanionScreen, BudgetScreen, TripsScreen, ChatbotScreen, TripDetailsScreen, HotelBookingScreen, AdditionalScreen, PreferencesScreen, WishesScreen, ActivitiesScreen, DatesScreen, HelpScreen, FunFactsScreen, DayByDayPlanScreen, BookingScreen, Onboarding1Screen, SettingScreen, SubscriptionScreen } from '../screen';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../utils/Keys';
import { generateUniqueId } from '../utils/MyUtils';
import firestore from '@react-native-firebase/firestore';
import { getDocumentData } from '../services/FirebaseMethods';
import { setUser } from '../redux/action/Action';
import { COLOR } from '../enums/StyleGuide';
import { useSubscriptions } from '../contexts/subscriptionContext';


const RootNavigation = () => {
  const Stack = createNativeStackNavigator();
  const dispatch = useDispatch();
  const user = useSelector(({ appReducer }) => appReducer.user);
  const [loading, setLoading] = useState(true);
  const { isSubscribed } = useSubscriptions()

  useEffect(() => {
    saveUserId();
  }, [user?.userStatus]);

  useEffect(() => {
    dispatch(setUser({ ...user, subscription: isSubscribed, }));
  }, [isSubscribed])


  const saveUserId = async () => {
    try {
      setLoading(true)
      const existingUserId = await AsyncStorage.getItem(KEYS.USERID);
      if (!existingUserId) {
        const newUserId = generateUniqueId();
        await AsyncStorage.setItem(KEYS.USERID, newUserId);
        const data = {
          uid: newUserId,
          subscription: false,
          userStatus: USER_STATUS.NEW,
          createdAt: firestore.FieldValue.serverTimestamp(),
        };
        await firestore().collection(FIREBASE_COLLECTIONS.USERS).doc(newUserId).set(data);
        const userData = await getDocumentData(FIREBASE_COLLECTIONS.USERS, newUserId);
        dispatch(setUser({ ...(user != null ? user : {}), ...userData, subscription: isSubscribed, }));
      } else {
        const userData = await getDocumentData(FIREBASE_COLLECTIONS.USERS, existingUserId);
        dispatch(setUser({ ...(user != null ? user : {}), ...userData, subscription: isSubscribed, }));
      }
    } catch (error) {
      console.error("Error saving User ID:", error);
    } finally {
      setLoading(false);  // Set loading to false after user is loaded
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLOR.lightBlue} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user && user.userStatus === USER_STATUS.OLD && Object.keys(user).length > 0 ? (
          <>
            <Stack.Screen name={SCREEN.TRIPS} component={TripsScreen} />
            <Stack.Screen name={SCREEN.TRIPDETAILS} component={TripDetailsScreen} />
            <Stack.Screen name={SCREEN.DESTINATION} component={DestinationScreen} />
            <Stack.Screen name={SCREEN.DATES} component={DatesScreen} />
            <Stack.Screen name={SCREEN.COMPANION} component={CompanionScreen} />
            <Stack.Screen name={SCREEN.BUDGET} component={BudgetScreen} />
            <Stack.Screen name={SCREEN.ACTIVITIES} component={ActivitiesScreen} />
            <Stack.Screen name={SCREEN.WISHES} component={WishesScreen} />
            <Stack.Screen name={SCREEN.PREFERENCES} component={PreferencesScreen} />
            <Stack.Screen name={SCREEN.ADDITIONAL} component={AdditionalScreen} />
            <Stack.Screen name={SCREEN.HISTORY} component={HistoryScreen} />
            <Stack.Screen name={SCREEN.SETTINGS} component={SettingScreen} />
            <Stack.Screen name={SCREEN.SUBSCRIPTION} component={SubscriptionScreen} />
            <Stack.Screen name={SCREEN.BOOKING} component={BookingScreen} />
            <Stack.Screen name={SCREEN.HOTELBOOKING} component={HotelBookingScreen} />
            <Stack.Screen name={SCREEN.DAYBYDAY} component={DayByDayPlanScreen} />
            <Stack.Screen name={SCREEN.CHATBOT} component={ChatbotScreen} />
            <Stack.Screen name={SCREEN.FUNFACTS} component={FunFactsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name={SCREEN.ONBOARDING1} component={Onboarding1Screen} />
            <Stack.Screen name={SCREEN.HELP} component={HelpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default RootNavigation;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLOR.white,
  },
});

