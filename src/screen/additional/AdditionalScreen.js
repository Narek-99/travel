import { SafeAreaView, StyleSheet, View, TextInput, Keyboard, TouchableWithoutFeedback, Pressable, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Button, Label } from '../../components';
import { En } from '../../locales/En';
import { COLOR, hp, TEXT_STYLE, wp } from '../../enums/StyleGuide';
import ProgressBar from 'react-native-progress/Bar';
import { useTripStore } from '../../store/tripStore';
import { useSelector } from 'react-redux';
import { SCREEN } from '../../enums/AppEnums';
import { SVG } from '../../assets/svgs';
import { callChatGptForResponse } from '../../apis/ChatGptApi';
import { ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import Toast from 'react-native-toast-message';

const currentStep = 8;
const totalSteps = 8;
const progress = currentStep / totalSteps;

const AdditionalScreen = ({ navigation }) => {
  const { tripData, setTripData, resetTrip } = useTripStore();
  const [additionalInfo, setAdditionalInfo] = useState(tripData.additionalInfo || '');
  const user = useSelector(({ appReducer }) => appReducer.user);
  const [loading, setLoading] = useState(false);
  const route = useRoute();
  const tripId = route.params?.tripId;

  const getDateString = (timestamp) => {
    if (!timestamp?.toDate && !timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toISOString().split('T')[0];
  };

  const getLimitedDateRange = (startDate, endDate, maxDays = 7) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (duration <= maxDays) {
      return { from: getDateString(start), to: getDateString(end) };
    }
    const limitedEnd = new Date(start);
    limitedEnd.setDate(start.getDate() + maxDays - 1);
    return { from: getDateString(start), to: getDateString(limitedEnd) };
  };

  useEffect(() => {
    const loadTripData = async () => {
      if (!tripId) return;
      try {
        const tripDetails = await firestore()
          .collection('users')
          .doc(user.uid)
          .collection('trips')
          .doc(tripId)
          .get();
        if (tripDetails.exists) {
          const data = tripDetails.data();
          setAdditionalInfo(data.additionalInfo || '');
        }
      } catch (error) {
        console.error('Fehler beim Laden der Trip-Daten:', error);
      }
    };
    loadTripData();
  }, [tripId, user.uid]);

  useEffect(() => {
    setTripData({ additionalInfo });
  }, [additionalInfo, setTripData]);

  const handleSaveAdditionalInformation = async () => {
    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .update({ additionalInfo });
      Toast.show({
        type: 'success',
        text1: 'Additional information updated successfully',
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to update additional information',
        position: 'bottom',
        visibilityTime: 4000,
      });
    }
  };

  const generateAiPlanInBackground = async (tripData, tripId) => {
    const { from, to } = getLimitedDateRange(tripData.startDate, tripData.endDate);

    const tripPrompt = `
    Create a highly personalized, clearly structured day-by-day travel itinerary based strictly on the user's provided preferences and trip details below.
    Follow these instructions carefully:
    1. Provide a separate, clearly marked itinerary for EVERY SINGLE DAY of the trip, from **${from}** to **${to}**.
    2. Use this precise daily structure for each day (provide the response in Markdown):
    -----
    📅 Day [X]
    - 📍 Activity & Location: Specific location name and a brief description tailored exactly to user's preferences.
    - 🕒 Suggested defined time range (e.g., 9:00–12:00)
    - 💰 Budget-friendly tips (where applicable, based on user's selected budget).
    - 🥘 Recommended dining spots relevant to user's preferences.
    - 🏨 Recommended accommodations aligned with user's preferences (if applicable).
    - 🚶 Travel tips or local insights relevant to the itinerary.
    ----
    Repeat exactly this structured format for every single day of the trip.
    User’s Trip Details to Strictly Follow:
    - **Destination:** ${tripData.destination}
    - **Travel Dates:** ${tripData.startDate} to ${tripData.endDate} (Provide itinerary for every day!)
    - **Traveling with:** ${tripData.companion}, ${tripData.persons || '1'} person(s)
    - **Budget:** ${tripData.budget || 'medium'}
    - **Preferred Activities:** ${tripData.activities?.join(', ') || 'no specific activities'}
    - **Special Wishes:** ${tripData.wishes?.join(', ') || 'none'}
    - **Accommodation Preferences:** ${tripData.accommodation?.join(', ') || 'no specific preferences'}
    - **Preferred Location within Destination:** ${tripData.location?.join(', ') || 'no specific location'}
    - **Additional Information:** ${tripData.additionalInfo || 'none'}
    Maintain a friendly, enthusiastic, and highly personalized tone throughout.
    `;

    const funFactsPrompt = `
    Provide exactly 15 highly engaging, unique, and surprising fun facts about ${tripData.destination}, tailored for a travel app to captivate and inspire travelers. At least 3 facts must focus on famous people who lived or worked there, each including a fun or memorable story about their time in the city. At least 3 additional facts should tell quirky or fascinating stories about the city’s history, culture, or landmarks. Each fact must be concise (1-2 sentences), positive, and exciting to read. Format the response as a plain text numbered list (1. to 15.), with each fact starting with a number and a period (e.g., "1. ..."). Do not include any introductory text, headings, or extra formatting beyond the numbered list.
    `;

    try {
      const [aiPlan, funFactsResponse] = await Promise.all([
        callChatGptForResponse(tripPrompt, ""),
        callChatGptForResponse(funFactsPrompt, "35")
      ]);
      const funFacts = funFactsResponse.split('\n').filter(fact => fact.trim().match(/^\d+\./));
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .update({ aiPlan, funFacts });
    } catch (error) {
      console.error("❌ Fehler beim Generieren des AI-Plans oder Fun Facts:", error);
    }
  };

  const handleSaveTrip = async () => {
    setLoading(true);
    if (!user?.uid || !tripData.destination) {
      Alert.alert("Error", "User or destination missing!");
      setLoading(false);
      return;
    }

    const isNewTrip = !tripId;
    const effectiveTripId = isNewTrip ? `${tripData.destination}-${Date.now()}` : tripId;
    const tripToSave = {
      ...tripData,
      additionalInfo,
      aiPlan: '',
      funFacts: [],
      updatedAt: new Date().toISOString(),
    };

    if (isNewTrip) {
      tripToSave.createdAt = new Date().toISOString();
    }

    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(effectiveTripId)
        .set(tripToSave, { merge: true });
      resetTrip();
      navigation.navigate(SCREEN.TRIPDETAILS, { tripId: effectiveTripId });
      generateAiPlanInBackground(tripToSave, effectiveTripId);
    } catch (error) {
      console.error("Error saving trip:", error);
      Toast.show({
        type: 'error',
        text1: "Failed to save the trip.",
        position: 'top',
        visibilityTime: 2000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.screenContainer}>
        <View style={styles.contentContainer}>
          <SafeAreaView />
          <View style={styles.stepIndicatorContainer}>
            <Label style={styles.stepText}>Step {currentStep} of {totalSteps}</Label>
            <ProgressBar
              progress={progress}
              width={wp(80)}
              height={hp(1)}
              color={COLOR.lightBlue}
              borderRadius={5}
            />
          </View>
          <View style={styles.headlineContainer}>
            <Pressable onPress={() => navigation.goBack()}>
              <SVG.BackIcon fill="black" />
            </Pressable>
            <Label style={styles.titleText}>{En.additionalTitle}</Label>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => tripId ? navigation.navigate(SCREEN.TRIPDETAILS, { tripId: tripId }) : navigation.navigate(SCREEN.TRIPS)}>
              <SVG.Close fill="black" />
            </Pressable>
          </View>
          <Label style={styles.subtitleText}>{En.additionalSubtitle}</Label>
          <TextInput
            style={styles.textInput}
            onChangeText={(text) => setAdditionalInfo(text)}
            placeholder="Type additional information or special requests..."
            placeholderTextColor={COLOR.lightGray}
            numberOfLines={4}
            value={additionalInfo}
            multiline
          />
          <View style={styles.submitContainer}>
            <Button
              style={styles.nextButton}
              text={loading ? "Saving..." : "Save Trip"}
              textStyle={styles.buttonText}
              onPress={tripId ? handleSaveAdditionalInformation : handleSaveTrip}
              disabled={loading}
            >
              {loading && (
                <ActivityIndicator style={{ marginLeft: 10 }} color="#fff" />
              )}
            </Button>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default AdditionalScreen;

const styles = StyleSheet.create({
  headlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: '100%',
    paddingHorizontal: 10,
    gap: wp(2),
    marginTop: hp(2)
  },
  screenContainer: {
    flex: 1,
    backgroundColor: COLOR.white,
  },
  contentContainer: {
    paddingTop: '8%',
    paddingHorizontal: '5%',
  },
  titleText: {
    fontSize: 22,
    color: COLOR.black,
    marginVertical: hp(2),
  },
  subtitleText: {
    ...TEXT_STYLE.textMedium,
    marginBottom: hp(2),
    color: 'black'
  },
  textInput: {
    height: hp(15),
    backgroundColor: COLOR.darkGrey,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: COLOR.lightGray,
    padding: wp(4),
    color: 'black',
    marginVertical: hp(3),
    textAlignVertical: 'top',
  },
  stepIndicatorContainer: {
    alignItems: 'center',
  },
  stepText: {
    ...TEXT_STYLE.textSmall,
    color: COLOR.lightBlue,
    marginBottom: hp(1),
  },
  submitContainer: {
    justifyContent: 'flex-end',
    marginTop: 'auto',
    width: '100%',
    paddingHorizontal: wp(2),
    marginBottom: hp(2),
  },
  nextButton: {
    backgroundColor: '#002953',
    marginHorizontal: wp(2),
  },
  buttonText: {
    color: 'white',
  },
});