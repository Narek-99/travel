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
import { getTripPrompt, getFunFactsPrompt } from '../../apis/Prompts';

const currentStep = 7;
const totalSteps = 7;
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
    try {
      const [funFactsResponse] = await Promise.all([
        callChatGptForResponse(getFunFactsPrompt(tripData.destination), "")
      ]);
      const funFacts = funFactsResponse.split('\n').filter(fact => fact.trim().match(/^\d+\./));
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .update({ funFacts });
    } catch (error) {
      console.error("❌ Error generating the fun fact: ", error);
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
              height={hp(0.8)}
              color={COLOR.primary}
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
    color: COLOR.primary,
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
    backgroundColor: COLOR.primary,
    marginHorizontal: wp(2),
  },
  buttonText: {
    color: 'white',
  },
});