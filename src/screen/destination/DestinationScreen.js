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

// Fallback list of major cities to ensure they're included in search results
const MAJOR_CITIES = [
  { id: 'major_paris_fr', city: 'Paris', country: 'France', population: 2148000, type: 'CITY' },
  { id: 'major_rome_it', city: 'Rome', country: 'Italy', population: 2873000, type: 'CITY' },
  { id: 'major_london_uk', city: 'London', country: 'United Kingdom', population: 8982000, type: 'CITY' },
  { id: 'major_newyork_us', city: 'New York', country: 'United States', population: 8336000, type: 'CITY' },
  { id: 'major_tokyo_jp', city: 'Tokyo', country: 'Japan', population: 37400068, type: 'CITY' },
];

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

  const currentStep = 1;
  const totalSteps = 7;
  const progress = currentStep / totalSteps;

  useEffect(() => {
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
        });
    } else {
      setLocalDestination('');
      setLocalCountry('');
      setIsValidDestination(false);
    }
  }, [tripId, user.uid]);

  const getCities = async (searchQuery) => {
    try {
      // Fetch cities from the API
      const response = await axios.get(`https://openai-proxy-gilt-three.vercel.app/api/cities?namePrefix=${searchQuery}`);
      let filteredCities = response.data.data.filter(city => city.type === 'CITY');

      // Combine API results with major cities
      const searchQueryLower = searchQuery.toLowerCase();
      const matchingMajorCities = MAJOR_CITIES.filter(city =>
        city.city.toLowerCase().startsWith(searchQueryLower)
      );

      // Merge and sort by population (descending) to prioritize major cities
      const allCities = [...matchingMajorCities, ...filteredCities];
      allCities.sort((a, b) => (b.population || 0) - (a.population || 0));

      // Remove duplicates (prefer major cities)
      const uniqueCities = [];
      const seen = new Set();
      for (const city of allCities) {
        const key = `${city.city}-${city.country}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueCities.push(city);
        }
      }

      setSuggestions(uniqueCities);
    } catch (error) {
      console.error('🌍 Fehler beim Abrufen der Städte (Proxy):', error);
      // Fallback to major cities if API fails
      const searchQueryLower = searchQuery.toLowerCase();
      const matchingMajorCities = MAJOR_CITIES.filter(city =>
        city.city.toLowerCase().startsWith(searchQueryLower)
      );
      setSuggestions(matchingMajorCities);
    }
  };

  const handleClose = () => {
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
    setLocalCountry(city.country || '');
    setIsValidDestination(true);
    setSuggestions([]);
    Keyboard.dismiss();
  };

  const handleSaveDestination = async () => {
    if (!localDestination) return;

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
    if (!isValidDestination) return;
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
            <Pressable onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
              resetTrip();
              setIsValidDestination(false);
              if (tripId) {
                navigation.navigate(SCREEN.TRIPDETAILS, { tripId });
              } else {
                navigation.navigate(SCREEN.TRIPS);
              }
            }}>
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
              { backgroundColor: isValidDestination ? COLOR.primary : '#CCCCCC' }
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
  suggestionItem: {
    backgroundColor: COLOR.lightBlue,
    padding: 10,
    marginVertical: 2,
    borderRadius: 5,
    shadowColor: '#000',
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