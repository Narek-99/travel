import React, { useEffect, useState, useRef, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, ScrollView, Image, Text, Linking, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
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
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import Clipboard from '@react-native-clipboard/clipboard';
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
  const [itinerary, setItinerary] = useState([]);
  const [loadingItinerary, setLoadingItinerary] = useState(true);
  const mapRef = useRef(null);
  const optionFadeAnims = Array(5).fill().map(() => useFadeIn());
  const [weather, setWeather] = useState(null);

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
        setTripImageUrl(data.results[0]?.urls?.small);
      } catch (error) { }
    };
    if (trip?.destination) fetchTripImage();
  }, [trip?.destination]);

  useEffect(() => {
    if (!user?.uid || !tripId) return;
    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .collection('trips')
      .doc(tripId)
      .onSnapshot(doc => {
        if (doc.exists) {
          setTrip(doc.data());
        }
      });
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
        Toast.show({ type: 'error', text1: 'Failed to load map' });
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
      } catch (error) { }
    };
    if (user?.uid && tripId) fetchTripDetails();
  }, [user?.uid, tripId]);

  const fetchAttractions = async () => {
    setLoadingAttractions(true);
    if (!region?.latitude || !region?.longitude) return;
    try {
      const response = await fetch(`https://openai-proxy-gilt-three.vercel.app/api/places?lat=${region.latitude}&lng=${region.longitude}`);
      const data = await response.json();
      setAttractions(data.results.slice(0, 15));
    } catch (err) {
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
      Toast.show({ type: 'error', text1: 'Failed to load weather' });
    } finally {
      setLoadingWeather(false);
    }
  };

  const regenerateItinerary = async () => {
    if (!trip || !region) {
      setLoadingItinerary(false);
      return;
    }

    setLoadingItinerary(true);
    const timeout = setTimeout(() => {
      if (loadingItinerary) {
        Toast.show({ type: 'error', text1: 'Itinerary fetch timed out' });
        setItinerary([]);
        setLoadingItinerary(false);
      }
    }, 15000);

    try {
      const url = `https://openai-proxy-gilt-three.vercel.app/api/generate-itinerary?lat=${region.latitude}&lng=${region.longitude}&tripId=${tripId}&startDate=${getDateString(trip.startDate)}&endDate=${getDateString(trip.endDate)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      if (data.itinerary && Array.isArray(data.itinerary)) {
        const allItems = data.itinerary.flatMap(day => (day.items || []));
        const validItems = allItems.filter(item =>
          item &&
          item.attraction &&
          typeof item.attraction.lat === 'number' &&
          typeof item.attraction.lng === 'number' &&
          item.attraction.name &&
          item.startTime &&
          item.endTime &&
          item.travelDistance &&
          item.travelDuration
        );

        if (validItems.length === 0) {
          throw new Error('No valid itinerary items found after validation');
        }

        setItinerary(allItems);
      } else {
        throw new Error('Invalid itinerary data received');
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to generate itinerary',
        text2: error.message,
      });
      setItinerary([]);
    } finally {
      clearTimeout(timeout);
      setLoadingItinerary(false);
    }
  };

  useEffect(() => {
    if (region && trip?.startDate) {
      fetchWeather(region.latitude, region.longitude, getDateString(trip.startDate));
      regenerateItinerary();
    }
  }, [region, trip?.startDate]);

  const getDateString = timestamp => {
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

  const regenerateAiPlan = async () => {
    if (!trip) return;
    const { from, to } = getLimitedDateRange(trip.startDate, trip.endDate);
    Toast.show({ type: 'info', text1: 'Let me create the best plan for you...', position: 'top' });
    await firestore()
      .collection('users')
      .doc(user.uid)
      .collection('trips')
      .doc(tripId)
      .update({ aiPlan: null, funFacts: [] });

    try {
      const [newPlan, funFactsResponse] = await Promise.all([
        callChatGptForResponse(getTripPrompt(trip, from, to), ''),
        callChatGptForResponse(getFunFactsPrompt(trip.destination), ''),
      ]);
      const funFacts = funFactsResponse.split('\n').filter(fact => fact.trim().match(/^\d+\./));
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .update({ aiPlan: newPlan, funFacts });
      setTrip(prev => ({ ...prev, aiPlan: newPlan, funFacts }));
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to regenerate plan or fun facts' });
    }
  };

  const formatDate = timestamp => {
    if (!timestamp?.toDate) return '';
    return timestamp.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getCompanionEmoji = companion => {
    switch ((companion || '').toLowerCase()) {
      case 'partner': return '❤️';
      case 'familie':
      case 'family': return '👨‍👩‍👧‍👦';
      case 'freunde':
      case 'friends': return '🧑‍🤝‍🧑';
      case 'kollegen':
      case 'colleagues': return '💼';
      case 'allein':
      case 'alone': return '👤';
      default: return '👥';
    }
  };

  const handleOptionsPress = useCallback(() => {
    bottomSheetRef.current?.open();
  }, []);

  const handleEditTripPress = () => {
    navigation.navigate(SCREEN.DESTINATION, { tripId });
  };

  const handleOptionPress = action => {
    ReactNativeHapticFeedback.trigger('impactLight');
    action();
  };

  const handleChatbotPress = () => {
    bottomSheetRef.current?.close();
    navigation.navigate(SCREEN.CHATBOT, { tripId });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView />
      <AppHeader
        leftComp={
          <TouchableOpacity
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
              navigation.navigate(SCREEN.TRIPS);
            }}>
            <SVG.BackIcon fill={COLOR.dark} />
          </TouchableOpacity>
        }
        title="Trip Details"
        titleStyle={{ ...TEXT_STYLE.smallTitleBold, color: COLOR.dark }}
      />

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {loadingWeather ? (
          <SkeletonPlaceholder borderRadius={10}>
            <View style={styles.infoCard}>
              <View style={{ width: 180, height: 25, marginBottom: 10 }} />
              <View style={{ width: 120, height: 18, marginBottom: 8 }} />
              <View style={{ width: 160, height: 18 }} />
            </View>
          </SkeletonPlaceholder>
        ) : trip ? (
          <View style={styles.infoCardWithImage}>
            <FastImage source={{ uri: tripImageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            <LinearGradient colors={['rgba(0, 0, 0, 1)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
            <View style={styles.infoContent}>
              <Animated.View style={[styles.infoText, { opacity: infoFadeAnim }]}>
                <Label style={styles.infoDestination}>{trip.destination}</Label>
                <Label style={styles.infoDate}>
                  {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                </Label>
                {weather && (
                  <View style={styles.infoRow}>
                    <Label style={styles.weatherIcon}>🌤</Label>
                    <Label style={styles.infoText}>
                      {weather.condition} · {weather.temp}°C
                    </Label>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Label style={styles.weatherIcon}>{getCompanionEmoji(trip.companion)}</Label>
                  <Label style={styles.infoText}>
                    {trip.companion} · {trip.numberOfPersons || '1'} person
                  </Label>
                </View>
              </Animated.View>
              <TouchableOpacity style={styles.editButton} onPress={handleEditTripPress}>
                <SVG.Edit fill={COLOR.white} width={20} height={20} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.loadingText}>Loading trip details...</Text>
        )}

        <View style={styles.mapContainer}>
          {loadingMap ? (
            <SkeletonPlaceholder borderRadius={12}>
              <View style={styles.mapSkeleton}>
                <View style={styles.mapSkeletonInner} />
              </View>
            </SkeletonPlaceholder>
          ) : region ? (
            <Animated.View style={{ opacity: mapFadeAnim }}>
              <MapView
                ref={mapRef}
                style={styles.map}
                provider="google"
                region={region}
                showsUserLocation
                showsMyLocationButton
                rotateEnabled>
                <Marker coordinate={region} title={trip.destination} />
                {attractions.map((place, index) => (
                  <Marker
                    key={index}
                    coordinate={{ latitude: place.geometry.location.lat, longitude: place.geometry.location.lng }}
                    title={place.name}
                    description={place.vicinity}>
                    <Callout tooltip onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${place.place_id}`)}>
                      <View style={{ backgroundColor: 'white', paddingBottom: 10, width: 200, alignItems: 'center', borderRadius: 8 }}>
                        {place.photos?.[0]?.photo_reference ? (
                          <Image
                            source={{ uri: `https://openai-proxy-gilt-three.vercel.app/api/photo?photoReference=${place.photos[0].photo_reference}` }}
                            style={{ width: 200, height: 100, borderRadius: 8 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text>No Image</Text>
                        )}
                        <Text style={{ fontWeight: 'bold', marginTop: 8 }}>{place.name}</Text>
                        <Text style={{ fontSize: 12, color: 'gray', textAlign: 'center' }}>{place.vicinity}</Text>
                        {place.opening_hours?.open_now !== undefined && (
                          <Text style={{ marginTop: 4, color: place.opening_hours.open_now ? 'green' : 'red', fontWeight: '600' }}>
                            {place.opening_hours.open_now ? 'Open Now' : 'Closed'}
                          </Text>
                        )}
                      </View>
                    </Callout>
                  </Marker>
                ))}
              </MapView>
            </Animated.View>
          ) : null}
        </View>

        {loadingAttractions ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attractionsContainer}>
            {[...Array(3)].map((_, index) => (
              <SkeletonPlaceholder key={index} borderRadius={16}>
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
          <Animated.View style={{ opacity: attractionsFadeAnim }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attractionsContainer}>
              {attractions.map((place, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={1}
                  onPress={() => {
                    const loc = place.geometry.location;
                    mapRef.current?.animateToRegion({ latitude: loc.lat, longitude: loc.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 800);
                  }}
                  style={styles.attractionCard}>
                  {place.photos?.[0]?.photo_reference ? (
                    <View style={{ position: 'relative' }}>
                      <FastImage
                        source={{ uri: `https://openai-proxy-gilt-three.vercel.app/api/photo?photoReference=${place.photos[0].photo_reference}`, priority: FastImage.priority.normal }}
                        style={styles.attractionImage}
                        resizeMode={FastImage.resizeMode.cover}
                        onLoadStart={() => setLoadedImages(prev => ({ ...prev, [place.place_id]: false }))}
                        onLoadEnd={() => setLoadedImages(prev => ({ ...prev, [place.place_id]: true }))}
                      />
                      {!loadedImages[place.place_id] && <ActivityIndicator style={{ position: 'absolute', top: 60, alignSelf: 'center' }} size="small" color={COLOR.dark} />}
                    </View>
                  ) : (
                    <View style={styles.noImageBox}>
                      <Text style={styles.noImageText}>Kein Bild</Text>
                    </View>
                  )}
                  <View style={styles.placeDetailsContainer}>
                    <Text style={styles.attractionName}>{place.name}</Text>
                    <Text style={styles.attractionRating}>
                      {place.types?.[0] ? (() => {
                        const type = place.types[0].replace('_', ' ');
                        return type.charAt(0).toUpperCase() + type.slice(1);
                      })() : 'Attraction'}
                    </Text>
                    <Text style={styles.attractionRating}>⭐ {place.rating ?? '—'} – {place.user_ratings_total ?? 0} Reviews</Text>
                    <TouchableOpacity
                      onLongPress={() => {
                        Clipboard.setString(place.vicinity);
                        ReactNativeHapticFeedback.trigger('impactLight');
                        Toast.show({ type: 'success', text1: 'Address copied!' });
                      }}>
                      <Text style={styles.attractionAddress}>📍 {place.vicinity}</Text>
                    </TouchableOpacity>
                    {place.opening_hours?.open_now !== undefined && (
                      <Text style={[styles.attractionStatus, { color: place.opening_hours.open_now ? 'green' : 'red' }]}>
                        🕒 {place.opening_hours.open_now ? 'Open' : 'Closed'}
                      </Text>
                    )}
                    <Text
                      style={styles.attractionLink}
                      onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${place.place_id}`)}>
                      🔗 See on Google Maps
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}
      </ScrollView>

      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity onPress={handleOptionsPress} activeOpacity={0.8} style={styles.fabInner}>
          <SVG.Eagle width={28} height={28} />
        </TouchableOpacity>
      </Animated.View>

      <RBSheet
        ref={bottomSheetRef}
        useNativeDriver={false}
        draggable
        height={hp(52)}
        customStyles={{
          wrapper: { backgroundColor: 'transparent' },
          draggableIcon: { backgroundColor: '#D1D5DB' },
          container: {
            shadowColor: COLOR.black,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 12,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          },
        }}
        customModalProps={{ animationType: 'slide', statusBarTranslucent: true }}
        customAvoidingViewProps={{ enabled: false }}>
        <LinearGradient colors={['#FFFFFF', '#F1F5F9']} style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Explore Your Trip</Text>
          <View style={styles.optionsContainer}>
            {[
              {
                label: 'Daily Itinerary',
                icon: <SVG.Itinerary width={24} height={24} fill="#007AFF" />,
                action: () => {
                  if (loadingItinerary) {
                    Toast.show({ type: 'info', text1: 'Generating itinerary...', text2: 'Please wait a few seconds and try again.' });
                  } else if (itinerary.length > 0) {
                    const groupedItinerary = itinerary.reduce((acc, item) => {
                      const existing = acc.find((group) => group.date === item.date);
                      if (existing) {
                        existing.items.push(item);
                      } else {
                        acc.push({ date: item.date, items: [item] });
                      }
                      return acc;
                    }, []);

                    navigation.navigate(SCREEN.DAYBYDAY, { tripId, itinerary: groupedItinerary, trip });
                  } else {
                    Toast.show({ type: 'error', text1: 'No itinerary available', text2: 'Please try again later.' });
                  }
                  bottomSheetRef.current?.close();
                },
              },
              {
                label: 'Cool Facts',
                icon: <SVG.Light width={24} height={24} fill="#F59E0B" />,
                action: () => {
                  navigation.navigate(SCREEN.FUNFACTS, { tripId });
                  bottomSheetRef.current?.close();
                },
              },
              {
                label: 'Chat with AI',
                icon: <SVG.Ai width={24} height={24} fill="#00A3FF" />,
                action: handleChatbotPress,
              },
              {
                label: 'Find Hotels',
                icon: <SVG.Hotel width={24} height={24} fill="#EF4444" />,
                action: () => {
                  const link = `https://www.google.com/travel/hotels/search?destination=${encodeURIComponent(trip.destination)}&adults=${trip.numberOfPersons || 2}`;
                  Linking.openURL(link);
                },
              },
              {
                label: 'Book Flights',
                icon: <SVG.TakeOff width={24} height={24} fill="#10B981" />,
                action: () => {
                  navigation.navigate(SCREEN.BOOKING, { tripId });
                  bottomSheetRef.current?.close();
                },
              },
            ].map(({ label, icon, action }, index) => {
              const scale = useRef(new Animated.Value(1)).current;

              const onPressIn = () => {
                Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
              };

              const onPressOut = () => {
                Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
              };

              return (
                <Animated.View key={index} style={[styles.optionCard, { opacity: optionFadeAnims[index], transform: [{ scale }] }]}>
                  <TouchableOpacity style={styles.optionButton} onPress={() => handleOptionPress(action)} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>
                    {icon}
                    <Text style={styles.optionText}>{label}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </LinearGradient>
      </RBSheet>
    </View>
  );
};

export default TripDetailsScreen;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.background,
  },
  infoCard: {
    backgroundColor: COLOR.white,
    borderRadius: 12,
    padding: wp(4),
    marginHorizontal: wp(5),
    marginBottom: hp(2),
    shadowColor: COLOR.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  infoCardWithImage: {
    height: hp(20),
    overflow: 'hidden',
    backgroundColor: COLOR.white,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: COLOR.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  infoContent: {
    flex: 1,
    padding: wp(4),
    position: 'relative',
  },
  infoText: {
    ...TEXT_STYLE.textSmall,
    color: COLOR.white,
  },
  infoDestination: {
    ...TEXT_STYLE.title,
    color: COLOR.white,
    marginBottom: hp(0.5),
  },
  infoDate: {
    ...TEXT_STYLE.textSmall,
    color: COLOR.white,
    marginBottom: hp(0.5),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(0.3),
  },
  weatherIcon: {
    fontSize: 18,
  },
  editButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLOR.primary,
    padding: wp(2.5),
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    // marginHorizontal: wp(5),
    marginBottom: hp(2),
  },
  map: {
    height: 250,
    borderRadius: 12,
  },
  mapSkeleton: {
    height: 250,
    marginHorizontal: wp(0),
    marginBottom: hp(2),
  },
  mapSkeletonInner: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    backgroundColor: COLOR.lightGray,
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
    shadowColor: COLOR.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
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
    backgroundColor: COLOR.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    color: COLOR.mediumGray,
  },
  attractionName: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: hp(1),
    color: COLOR.dark,
  },
  attractionRating: {
    fontSize: 14,
    color: COLOR.mediumGray,
    marginTop: hp(0.5),
  },
  attractionAddress: {
    fontSize: 13,
    color: COLOR.primary,
    marginTop: 4,
  },
  attractionLink: {
    fontSize: 13,
    fontWeight: '500',
    color: COLOR.accent,
    marginTop: 4,
  },
  attractionStatus: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  placeDetailsContainer: {
    paddingTop: hp(1),
    gap: hp(0.5)
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
    shadowColor: COLOR.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  fabInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: COLOR.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetContent: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: hp(2),
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.dark,
    marginBottom: hp(2),
    textAlign: 'center',
  },
  optionsContainer: {
    paddingHorizontal: wp(5),
  },
  optionCard: {
    backgroundColor: COLOR.white,
    borderRadius: 12,
    marginVertical: hp(0.75),
    shadowColor: COLOR.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(4),
    gap: wp(3),
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.primary,
  },
  loadingText: {
    textAlign: 'center',
    color: COLOR.dark,
    marginTop: hp(2),
  },
});