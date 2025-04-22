import { SafeAreaView, StyleSheet, View, TextInput, FlatList, TouchableOpacity, Pressable, TouchableWithoutFeedback, Keyboard } from 'react-native';
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
  const { tripData, setTripData, resetTrip } = useTripStore();
  const user = useSelector(({ appReducer }) => appReducer.user);
  const route = useRoute();
  const tripId = route.params?.tripId;

  const [isValidDestination, setIsValidDestination] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [localDestination, setLocalDestination] = useState(tripData.destination || '');
  const [localCountry, setLocalCountry] = useState(tripData.country || '');
  const [googleApiKey, setGoogleApiKey] = useState(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const currentStep = 1;
  const totalSteps = 7;
  const progress = currentStep / totalSteps;

  // Fetch Google API key on component mount
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch('https://openai-proxy-gilt-three.vercel.app/api/get-google-api-key');
        const { apiKey } = await response.json();
        setGoogleApiKey(apiKey);
      } catch (error) {
        console.error('Failed to fetch Google API key:', error);
        Toast.show({
          type: 'error',
          text1: 'Search Error',
          text2: 'Unable to load city search. Please try again later.',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    };
    fetchApiKey();
  }, []);

  // Load trip data if editing an existing trip
  useEffect(() => {
    if (!user?.uid) {
      console.warn('User UID is undefined');
      return;
    }

    if (tripId) {
      firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .get()
        .then(doc => {
          if (doc.exists) {
            const { destination, country } = doc.data();
            setLocalDestination(destination || '');
            setLocalCountry(country || '');
            setIsValidDestination(!!destination);
          }
        })
        .catch(error => {
          console.error('Error loading trip data:', error);
          Toast.show({
            type: 'error',
            text1: 'Load Error',
            text2: 'Failed to load trip data. Please try again.',
            position: 'top',
            visibilityTime: 3000,
          });
        });
    } else {
      setLocalDestination('');
      setLocalCountry('');
      setIsValidDestination(false);
    }
  }, [tripId, user?.uid]);

  // Fetch city suggestions using Google Places API
  const getCities = async (searchQuery) => {
    if (!googleApiKey) {
      console.error('Google API key not available');
      Toast.show({
        type: 'error',
        text1: 'Search Error',
        text2: 'API key missing. Please try again later.',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    if (isLoadingSuggestions) return; // Prevent multiple simultaneous API calls

    setIsLoadingSuggestions(true);
    try {
      // Fetch city suggestions from Google Places Autocomplete API
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json`,
        {
          params: {
            input: searchQuery,
            types: '(cities)',
            key: googleApiKey,
            language: 'en', // Force English language for suggestions
          },
        }
      );

      const predictions = response.data.predictions;
      const cities = await Promise.all(
        predictions.map(async (prediction) => {
          // Fetch country details for each suggestion
          const detailsResponse = await axios.get(
            `https://maps.googleapis.com/maps/api/place/details/json`,
            {
              params: {
                place_id: prediction.place_id,
                fields: 'address_components',
                key: googleApiKey,
                language: 'en', // Force English language for details
              },
            }
          );

          const addressComponents = detailsResponse.data.result.address_components;
          let city = '';
          let country = '';

          for (const component of addressComponents) {
            if (component.types.includes('locality')) {
              city = component.long_name;
            } else if (component.types.includes('country')) {
              country = component.long_name;
            }
          }

          return {
            id: prediction.place_id,
            city: city || prediction.structured_formatting.main_text,
            country: country || 'Unknown',
            type: 'CITY',
          };
        })
      );

      // Filter out invalid entries and limit to 5 results
      const validCities = cities.filter(city => city.city && city.country !== 'Unknown').slice(0, 5);
      setSuggestions(validCities);
    } catch (error) {
      console.error('Error fetching cities from Google Places API:', error);
      setSuggestions([]);
      Toast.show({
        type: 'error',
        text1: 'Search Error',
        text2: 'Unable to fetch city suggestions. Please try again.',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Navigate back to Trip Details or Trips screen
  const handleClose = () => {
    if (tripId) {
      navigation.navigate(SCREEN.TRIPDETAILS, { tripId });
    } else {
      resetTrip();
      navigation.navigate(SCREEN.TRIPS);
    }
  };

  // Handle city selection from suggestions
  const handleCitySelect = (city) => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    setLocalDestination(city.city);
    setLocalCountry(city.country);
    setIsValidDestination(true);
    setSuggestions([]);
    Keyboard.dismiss();
  };

  // Save destination to Firestore
  const handleSaveDestination = async () => {
    if (!localDestination || !user?.uid) return;

    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .set(
          {
            destination: localDestination,
            country: localCountry,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      Toast.show({
        visibilityTime: 2000,
        type: 'success',
        text1: 'Success',
        text2: 'Destination updated successfully.',
        position: 'top',
      });
    } catch (error) {
      console.error('Error updating destination:', error);
      Toast.show({
        type: 'error',
        text1: 'Save Error',
        text2: 'Failed to save destination. Please try again.',
        position: 'bottom',
        visibilityTime: 3000,
      });
    }
  };

  // Navigate to the next screen (Dates)
  const handleNext = () => {
    if (!isValidDestination) return;
    setTripData({
      destination: localDestination,
      country: localCountry,
    });
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate(SCREEN.DATES, { tripId });
  };

  // Handle input changes with debouncing
  const handleInputChange = (text) => {
    setLocalDestination(text);
    setLocalCountry('');
    setIsValidDestination(false);

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      if (text.length >= 2) {
        getCities(text);
      } else {
        setSuggestions([]);
      }
    }, 300);

    setDebounceTimer(timer);
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
            <Pressable
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
                resetTrip();
                setIsValidDestination(false);
                navigation.goBack();
              }}
            >
              <SVG.BackIcon fill="black" />
            </Pressable>
            <Label style={styles.titleText}>{En.DestinationScreenTitle}</Label>
            <View style={{ flex: 1 }} />
            <Pressable onPress={handleClose}>
              <SVG.Close fill="black" />
            </Pressable>
          </View>

          <Label style={styles.subtitleText}>{En.DestinationScreenSubtitle}</Label>

          <View style={styles.dropdownWrapper}>
            <View style={styles.inputContainer}>
              <SVG.Search width={18} height={18} fill="#8E8E93" style={styles.searchIcon} />
              <TextInput
                style={styles.input}
                placeholder="Search for a city..."
                placeholderTextColor="#8E8E93"
                value={localDestination}
                onChangeText={handleInputChange}
                accessibilityLabel="Search for a city"
              />
            </View>

            {suggestions.length > 0 && (
              <View style={styles.dropdown}>
                <FlatList
                  data={suggestions}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => handleCitySelect(item)}
                    >
                      <Label style={styles.dropdownItemText}>{item.city}, {item.country}</Label>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>
        </View>

        <View style={styles.submitContainer}>
          {tripId && (
            <Button
              style={styles.saveButton}
              text={En.save}
              onPress={handleSaveDestination}
              disabled={!localDestination || !isValidDestination}
            />
          )}
          <Button
            style={[
              styles.nextButton,
              { backgroundColor: isValidDestination ? COLOR.primary : '#CCCCCC' },
            ]}
            text={En.next}
            textStyle={styles.buttonText}
            onPress={handleNext}
            disabled={!isValidDestination}
          />
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default DestinationScreen;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLOR.white,
  },
  contentContainer: {
    paddingTop: '8%',
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEEEF0',
    borderRadius: wp(3),
    marginVertical: hp(2),
    paddingHorizontal: wp(2.5),
  },
  searchIcon: {
    marginRight: wp(1.5),
  },
  input: {
    flex: 1,
    height: 44,
    color: 'black',
    fontSize: 17,
    backgroundColor: 'transparent',
  },
  nextButton: {
    marginHorizontal: wp(2),
  },
  saveButton: {
    backgroundColor: 'transparent',
    marginHorizontal: wp(2),
    borderWidth: 1,
    borderColor: COLOR.lightBlue,
  },
  buttonText: {
    color: 'white',
  },
  stepIndicatorContainer: {
    alignItems: 'center',
    marginBottom: hp(2),
  },
  stepText: {
    ...TEXT_STYLE.textSmall,
    color: COLOR.black,
    marginBottom: hp(1),
  },
  headlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  submitContainer: {
    justifyContent: 'flex-end',
    marginTop: 'auto',
    width: '100%',
    paddingHorizontal: wp(2),
    marginBottom: hp(2),
  },
  dropdownWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowOffset: { width: 4, height: 2 },
    shadowOpacity: 0.1,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: wp(2),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    color: '#222',
    fontSize: 16,
  },
});