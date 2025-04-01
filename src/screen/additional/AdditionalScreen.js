import { SafeAreaView, StyleSheet, View, TextInput, Keyboard, TouchableWithoutFeedback, Pressable, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Button, Label } from '../../components';
import { En } from '../../locales/En';
import { COLOR, hp, TEXT_STYLE, wp } from '../../enums/StyleGuide';
import ProgressBar from 'react-native-progress/Bar';
import { useTripStore } from '../../store/tripStore'; // Zustand Store
import { useSelector } from 'react-redux'; // Get user ID from Redux
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
  const user = useSelector(({ appReducer }) => appReducer.user); // Get logged-in user
  const [loading, setLoading] = useState(false);

  const route = useRoute();
  const tripId = route.params?.tripId;

  useEffect(() => {
    const loadTripData = async () => {
      if (!tripId) return; // Frühzeitiger Rückkehr, wenn keine tripId vorhanden ist

      try {
        const tripDetails = await firestore()
          .collection('users')
          .doc(user.uid)
          .collection('trips')
          .doc(tripId)
          .get();
        if (tripDetails.exists) {
          const data = tripDetails.data();

          setAdditionalInfo(data.additionalInfo);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Trip-Daten:', error);
      }
    };

    loadTripData();
  }, [tripId]); // Abhängigkeit von tripId

  useEffect(() => {
    setTripData({ additionalInfo });
  }, [additionalInfo]);

  const getDateString = (timestamp) => {
    if (!timestamp?.toDate) return '';
    const date = timestamp.toDate();
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };

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
    };
  }


  const handleSaveTrip = async () => {
    setLoading(true);
    if (!user?.uid || !tripData.destination) {
      Alert.alert("Error", "User or destination missing!");
      setLoading(false);
      return;
    }

    const { from, to } = getLimitedDateRange(tripData.startDate, tripData.endDate);

    const getLimitedDateRange = (startDate, endDate, maxDays = 7) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      if (duration <= maxDays) {
        return { from: getDateString({ toDate: () => new Date(start) }), to: getDateString({ toDate: () => new Date(end) }) };
      }

      const limitedEnd = new Date(start);
      limitedEnd.setDate(start.getDate() + maxDays - 1);

      return { from: getDateString({ toDate: () => start }), to: getDateString({ toDate: () => limitedEnd }) };
    };


    const tripPrompt = `
Create a clearly structured, highly personalized **day-by-day travel plan** for the user's trip, strictly based on the trip details below.

🎯 Instructions:

1. **Do NOT include any introduction or explanation.**
2. **Do NOT summarize or explain the format at the end.**
3. Jump **directly into the Day 1 itinerary**.
4. Provide an **itinerary for every single day** from **${from}** to **${to}**.
5. Use the exact structure and Markdown formatting below — no extra text, just clean output for the app:

---

### 📅 Day [X]: [YYYY-MM-DD]

**🕗 Morning (08:00–12:00)**  
- ✨ Activity & Location: [Personalized, relevant to user’s interests]  
- 💡 Local Tip: [Hidden gem, timing tip, local culture]

**🍽️ Lunch (12:00–14:00)**  
- 🥘 Food Spot: [Dining suggestion based on user’s taste & budget]

**🏞️ Afternoon (14:00–18:00)**  
- 🧭 Activity: [Local sight, district, cultural or outdoor experience]  
- 💰 Budget Tip: [Free entry days, discounts, practical info]

**🌇 Evening (18:00–22:00)**  
- 🌃 Suggestion: [Dinner, bar, sunset point, cinema, local vibe]

**🛏️ Accommodation**  
- [Optional – only if user hasn’t specified or is looking for tips]

**🚶 Travel Insight**  
- [Helpful local tip: transport, walking route, etiquette, etc.]

---

📌 Repeat this format exactly for each day — clean, useful, tailored to the user.  
Avoid generic text. Make every suggestion feel like a local planned it with love.

---

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
`;


    console.log('tripPrompt :', tripPrompt);
    let aiTravelPlan = '';
    try {
      aiTravelPlan = await callChatGptForResponse(tripPrompt, "35");
    } catch (error) {
      console.warn('Could not generate AI travel plan:', error);
      aiTravelPlan = 'We couldn’t generate a plan right now. Please try again later.';
    }

    // Decide whether to create a new trip or update an existing one
    const isNewTrip = !tripId;
    const effectiveTripId = isNewTrip ? `${tripData.destination}-${Date.now()}` : tripId;
    const tripToSave = {
      ...tripData,
      additionalInfo,
      aiPlan: aiTravelPlan,
      updatedAt: new Date().toISOString(),
    };

    if (isNewTrip) {
      tripToSave.createdAt = new Date().toISOString();
    }

    try {
      await firestore().collection('users').doc(user.uid).collection('trips').doc(effectiveTripId).set(tripToSave, { merge: true });
      console.log("Trip saved successfully:", tripToSave);
      resetTrip();
      Toast.show({
        type: 'success',
        text1: isNewTrip ? "Your trip has been saved!" : "Your trip has been updated!",
        position: 'top',
        visibilityTime: 2000,
      });
      navigation.navigate(SCREEN.TRIPDETAILS, { tripId: effectiveTripId });
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

          {/* Step Indicator and Progress Bar */}
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

          {/* Text Input for Additional Information */}
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
    justifyContent: "space-between", // Align items on both ends
    width: '100%', // Ensure the container takes full width
    paddingHorizontal: 10, // Optional: for inner spacing
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
  optionalText: {
    ...TEXT_STYLE.textSmall,
    color: COLOR.black,
    marginTop: hp(1),
  },
  stepIndicatorContainer: {
    alignItems: 'center',
  },
  stepText: {
    ...TEXT_STYLE.textSmall,
    color: COLOR.lightBlue,
    marginBottom: hp(1),
  },
  continueButton: {
    backgroundColor: '#002953',
    marginTop: 'auto',
    marginBottom: hp(5),
    marginHorizontal: wp(2),
  },
  buttonText: {
    color: 'white',
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
});
