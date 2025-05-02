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
import { getFunFactsPrompt } from '../../apis/Prompts';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const currentStep = 7;
const totalSteps = 7;
const progress = currentStep / totalSteps;

const hapticOptions = {
  enableVibrateFallback: true,
};

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
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required.');
    }
    const start = startDate.toDate ? startDate.toDate() : new Date(startDate);
    const end = endDate.toDate ? endDate.toDate() : new Date(endDate);
    const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (duration <= maxDays) {
      return { from: start, to: end };
    }

    const limitedEnd = new Date(start);
    limitedEnd.setDate(start.getDate() + maxDays - 1);
    return {
      from: start,
      to: limitedEnd,
    };
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

  const fetchDestinationImage = async (destination) => {
    try {
      const response = await fetch(`https://openai-proxy-gilt-three.vercel.app/api/unsplash?destination=${destination}`);
      const data = await response.json();
      const imageUrl = data.results[0]?.urls?.regular;
      return imageUrl || null;
    } catch (error) {
      console.error('❌ Error fetching destination image:', error);
      return null;
    }
  };

  const fetchWeatherData = async (lat, lng, date) => {
    try {
      const response = await fetch(`https://openai-proxy-gilt-three.vercel.app/api/weather?lat=${lat}&lon=${lng}${date ? `&date=${date}` : ''}`);
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json();
      let weatherData = null;

      // Handle current or forecast structure from WeatherAPI
      if (data?.forecast?.forecastday?.[0]) {
        const day = data.forecast.forecastday[0].day;
        weatherData = {
          temperature: day.avgtemp_c,
          description: day.condition.text,
          icon: day.condition.icon,
        };
      } else if (data?.current) {
        weatherData = {
          temperature: data.current.temp_c,
          description: data.current.condition.text,
          icon: data.current.condition.icon,
        };
      }

      return weatherData;
    } catch (error) {
      console.error('❌ Error fetching weather data:', error);
      return null;
    }
  };


  const handleSaveTrip = async () => {
    setLoading(true);

    // Strict validation for required fields
    if (!user?.uid || !tripData.destination) {
      Toast.show({
        type: 'error',
        text1: 'Missing Data',
        text2: 'User or destination is missing.',
        position: 'top',
        visibilityTime: 3000,
      });
      setLoading(false);
      return;
    }

    if (!tripData.region?.latitude || !tripData.region?.longitude) {
      Toast.show({
        type: 'error',
        text1: 'Missing Coordinates',
        text2: 'Location coordinates are required. Please select a valid destination.',
        position: 'top',
        visibilityTime: 3000,
      });
      setLoading(false);
      return;
    }

    if (!tripData.startDate || !tripData.endDate) {
      Toast.show({
        type: 'error',
        text1: 'Missing Dates',
        text2: 'Start and end dates are required.',
        position: 'top',
        visibilityTime: 3000,
      });
      setLoading(false);
      return;
    }

    const isNewTrip = !tripId;
    const effectiveTripId = isNewTrip ? `${tripData.destination}-${Date.now()}` : tripId;
    const tripToSave = {
      ...tripData,
      additionalInfo: additionalInfo || '',
      funFacts: [],
      updatedAt: new Date().toISOString(),
      region: {
        latitude: tripData.region.latitude,
        longitude: tripData.region.longitude,
      },
    };

    if (isNewTrip) {
      tripToSave.createdAt = new Date().toISOString();
    }

    // Convert dates to Firestore Timestamps
    try {
      const limitedDates = getLimitedDateRange(tripData.startDate, tripData.endDate);
      tripToSave.startDate = firestore.Timestamp.fromDate(limitedDates.from);
      tripToSave.endDate = firestore.Timestamp.fromDate(limitedDates.to);
    } catch (error) {
      console.error('Error processing dates:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Invalid Dates',
        text2: 'Please ensure the dates are valid.',
        position: 'top',
        visibilityTime: 3000,
      });
      setLoading(false);
      return;
    }

    // Use user-provided coordinates
    const latitude = tripData.region.latitude;
    const longitude = tripData.region.longitude;

    // Fetch destination image and weather data
    const destinationImage = await fetchDestinationImage(tripData.destination);
    const weatherData = await fetchWeatherData(latitude, longitude);

    tripToSave.destinationImage = destinationImage;
    tripToSave.weather = weatherData;

    // Remove any undefined fields from tripToSave
    Object.keys(tripToSave).forEach(key => {
      if (tripToSave[key] === undefined) {
        console.warn(`Undefined field detected in tripToSave: ${key}`);
        delete tripToSave[key];
      }
    });

    try {
      const tripRef = firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(effectiveTripId);
      const tripDoc = await tripRef.get();
      const needsRegeneration = isNewTrip || (tripDoc.exists && tripDoc.data().needsRegeneration);

      // Log the tripToSave object for debugging
      console.log('TripToSave:', tripToSave);

      // Save trip to Firestore
      await tripRef.set(tripToSave, { merge: true });

      console.log('Lat/Lng:', latitude, longitude);

      // Generate attractions and itinerary if needed
      if (needsRegeneration) {
        // Fetch attractions
        const placesResponse = await fetch(`https://openai-proxy-gilt-three.vercel.app/api/places?lat=${latitude}&lng=${longitude}&startDate=${tripToSave.startDate.toDate().toISOString().split('T')[0]}&endDate=${tripToSave.endDate.toDate().toISOString().split('T')[0]}&uid=${user.uid}&tripId=${effectiveTripId}`);
        if (!placesResponse.ok) {
          const errorText = await placesResponse.text();
          throw new Error(`Attractions API failed: ${errorText}`);
        }
        const placesData = await placesResponse.json();
        const attractions = placesData.results || [];

        // Save attractions to Firestore
        await tripRef.update({ attractions, attractionsFetchedAt: Date.now() });

        // Generate itinerary
        const itineraryResponse = await fetch(`https://openai-proxy-gilt-three.vercel.app/api/generate-itinerary?lat=${latitude}&lng=${longitude}&tripId=${effectiveTripId}&uid=${user.uid}&startDate=${tripToSave.startDate.toDate().toISOString().split('T')[0]}&endDate=${tripToSave.endDate.toDate().toISOString().split('T')[0]}`);
        if (!itineraryResponse.ok) {
          const errorText = await itineraryResponse.text();
          throw new Error(`Itinerary API failed: ${errorText}`);
        }
        const itineraryData = await itineraryResponse.json();
        tripToSave.itinerary = itineraryData.itinerary;
        await tripRef.update({ itinerary: itineraryData.itinerary, itineraryFetchedAt: Date.now() });
        await tripRef.update({ needsRegeneration: false });
        const savedTrip = await tripRef.get();
        console.log("✅ Trip final content after save:", savedTrip.data());
      }

      // Generate fun facts in background
      generateAiPlanInBackground(tripToSave, effectiveTripId);

      // Navigate
      resetTrip();
      navigation.navigate(SCREEN.TRIPDETAILS, { tripId: effectiveTripId });

    } catch (error) {
      console.error("❌ Error saving trip:", error.message);
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
          <View style={styles.headlineContainer}>
            <Pressable style={styles.iconWrapper} onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
              navigation.goBack();
            }}>
              <SVG.BackIcon fill="black" />
            </Pressable>

            <View style={styles.centerWrapper}>
              <Label style={styles.stepText}>Step {currentStep} of {totalSteps}</Label>
              <ProgressBar
                progress={progress}
                width={wp(40)}
                height={hp(0.5)}
                color={COLOR.primary}
                borderRadius={5}
              />
            </View>

            <Pressable
              style={styles.iconWrapper}
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
                tripId
                  ? navigation.navigate(SCREEN.TRIPDETAILS, { tripId })
                  : navigation.navigate(SCREEN.TRIPS);
              }}
            >
              <SVG.Close fill="black" />
            </Pressable>
          </View>

          <Label style={styles.titleText}>{En.additionalTitle}</Label>

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
    color: COLOR.gray
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
  iconWrapper: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerWrapper: {
    flex: 1,
    alignItems: 'center',
  },
});