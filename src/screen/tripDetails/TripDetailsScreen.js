import React, { useEffect, useState, useRef, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, ScrollView, Share, Image, Text, Linking, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import { Label, AppHeader } from '../../components';
import { COLOR, TEXT_STYLE, hp, wp } from '../../enums/StyleGuide';
import { SCREEN } from '../../enums/AppEnums';
import { SVG } from '../../assets/svgs';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import MapView, { Marker, Callout } from 'react-native-maps';
import Geocoder from 'react-native-geocoding';
import Toast from 'react-native-toast-message';
import Clipboard from '@react-native-clipboard/clipboard';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import RBSheet from 'react-native-raw-bottom-sheet';

const TripDetailsScreen = ({ navigation }) => {
  const useFadeIn = () => {
    const opacity = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, []);
    return opacity;
  };

  const route = useRoute();
  const user = useSelector(({ appReducer }) => appReducer.user);
  const { tripId } = route.params;
  const [region, setRegion] = useState(null);
  const scrollViewRef = useRef();
  const [trip, setTrip] = useState(null);
  const [previousTrip, setPreviousTrip] = useState(null);
  const [attractions, setAttractions] = useState([]);
  const [loadingAttractions, setLoadingAttractions] = useState(true);
  const [loadingMap, setLoadingMap] = useState(true);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const infoFadeAnim = useFadeIn();
  const mapFadeAnim = useFadeIn();
  const attractionsFadeAnim = useFadeIn();
  const [loadedImages, setLoadedImages] = useState({});
  const [tripImageUrl, setTripImageUrl] = useState(null);
  const bottomSheetRef = useRef(null);
  const fabScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(fabScale, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fabScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
  }, []);


  useEffect(() => {
    const fetchTripImage = async () => {
      try {
        const response = await fetch(`https://openai-proxy-gilt-three.vercel.app/api/unsplash?destination=${trip.destination}`);
        const data = await response.json();
        const imageUrl = data.results[0]?.urls?.small;
        setTripImageUrl(imageUrl);
      } catch (error) {
        console.error('Error fetching trip image:', error);
      }
    };
    if (trip?.destination) fetchTripImage();
  }, [trip?.destination]);

  const handleChatbotPress = () => {
    bottomSheetRef.current?.close();
    navigation.navigate(SCREEN.CHATBOT, { tripId });
  };

  useEffect(() => {
    if (!user?.uid || !tripId) return;
    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .collection('trips')
      .doc(tripId)
      .onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          setTrip(data);
        }
      }, (error) => console.error('❌ Fehler beim Live-Update des Trips:', error));
    return () => unsubscribe();
  }, [user?.uid, tripId]);

  useEffect(() => {
    if (!trip || !previousTrip) {
      setPreviousTrip(trip);
      return;
    }
    const criticalFieldsChanged =
      trip.destination !== previousTrip.destination ||
      getDateString(trip.startDate) !== getDateString(previousTrip.startDate) ||
      getDateString(trip.endDate) !== getDateString(previousTrip.endDate);
    if (criticalFieldsChanged) regenerateAiPlan();
    setPreviousTrip(trip);
  }, [trip]);

  useEffect(() => {
    const fetchApiKeyAndGeocode = async () => {
      setLoadingMap(true);
      try {
        const response = await fetch('https://openai-proxy-gilt-three.vercel.app/api/get-google-api-key');
        const { apiKey } = await response.json();
        Geocoder.init(apiKey);
        const json = await Geocoder.from(trip.destination);
        const location = json.results[0].geometry.location;
        setRegion({
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } catch (error) {
        console.error('❌ Geocoding failed:', error);
      } finally {
        setLoadingMap(false);
      }
    };
    if (trip?.destination) fetchApiKeyAndGeocode();
  }, [trip?.destination]);

  useEffect(() => {
    const fetchTripDetails = async () => {
      try {
        const snapshot = await firestore()
          .collection('users')
          .doc(user.uid)
          .collection('trips')
          .doc(tripId)
          .get();
        const data = snapshot.data();
        if (data) setTrip(data);
      } catch (error) {
        console.error('❌ Fehler beim Laden des Trips:', error);
      }
    };
    if (user?.uid && tripId) fetchTripDetails();
  }, [user?.uid, tripId]);

  const [weather, setWeather] = useState(null);
  const mapRef = React.useRef();

  const fetchAttractions = async () => {
    setLoadingAttractions(true);
    if (!region?.latitude || !region?.longitude) return;
    try {
      const response = await fetch(
        `https://openai-proxy-gilt-three.vercel.app/api/places?lat=${region.latitude}&lng=${region.longitude}`
      );
      const data = await response.json();
      setAttractions(data.results.slice(0, 10));
    } catch (err) {
      console.error('❌ Fehler beim Laden der Sehenswürdigkeiten:', err);
    } finally {
      setLoadingAttractions(false);
    }
  };

  useEffect(() => {
    fetchAttractions();
  }, [region]);

  const fetchWeather = async (lat, lon, date) => {
    setLoadingWeather(true);
    try {
      const tripDate = new Date(date);
      const today = new Date();
      const maxForecastDate = new Date(today.setDate(today.getDate() + 14));
      const useForecast = tripDate <= maxForecastDate;
      const url = `https://openai-proxy-gilt-three.vercel.app/api/weather?lat=${lat}&lon=${lon}${useForecast ? `&date=${date}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (useForecast && data?.forecast?.forecastday?.[0]) {
        const day = data.forecast.forecastday[0].day;
        setWeather({ condition: day.condition.text, icon: day.condition.icon, temp: day.avgtemp_c });
      } else if (data?.current) {
        setWeather({ condition: data.current.condition.text, icon: data.current.condition.icon, temp: data.current.temp_c });
      }
    } catch (err) {
      console.error('❌ Fehler beim Wetterabruf (Proxy):', err);
    } finally {
      setLoadingWeather(false);
    }
  };

  const createGoogleHotelsLink = (destination, numberOfPersons = 2) => {
    const destinationQuery = encodeURIComponent(destination);
    return `https://www.google.com/travel/hotels/search?destination=${destinationQuery}&adults=${numberOfPersons}`;
  };

  const handleOpenHotelAffiliateLink = async () => {
    if (!trip) return;
    try {
      const affiliateLink = createGoogleHotelsLink(trip.destination, trip.numberOfPersons || 2);
      Linking.openURL(affiliateLink);
    } catch (error) {
      console.error('❌ Error opening hotel link:', error);
      Toast.show({ type: 'error', text1: 'Failed to open hotel link' });
    }
  };

  const getDateString = (timestamp) => {
    if (!timestamp?.toDate) return '';
    return timestamp.toDate().toISOString().split('T')[0];
  };

  const getLimitedDateRange = (startDate, endDate, maxDays = 7) => {
    const start = startDate.toDate();
    const end = endDate.toDate();
    const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (duration <= maxDays) return { from: getDateString(startDate), to: getDateString(endDate) };
    const limitedEnd = new Date(start.setDate(start.getDate() + maxDays - 1));
    return { from: getDateString(startDate), to: getDateString({ toDate: () => limitedEnd }) };
  };

  useEffect(() => {
    if (region && trip?.startDate) fetchWeather(region.latitude, region.longitude, getDateString(trip.startDate));
  }, [region, trip?.startDate]);

  const regenerateAiPlan = async () => {
    if (!trip) return;
    const { from, to } = getLimitedDateRange(trip.startDate, trip.endDate);
    Toast.show({ type: 'info', text1: 'Let me create the best plan for you...', position: 'top' });
    await firestore().collection('users').doc(user.uid).collection('trips').doc(tripId).update({ aiPlan: null });

    const tripPrompt = `
      Create a highly personalized, clearly structured day-by-day travel itinerary based strictly on the user's provided preferences and trip details below.
      1. Provide a separate, clearly marked itinerary for EVERY SINGLE DAY of the trip, from **${from}** to **${to}**.
      2. Use this precise daily structure for each day (provide the response in Markdown):
      📅 Day [X]
      - 📍 Activity & Location: Specific location name and a brief description tailored exactly to user's preferences.
      - 🕒 Suggested defined time range (e.g., 9:00–12:00)
      - 💰 Budget-friendly tips (where applicable, based on user's selected budget).
      - 🥘 Recommended dining spots relevant to user's preferences.
      - 🏨 Recommended accommodations aligned with user's preferences (if applicable).
      - 🚶 Travel tips or local insights relevant to the itinerary.
      Repeat exactly this structured format for every single day of the trip.
      User’s Trip Details to Strictly Follow:
      - Destination: ${trip.destination}
      - Travel Dates: ${trip.startDate} to ${trip.endDate} (Provide itinerary for every day!)
      - Traveling with: ${trip.companion}, ${trip.persons || '1'} person(s)
      - Budget: ${trip.budget || 'medium'}
      - Preferred Activities: ${trip.activities?.join(', ') || 'no specific activities'}
      - Special Wishes: ${trip.wishes?.join(', ') || 'none'}
      - Accommodation Preferences: ${trip.accommodation?.join(', ') || 'no specific preferences'}
      - Preferred Location within Destination: ${trip.location?.join(', ') || 'no specific location'}
      - Additional Information: ${trip.additionalInfo || 'none'}
      Maintain a friendly, enthusiastic, and highly personalized tone throughout.
    `;
    try {
      const newPlan = await callChatGptForResponse(tripPrompt, "");
      await firestore().collection('users').doc(user.uid).collection('trips').doc(tripId).update({
        aiPlan: newPlan
      });
      setTrip(prev => ({ ...prev, aiPlan: newPlan }));
    } catch (error) {
      console.error('❌ Fehler beim Neugenerieren des Plans:', error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return '';
    return timestamp.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getCompanionEmoji = (companion) => {
    switch ((companion || '').toLowerCase()) {
      case 'partner': return '❤️';
      case 'familie': case 'family': return '👨‍👩‍👧‍👦';
      case 'freunde': case 'friends': return '🧑‍🤝‍🧑';
      case 'kollegen': case 'colleagues': return '💼';
      case 'allein': case 'alone': return '👤';
      default: return '👥';
    }
  };

  const handleOptionsPress = useCallback(() => {
    if (bottomSheetRef.current) {
      bottomSheetRef.current.open();
    } else console.error('RBSheet ref is not initialized');
  }, []);

  const handleEditTripPress = () => {
    navigation.navigate(SCREEN.DESTINATION, { tripId });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView />
      <AppHeader
        leftComp={
          <TouchableOpacity onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true }); navigation.navigate(SCREEN.TRIPS);
          }}>
            <SVG.BackIcon fill={COLOR.dark} />
          </TouchableOpacity>}
        title={trip?.destination || 'Trip Details'}
        titleStyle={{ ...TEXT_STYLE.smallTitleBold, color: COLOR.dark }}
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ paddingTop: hp(1), paddingBottom: hp(8) }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {loadingWeather ? (
          <SkeletonPlaceholder borderRadius={10}>
            <View style={styles.infoCard}><View style={{ width: 180, height: 25, marginBottom: 10 }} /><View style={{ width: 120, height: 18, marginBottom: 8 }} /><View style={{ width: 160, height: 18 }} /></View>
          </SkeletonPlaceholder>
        ) : trip ? (
          <View style={styles.infoCardWithImage}>
            <FastImage source={{ uri: tripImageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            <LinearGradient
              colors={['rgba(0, 0, 0, 1)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.infoContent}>
              <Animated.View
                style={
                  [styles.infoTextContainer, { opacity: infoFadeAnim }]
                }
              >
                <Label style={styles.infoDestination}>
                  {trip.destination}
                </Label>
                <Label style={styles.infoDate}>
                  {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                </Label>
                {weather &&
                  <View style={styles.infoRow}>
                    <Label style={styles.weatherIcon}>🌤</Label>
                    <Label style={styles.infoText}>{weather.condition} · {weather.temp}°C</Label>
                  </View>}
                <View style={styles.infoRow}>
                  <Label style={styles.weatherIcon}>{getCompanionEmoji(trip.companion)}</Label>
                  <Label style={styles.infoText}>{trip.companion} · {trip.numberOfPersons || '1'} person</Label>
                </View>
              </Animated.View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditTripPress}>
                <SVG.Edit fill={COLOR.white} width={20} height={20} />
              </TouchableOpacity>
            </View>
          </View>
        ) : <Text style={styles.loadingText}>Loading trip details...</Text>}
        {loadingMap ? (
          <SkeletonPlaceholder borderRadius={10}>
            <View style={styles.map} />
          </SkeletonPlaceholder>
        ) : region && (
          <Animated.View style={{ opacity: mapFadeAnim }}>
            <View style={{ height: 250, marginBottom: hp(2) }}>
              <MapView ref={mapRef} style={StyleSheet.absoluteFillObject} provider="google" region={region} showsUserLocation showsMyLocationButton rotateEnabled>
                <Marker coordinate={region} title={trip.destination} />
                {attractions.map((place, index) => (
                  <Marker key={index} coordinate={{ latitude: place.geometry.location.lat, longitude: place.geometry.location.lng }} title={place.name} description={place.vicinity}>
                    <Callout tooltip onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${place.place_id}`)}>
                      <View
                        style={{
                          backgroundColor: 'white',
                          paddingBottom: 10,
                          width: 200,
                          alignItems: 'center',
                          borderRadius: 8
                        }}>
                        {place.photos?.[0]?.photo_reference ? <Image source={{ uri: `https://openai-proxy-gilt-three.vercel.app/api/photo?photoReference=${place.photos[0].photo_reference}` }} style={{ width: 200, height: 100, borderRadius: 8 }} resizeMode="cover" /> : <Text>No Image</Text>}
                        <Text style={{ fontWeight: 'bold', marginTop: 8 }}>
                          {place.name}
                        </Text>
                        <Text
                          style={{ fontSize: 12, color: 'gray', textAlign: 'center' }}>{place.vicinity}</Text>
                        {place.opening_hours?.open_now !== undefined &&
                          <Text style={{ marginTop: 4, color: place.opening_hours.open_now ? 'green' : 'red', fontWeight: '600' }}>
                            {place.opening_hours.open_now ? 'Open Now' : 'Closed'}
                          </Text>}
                      </View>
                    </Callout>
                  </Marker>
                ))}
              </MapView>
            </View>
          </Animated.View>
        )}

        {loadingAttractions ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.attractionsContainer}
          >
            {[...Array(3)].map((_, index) => (
              <SkeletonPlaceholder
                key={index}
                borderRadius={16}>
                <View style={styles.attractionCard}>
                  <View style={styles.attractionImage} />
                  <View style={{ height: 16, width: '80%', marginTop: 8 }} />
                  <View style={{ height: 14, width: '60%', marginTop: 6 }} />
                  <View style={{ height: 14, width: '90%', marginTop: 6 }} />
                </View>
              </SkeletonPlaceholder>
            ))}
          </ScrollView>
        ) : (
          <Animated.View
            style={{ opacity: attractionsFadeAnim }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.attractionsContainer}>
              {attractions.map((place, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={1}
                  onPress={() => { const loc = place.geometry.location; mapRef.current?.animateToRegion({ latitude: loc.lat, longitude: loc.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 800); }} style={styles.attractionCard}>
                  {place.photos?.[0]?.photo_reference ?
                    <View style={{ position: 'relative' }}>
                      <FastImage
                        source={{ uri: `https://openai-proxy-gilt-three.vercel.app/api/photo?photoReference=${place.photos[0].photo_reference}`, priority: FastImage.priority.normal }}
                        style={styles.attractionImage}
                        resizeMode={FastImage.resizeMode.cover}
                        onLoadStart={() => setLoadedImages(prev => ({ ...prev, [place.place_id]: false }))}
                        onLoadEnd={() => setLoadedImages(prev => ({ ...prev, [place.place_id]: true }))} />
                      {!loadedImages[place.place_id] &&
                        <ActivityIndicator
                          style={{ position: 'absolute', top: 60, alignSelf: 'center' }}
                          size="small"
                          color={COLOR.dark}
                        />}
                    </View> : <View style={styles.noImageBox}>
                      <Text style={styles.noImageText}>Kein Bild</Text>
                    </View>}
                  <View style={styles.placeDetailsContainer}>
                    <Text style={styles.attractionName}>{place.name}</Text>
                    <Text style={styles.attractionRating}>
                      {place.types?.[0] ? (() => { const type = place.types[0].replace('_', ' '); return type.charAt(0).toUpperCase() + type.slice(1); })() : 'Attraction'}
                    </Text>
                    <Text style={styles.attractionRating}>⭐ {place.rating ?? '—'} – {place.user_ratings_total ?? 0} Reviews</Text>
                    <TouchableOpacity
                      onLongPress={() => {
                        Clipboard.setString(place.vicinity);
                        ReactNativeHapticFeedback.trigger('impactLight');
                        Toast.show({ type: 'success', text1: 'Address copied!' });
                      }}>
                      <Text style={styles.attractionAddress}>📍 {place.vicinity}</Text>
                    </TouchableOpacity>{place.opening_hours?.open_now !== undefined && <Text style={[styles.attractionStatus, { color: place.opening_hours.open_now ? 'green' : 'red' }]}>🕒 {place.opening_hours.open_now ? 'Open' : 'Closed'}</Text>}
                    <Text
                      style={styles.attractionLink}
                      onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${place.place_id}`)}>🔗 See on Google Maps</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}
      </ScrollView>

      <Animated.View
        style={
          [styles.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          onPress={handleOptionsPress}
          activeOpacity={0.8}
          style={styles.fabInner}
        >
          <SVG.Eagle width={28} height={28} />
        </TouchableOpacity>
      </Animated.View>

      <RBSheet
        ref={bottomSheetRef}
        useNativeDriver={false}
        draggable
        height={hp(50)}
        customStyles={{
          wrapper: { backgroundColor: 'transparent' },
          draggableIcon: { backgroundColor: COLOR.lightGray },
          container: {
            backgroundColor: COLOR.white,
            shadowColor: COLOR.black,
            shadowOffset: { width: 2, height: 12 },
            shadowOpacity: 0.58,
            shadowRadius: 16,
            elevation: 24,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }
        }}
        customModalProps={{
          animationType: 'slide',
          statusBarTranslucent: true
        }}
        customAvoidingViewProps={{ enabled: false }}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Trip Options</Text>
          <TouchableOpacity style={styles.sheetButton} onPress={handleChatbotPress}>
            <SVG.AiStar fill="#00A3FF" width={20} height={20} />
            <Text style={styles.sheetButtonText}>AI Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sheetButton} onPress={() => { bottomSheetRef.current?.close(); navigation.navigate(SCREEN.DAYBYDAY, { tripId }); }}>
            <Text style={styles.sheetButtonText}>📅  Day-by-Day Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sheetButton} onPress={() => { bottomSheetRef.current?.close(); handleOpenHotelAffiliateLink(); }}>
            <Text style={styles.sheetButtonText}>🏨  Hotels</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sheetButton} onPress={() => { bottomSheetRef.current?.close(); navigation.navigate(SCREEN.BOOKING, { tripId }); }}>
            <Text style={styles.sheetButtonText}>✈️  Flights</Text>
          </TouchableOpacity>
          {/* <TouchableOpacity style={styles.sheetButton} onPress={() => { bottomSheetRef.current?.close(); shareTrip(); }}>
            <Text style={styles.sheetButtonText}>🔗  Share Trip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sheetButton} onPress={() => { bottomSheetRef.current?.close(); regenerateAiPlan(); }}>
            <Text style={styles.sheetButtonText}>♻️  Regenerate Plan</Text>
          </TouchableOpacity> */}
        </View>
      </RBSheet>
    </View>
  );
};

export default TripDetailsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.white,
  },
  infoCard: {
    backgroundColor: COLOR.white,
    borderRadius: 10,
    padding: wp(4),
    margin: wp(5),
    marginBottom: 0,
    shadowColor: '#000',
    marginBottom: hp(2),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoDestination: {
    ...TEXT_STYLE.title,
    color: 'white',
    marginBottom: 4,
  },
  infoDate: {
    ...TEXT_STYLE.textSmall,
    color: 'white',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  infoText: {
    ...TEXT_STYLE.textSmall,
    color: 'white',
  },
  weatherIcon: {
    fontSize: 18,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  attractionsContainer: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(2),
  },
  attractionCard: {
    width: wp(64),
    marginRight: wp(4),
    backgroundColor: COLOR.white,
    borderRadius: 16,
    padding: wp(3),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  attractionImage: {
    width: '100%',
    height: 140,
    borderRadius: 12,
  },
  noImageBox: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    color: '#6b7280',
  },
  attractionName: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    color: COLOR.dark,
  },
  attractionRating: {
    fontSize: 14,
    color: COLOR.mediumGray,
  },
  placeDetailsContainer: {
    flexDirection: 'column',
    gap: hp(1),
    paddingTop: hp(1),
  },
  attractionLink: {
    color: '#0000EE',
  },
  infoCardWithImage: {
    height: hp(19),
    borderRadius: 10,
    marginHorizontal: wp(3),
    marginBottom: 20,
    overflow: 'hidden',
    backgroundColor: COLOR.white,
  },
  infoContent: {
    flex: 1,
    padding: 10,
    position: 'relative',
  },
  infoTextContainer: {
    flex: 1,
  },
  editButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(30, 58, 138, 0.8)',
    borderRadius: "50%",
    padding: wp(3),
  },
  sheetContent: {
    flex: 1,
    padding: wp(5),
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLOR.dark,
    marginBottom: hp(2),
    textAlign: 'center',
  },
  sheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    gap: wp(3),
    borderBottomWidth: 1,
    borderBottomColor: COLOR.lightGray,
  },
  sheetButtonText: {
    fontSize: 16,
    color: COLOR.dark,
  },
  fab: {
    position: 'absolute',
    bottom: hp(3),
    right: wp(3),
    width: 66,
    height: 66,
    borderRadius: 33,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },

  fabInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },

  loadingText: {
    textAlign: 'center',
    color: COLOR.dark,
    marginTop: hp(2),
  },
});