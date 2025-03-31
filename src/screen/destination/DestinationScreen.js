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
  const { tripData, setTripData, resetTrip } = useTripStore();
  const user = useSelector(({ appReducer }) => appReducer.user);
  const route = useRoute();
  const tripId = route.params?.tripId;

  const [isValidDestination, setIsValidDestination] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [localDestination, setLocalDestination] = useState(tripData.destination || '');

  const currentStep = 1;
  const totalSteps = 8;
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
            const destination = doc.data().destination;
            setLocalDestination(destination);
            setIsValidDestination(!!destination); // ✅ HIER: Aktiviert den Button
          }
        });
    } else {
      setLocalDestination('');
      setIsValidDestination(false); // Sicherstellen, dass Button deaktiviert ist bei neuem Trip
    }
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

  const handleClose = () => {
    if (tripId) {
      navigation.navigate(SCREEN.TRIPDETAILS, { tripId }); // zurück zum Detail
    } else {
      resetTrip(); // Trip-Daten löschen
      navigation.navigate(SCREEN.TRIPS); // zurück zur Übersicht
    }
  };

  const handleCitySelect = (city) => {
    setLocalDestination(city.city);
    setIsValidDestination(true);
    setSuggestions([]);
  };

  const handleSaveDestination = async () => {
    if (!localDestination) return;

    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .update({ destination: localDestination }); // ✅ nutze localDestination

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
    setTripData({ destination: localDestination }); // jetzt wird’s in den Store übernommen
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate(SCREEN.DATES, { tripId });
  };

  const handleInputChange = (text) => {
    setLocalDestination(text);
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
            resetTrip();
            setIsValidDestination(false);
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
          <TextInput
            style={styles.input}
            placeholder="Search for a city..."
            placeholderTextColor="#999"
            value={localDestination}
            onChangeText={handleInputChange}
          />

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
                    <Label style={styles.dropdownItemText}>{item.city}</Label>
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
            disabled={!localDestination}
          />
        )}
        <Button
          style={[
            styles.nextButton,
            { backgroundColor: isValidDestination ? '#002953' : '#CCCCCC' } // Use isValidDestination to determine button color
          ]}
          text={En.next}
          textStyle={styles.buttonText}
          onPress={handleNext}
          disabled={!isValidDestination} // Use isValidDestination to enable/disable button
        />
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