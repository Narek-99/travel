import {
  SafeAreaView,
  StyleSheet,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Pressable,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { Button, Label } from '../../components';
import { En } from '../../locales/En';
import { COLOR, hp, wp, TEXT_STYLE } from '../../enums/StyleGuide';
import { SCREEN } from '../../enums/AppEnums';
import axios from 'axios';
import ProgressBar from 'react-native-progress/Bar';
import { SVG } from '../../assets/svgs';
import { useTripStore } from '../../store/tripStore';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import Toast from 'react-native-toast-message';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

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
  const [initialDestination, setInitialDestination] = useState(tripData.destination || '');

  const currentStep = 1;
  const totalSteps = 7;
  const progress = currentStep / totalSteps;

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch(
          'https://openai-proxy-gilt-three.vercel.app/api/get-google-api-key'
        );
        const { apiKey } = await response.json();
        setGoogleApiKey(apiKey);
      } catch (error) {
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

  useEffect(() => {
    if (!user?.uid) return;

    if (tripId) {
      firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .get()
        .then((doc) => {
          if (doc.exists) {
            const { destination, country, region } = doc.data();
            setLocalDestination(destination || '');
            setLocalCountry(country || '');
            setInitialDestination(destination || '');
            setIsValidDestination(!!destination);
            if (region) {
              setTripData({ region });
            }
          }
        })
        .catch((error) => {
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
      setInitialDestination('');
      setIsValidDestination(false);
    }
  }, [tripId, user?.uid, setTripData]);

  const getCities = async (searchQuery) => {
    if (!googleApiKey) {
      Toast.show({
        type: 'error',
        text1: 'Search Error',
        text2: 'API key missing. Please try again later.',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    if (isLoadingSuggestions) return;

    setIsLoadingSuggestions(true);
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json`,
        {
          params: {
            input: searchQuery,
            types: '(cities)',
            key: googleApiKey,
            language: 'en',
          },
        }
      );

      const predictions = response?.data?.predictions || [];
      const cities = await Promise.all(
        predictions.map(async (prediction) => {
          const detailsResponse = await axios.get(
            `https://maps.googleapis.com/maps/api/place/details/json`,
            {
              params: {
                place_id: prediction.place_id,
                fields: 'address_components,geometry',
                key: googleApiKey,
                language: 'en',
              },
            }
          );

          const detailsStatus = detailsResponse?.data?.status;
          const detailsResult = detailsResponse?.data?.result;

          if (detailsStatus !== 'OK' || !detailsResult) {
            return null;
          }

          const addressComponents = detailsResult.address_components || [];
          const geometry = detailsResult.geometry;
          let city = '';
          let country = '';

          for (const component of addressComponents) {
            if (component.types.includes('locality')) {
              city = component.long_name;
            } else if (component.types.includes('country')) {
              country = component.long_name;
            }
          }

          const latitude = geometry?.location?.lat;
          const longitude = geometry?.location?.lng;

          if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            return null;
          }

          return {
            id: prediction.place_id,
            city: city || prediction?.structured_formatting?.main_text,
            country: country || 'Unknown',
            type: 'CITY',
            latitude,
            longitude,
          };
        })
      );

      const validCities = cities
        .filter((city) => city && city.city && city.latitude && city.longitude)
        .slice(0, 5);

      setSuggestions(validCities);
    } catch (error) {
      setSuggestions([]);
      Toast.show({
        type: 'error',
        text1: 'Search Error',
        text2: 'Unable to fetch city suggestions or coordinates. Please try again.',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleClose = () => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    if (tripId) {
      navigation.navigate(SCREEN.TRIPDETAILS, { tripId });
    } else {
      resetTrip();
      navigation.navigate(SCREEN.TRIPS);
    }
  };

  const handleCitySelect = (city) => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    setLocalDestination(city.city);
    setLocalCountry(city.country);
    setIsValidDestination(true);
    setSuggestions([]);
    Keyboard.dismiss();

    setTripData({
      region: {
        latitude: city.latitude,
        longitude: city.longitude,
      },
    });
  };

  const handleSaveDestination = async () => {
    if (
      !localDestination ||
      !user?.uid ||
      !tripData.region?.latitude ||
      !tripData.region?.longitude
    ) {
      Toast.show({
        type: 'error',
        text1: 'Missing Data',
        text2: 'Destination or coordinates are missing. Please select a valid city.',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    try {
      const needsRegeneration = localDestination !== initialDestination;
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .set(
          {
            destination: localDestination,
            country: localCountry,
            region: {
              latitude: tripData.region.latitude,
              longitude: tripData.region.longitude,
            },
            updatedAt: firestore.FieldValue.serverTimestamp(),
            attractions: [],
            attractionsFetchedAt: needsRegeneration ? null : firestore.FieldValue.serverTimestamp(),
            itinerary: [],
            itineraryFetchedAt: needsRegeneration ? null : firestore.FieldValue.serverTimestamp(),
            needsRegeneration: needsRegeneration,
            funFacts: needsRegeneration ? [] : firestore.FieldValue.delete(),
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
      Toast.show({
        type: 'error',
        text1: 'Save Error',
        text2: 'Failed to save destination. Please try again.',
        position: 'bottom',
        visibilityTime: 3000,
      });
    }
  };

  const handleNext = () => {
    if (!isValidDestination || !tripData.region?.latitude || !tripData.region?.longitude) {
      Toast.show({
        type: 'error',
        text1: 'Missing Data',
        text2: 'Destination or coordinates are missing. Please select a valid city.',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }
    setTripData({
      destination: localDestination,
      country: localCountry,
    });
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate(SCREEN.DATES, { tripId });
  };

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

          <View style={styles.headlineContainer}>
            <Pressable
              style={styles.iconWrapper}
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
                resetTrip();
                setIsValidDestination(false);
                navigation.goBack();
              }}
            >
              <SVG.BackIcon fill="black" />
            </Pressable>

            <View style={styles.centerWrapper}>
              <Label style={styles.stepText}>
                Step {currentStep} of {totalSteps}
              </Label>
              <ProgressBar
                progress={progress}
                width={wp(40)}
                height={hp(0.5)}
                color={COLOR.primary}
                borderRadius={5}
              />
            </View>

            <Pressable style={styles.iconWrapper} onPress={handleClose}>
              <SVG.Close fill="black" />
            </Pressable>
          </View>

          <Label style={styles.titleText}>{En.DestinationScreenTitle}</Label>
          <Label style={styles.subtitleText}>{En.DestinationScreenSubtitle}</Label>

          <View style={styles.dropdownWrapper}>
            <View style={styles.inputContainer}>
              <SVG.Search width={18} height={18} fill="#8E8E93" style={styles.searchIcon} />
              <TextInput
                style={styles.input}
                placeholder="Search for a city..."
                placeholderTextColor="#8E8E93"
                value={`${localDestination}${localCountry ? ', ' + localCountry : ''}`}
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
                      <Label style={styles.dropdownItemText}>
                        {item.city}, {item.country}
                      </Label>
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
              textStyle={[{ color: COLOR.primary }]}
              text={En.save}
              onPress={handleSaveDestination}
              disabled={
                !localDestination ||
                !isValidDestination ||
                !tripData.region?.latitude ||
                !tripData.region?.longitude
              }
            />
          )}
          <Button
            style={styles.nextButton}
            text={En.next}
            textStyle={styles.buttonText}
            onPress={handleNext}
            disabled={
              !isValidDestination || !tripData.region?.latitude || !tripData.region?.longitude
            }
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
    color: COLOR.gray,
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
    marginVertical: hp(2),
    paddingHorizontal: wp(3),
  },
  centerWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: hp(2),
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
