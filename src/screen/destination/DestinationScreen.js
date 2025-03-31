import { SafeAreaView, StyleSheet, View, TextInput, FlatList, TouchableOpacity, Pressable } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Button, Label } from '../../components';
import { En } from '../../locales/En';
import { COLOR, hp, wp, TEXT_STYLE } from '../../enums/StyleGuide';
import { SCREEN } from '../../enums/AppEnums';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import axios from 'axios';
import ProgressBar from 'react-native-progress/Bar';
import { SVG } from '../../assets/svgs';
import { useTripStore } from '../../store/tripStore';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import Toast from 'react-native-toast-message';

const hapticOptions = {
  enableVibrateFallback: true,
};

const DestinationScreen = ({ navigation }) => {
  const { tripData, setTripData } = useTripStore();
  const user = useSelector(({ appReducer }) => appReducer.user);
  const route = useRoute();
  const tripId = route.params?.tripId;

  const [destination, setDestination] = useState(tripData.destination || '');
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  const currentStep = 1;
  const totalSteps = 8;
  const progress = currentStep / totalSteps;

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
          setDestination(data.destination);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Trip-Daten:', error);
      }
    };

    loadTripData();
  }, [tripId]);

  const getCities = async (searchQuery) => {
    try {
      const response = await axios.get('https://openai-proxy-gilt-three.vercel.app/api/cities?namePrefix=' + searchQuery);
      const filteredCities = response.data.data.filter(city => city.type === 'CITY' && Number(city.population) > 5000);
      setSuggestions(filteredCities);
    } catch (error) {
      console.error('🌍 Fehler beim Abrufen der Städte (Proxy):', error);
      setSuggestions([]);
    }
  };

  const handleCitySelect = (city) => {
    setDestination(city.city);
    setTripData({ destination: city.city });
    setSuggestions([]);
  };

  const handleSaveDestination = async () => {
    if (!destination) return;

    // Update destination in Firestore
    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .update({ destination });

      Toast.show({
        visibilityTime: 2000,
        type: 'success',
        text1: 'Destination Updated',
        position: 'top',
      });

    } catch (error) {
      console.error('Error updating destination:', error);
      Toast.show({
        type: 'error',
        position: 'bottom',
        text1: 'Failed to update destination',
        visibilityTime: 4000,
      });
    }
  };

  const handleNext = () => {
    if (!destination) return;
    setTripData({ destination });
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate(SCREEN.DATES, { tripId })
  };

  const handleInputChange = (text) => {
    setDestination(text);

    // Clear previous timer if it exists
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer to debounce the API call
    const timer = setTimeout(() => {
      if (text.length >= 3) {
        getCities(text);
      } else {
        setSuggestions([]);
      }
    }, 300); // Delay in ms

    setDebounceTimer(timer);
  };

  return (
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
          <Pressable onPress={() => {
            navigation.navigate(SCREEN.TRIPS);
            setDestination('');
          }}>
            <SVG.BackIcon fill="black" />
          </Pressable>
          <Label style={styles.titleText}>{En.DestinationScreenTitle}</Label>

          <View style={{ flex: 1 }} />
          <Pressable onPress={() => {
            if (tripId) {
              navigation.navigate(SCREEN.TRIPDETAILS, { tripId: tripId });
            } else {
              navigation.navigate(SCREEN.TRIPS)
            }
            setDestination('');
          }
          }
          >
            <SVG.Close fill="black" />
          </Pressable>
        </View>

        <Label style={styles.subtitleText}>{En.DestinationScreenSubtitle}</Label>

        <TextInput
          style={styles.input}
          placeholder="Example: Barcelona"
          placeholderTextColor={COLOR.black}
          value={destination}
          onChangeText={handleInputChange}
        />

        {suggestions.length > 0 && (
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleCitySelect(item)}>
                <View style={styles.suggestionItem}>
                  <Label style={styles.suggestionText}>{item.city}</Label>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      <View style={styles.submitContainer}>
        {tripId && (
          <Button
            style={styles.saveButton}
            text={En.save}
            onPress={handleSaveDestination}
            disabled={!destination}
          />
        )}
        <Button
          style={styles.nextButton}
          text={En.next}
          textStyle={styles.buttonText}
          onPress={handleNext}
          disabled={!destination}>
        </Button>
      </View>
    </View>
  );
};

export default DestinationScreen;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLOR.white,
  },
  contentContainer: {
    paddingTop: "8%",
    paddingHorizontal: '5%',
  },
  titleText: {
    ...TEXT_STYLE.title,
    color: COLOR.black,
    lineHeight: hp(5),
    marginVertical: hp(2),
  },
  subtitleText: {
    ...TEXT_STYLE.textMedium,
  },
  input: {
    height: 50,
    borderColor: COLOR.black,
    borderWidth: 0.5,
    borderRadius: 10,
    paddingHorizontal: wp(3),
    marginVertical: hp(2),
    color: 'black',
  },
  suggestionItem: {
    backgroundColor: COLOR.lightBlue,
    padding: 10,
    marginVertical: 2,
    borderRadius: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.125,
  },
  suggestionText: {
    color: '#333',
  },
  nextButton: {
    backgroundColor: '#002953',
    marginHorizontal: wp(2),
  },
  saveButton: {
    backgroundColor: 'transparent',
    marginHorizontal: wp(2),
    borderWidth: 1,
    borderColor: COLOR.lightBlue
  },
  buttonText: {
    color: 'white',
  },
  saveButton: {
    backgroundColor: 'transparent',
    marginHorizontal: wp(2),
    borderWidth: 1,
    borderColor: COLOR.lightBlue
  },
  stepIndicatorContainer: {
    alignItems: 'center',
    marginBottom: hp(2),
  },
  stepText: {
    ...TEXT_STYLE.textSmall,
    color: COLOR.black,
    marginBottom: hp(1)
  },
  headlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // Align items on both ends
    width: '100%', // Ensure the container takes full width
    paddingHorizontal: 10, // Optional: for inner spacing
  },
  submitContainer: {
    justifyContent: 'flex-end',
    marginTop: 'auto',
    width: '100%',
    paddingHorizontal: wp(2),
    marginBottom: hp(2),
  }
});