import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, ScrollView, Image, Text, Linking, TouchableOpacity, Animated, ActivityIndicator, Dimensions } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import { Label } from '../../components';
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
import { callChatGptForResponse } from '../../apis/ChatGptApi';
import { getFunFactsPrompt } from '../../apis/Prompts';

const fallbackAttractionImage = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=500&q=80';

const getPlacePhotoUrl = photoReference => {
  if (!photoReference) {
    return null;
  }

  return `https://openai-proxy-gilt-three.vercel.app/api/photo?photoReference=${encodeURIComponent(photoReference)}`;
};

// Debounce utility function
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Debounced toast to prevent multiple toasts
const showToast = debounce((type, text1, text2) => {
  Toast.show({ type, text1, text2, position: 'top' });
}, 3000);

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
  const [weatherCache, setWeatherCache] = useState(null);
  const infoFadeAnim = useFadeIn();
  const mapFadeAnim = useFadeIn();
  const attractionsFadeAnim = useFadeIn();
  const [loadedImages, setLoadedImages] = useState({});
  const [failedImages, setFailedImages] = useState({});
  const [tripImageUrl, setTripImageUrl] = useState(null);
  const bottomSheetRef = useRef(null);
  const fabScale = useRef(new Animated.Value(1)).current;
  const [itinerary, setItinerary] = useState([]);
  const [loadingItinerary, setLoadingItinerary] = useState(false);
  const mapRef = useRef(null);
  const optionFadeAnims = Array(5).fill().map(() => useFadeIn());
  const [weather, setWeather] = useState(null);
  const weatherFetchRef = useRef({ lat: null, lon: null, date: null });
  const [loadingRegeneration, setLoadingRegeneration] = useState(false);

  const getAttractionImageSource = (photoReference, key) => {
    const photoUrl = getPlacePhotoUrl(photoReference);
    return {
      uri: !failedImages[key] && photoUrl ? photoUrl : fallbackAttractionImage,
    };
  };

  const getDateString = timestamp => {
    if (!timestamp?.toDate && !timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toISOString().split('T')[0];
  };

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
          const tripData = doc.data();
          setTrip(tripData);
          setAttractions(tripData.attractions || []);
          setLoadingAttractions(false);
          const allItems = (tripData.itinerary || []).flatMap(day => (day.items || []));
          setItinerary(allItems);
          setLoadingItinerary(false);
        }
      });
    return () => unsubscribe();
  }, [user?.uid, tripId]);

  useEffect(() => {
    if (!trip || !previousTrip) {
      setPreviousTrip(trip);
      return;
    }
    if (trip.destination !== previousTrip.destination) {
      firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .update({ funFacts: [] })
        .then(() => regenerateFunFacts(trip.destination))
        .catch(error => console.error('❌ Error updating fun facts:', error.message));
    }
    setPreviousTrip(trip);
  }, [trip]);

  const regenerateFunFacts = async (dest) => {
    try {
      const funFactsResponse = await callChatGptForResponse(getFunFactsPrompt(dest), "");
      const newFunFacts = funFactsResponse.split('\n').filter(fact => fact.trim().match(/^\d+\./));
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .update({ funFacts: newFunFacts });
      showToast('success', 'Fun facts updated!');
    } catch (err) {
      console.error('❌ Error regenerating fun facts:', err);
      showToast('error', 'Failed to update fun facts');
    }
  };

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
        showToast('error', 'Failed to load map');
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

  const fetchWeather = async (lat, lon, date) => {
    if (
      weatherFetchRef.current.lat === lat &&
      weatherFetchRef.current.lon === lon &&
      weatherFetchRef.current.date === date &&
      weatherCache
    ) {
      setWeather(weatherCache);
      setLoadingWeather(false);
      return;
    }

    setLoadingWeather(true);
    try {
      const tripDate = new Date(date);
      const today = new Date();
      const maxForecastDate = new Date(today.setDate(today.getDate() + 14));
      let useForecast = tripDate <= maxForecastDate;

      if (tripDate < today || tripDate > maxForecastDate) {
        useForecast = false;
      }

      const url = useForecast
        ? `https://openai-proxy-gilt-three.vercel.app/api/weather?lat=${lat}&lon=${lon}&date=${date}`
        : `https://openai-proxy-gilt-three.vercel.app/api/weather?lat=${lat}&lon=${lon}`;

      const res = await fetch(url);
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ Weather API error: ${res.status} - ${errorText}`);
        throw new Error(`Weather API failed with status ${res.status}`);
      }

      const data = await res.json();

      let weatherData;
      if (useForecast && data?.forecast?.forecastday?.[0]) {
        const day = data.forecast.forecastday[0].day;
        weatherData = { condition: day.condition.text, icon: day.condition.icon, temp: day.avgtemp_c };
      } else if (data?.current) {
        weatherData = { condition: data.current.condition.text, icon: data.current.condition.icon, temp: data.current.temp_c };
      } else {
        throw new Error('Invalid weather data structure');
      }

      setWeather(weatherData);
      setWeatherCache(weatherData);
      weatherFetchRef.current = { lat, lon, date };
    } catch (err) {
      console.error('❌ Error fetching weather:', err.message);
      showToast('error', 'Failed to load weather', err.message);
      setWeather(null);
    } finally {
      setLoadingWeather(false);
    }
  };

  const memoizedRegion = useMemo(() => region, [region?.latitude, region?.longitude]);
  const memoizedStartDate = useMemo(() => (trip?.startDate ? getDateString(trip.startDate) : null), [trip?.startDate]);

  useEffect(() => {
    if (memoizedRegion && memoizedStartDate) {
      fetchWeather(memoizedRegion.latitude, memoizedRegion.longitude, memoizedStartDate);
    }
  }, [memoizedRegion, memoizedStartDate]);

  useEffect(() => {
    const triggerRegeneration = async () => {
      if (!trip?.destination || !trip.startDate || !trip.endDate) return;
      setLoadingRegeneration(true);

      try {
        const { latitude, longitude } = trip.region;
        const baseUrl = 'https://openai-proxy-gilt-three.vercel.app/api';

        if (!trip.attractions || trip.attractions.length === 0) {
          const attrRes = await fetch(`${baseUrl}/generate-attractions?lat=${latitude}&lng=${longitude}&tripId=${tripId}&uid=${user.uid}&startDate=${getDateString(trip.startDate)}&endDate=${getDateString(trip.endDate)}`);
          const attrData = await attrRes.json();
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const itineraryRes = await fetch(`${baseUrl}/generate-itinerary?lat=${latitude}&lng=${longitude}&tripId=${tripId}&uid=${user.uid}&startDate=${getDateString(trip.startDate)}&endDate=${getDateString(trip.endDate)}`);
        const itineraryData = await itineraryRes.json();

        const updateData = {
          needsRegeneration: false,
          attractionsFetchedAt: new Date(),
          itineraryFetchedAt: new Date(),
        };

        if (Array.isArray(itineraryData.attractions)) {
          updateData.attractions = itineraryData.attractions;
        }

        if (Array.isArray(itineraryData.itinerary)) {
          updateData.itinerary = itineraryData.itinerary;
        }

        await firestore()
          .collection('users')
          .doc(user.uid)
          .collection('trips')
          .doc(tripId)
          .update(updateData);

        setTrip(prev => ({
          ...prev,
          ...updateData,
        }));

      } catch (err) {
        console.error('❌ Regeneration failed:', err.message);
        showToast('error', 'Regeneration failed', err.message);
      } finally {
        setLoadingRegeneration(false);
      }
    };

    if (trip?.needsRegeneration) {
      triggerRegeneration();
    }
  }, [trip?.needsRegeneration, trip?.startDate, trip?.endDate]);

  const formatDate = (input) => {
    let date;

    if (!input) return 'Invalid Date';

    if (typeof input === 'string') {
      date = new Date(input);
    } else if (input.toDate) {
      date = input.toDate();
    } else if (input instanceof Date) {
      date = input;
    } else {
      return 'Invalid Date';
    }

    if (isNaN(date.getTime())) return 'Invalid Date';

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
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
    ReactNativeHapticFeedback.trigger('impactLight');
    bottomSheetRef.current?.open();
  }, []);

  const handleEditTripPress = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    navigation.navigate(SCREEN.DESTINATION, { tripId });
  };

  const handleOptionPress = action => {
    ReactNativeHapticFeedback.trigger('impactLight');
    action();
  };

  const handleChatbotPress = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    bottomSheetRef.current?.close();
    navigation.navigate(SCREEN.CHATBOT, { tripId });
  };

  return (
    <View style={styles.container}>
      {!trip || (!trip.weather && loadingWeather) ? (
        <SkeletonPlaceholder borderRadius={10}>
          <View style={styles.infoCard}>
            <View style={{ width: 180, height: 25, marginBottom: 10 }} />
            <View style={{ width: 120, height: 18, marginBottom: 8 }} />
            <View style={{ width: 160, height: 18 }} />
          </View>
        </SkeletonPlaceholder>
      ) : (
        <View style={styles.mapContainer}>
          {loadingMap ? (
            <SkeletonPlaceholder borderRadius={12}>
              <View style={{ height: Dimensions.get('window').height, marginBottom: hp(2) }} />
            </SkeletonPlaceholder>
          ) : region ? (
            <Animated.View style={{ opacity: mapFadeAnim, flex: 1 }}>
              <MapView
                ref={mapRef}
                style={styles.map}
                provider="google"
                region={region}
                showsUserLocation
                showsMyLocationButton
                rotateEnabled>
                <Marker coordinate={region} title={trip.destination} />
                {attractions.slice(0, 10).map((place, index) => (
                  <Marker
                    key={index}
                    coordinate={{ latitude: place.geometry.location.lat, longitude: place.geometry.location.lng }}
                    title={place.name}
                    description={place.vicinity}>
                    <Callout tooltip onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${place.place_id}`)}>
                      <View style={{ backgroundColor: 'white', paddingBottom: 10, width: 200, alignItems: 'center', borderRadius: 8 }}>
                        {place.photos?.[0]?.photo_reference ? (
                          <Image
                            source={getAttractionImageSource(place.photos[0].photo_reference, `callout-${place.place_id}`)}
                            style={{ width: 200, height: 100, borderRadius: 8 }}
                            resizeMode="cover"
                            onError={() => setFailedImages(prev => ({ ...prev, [`callout-${place.place_id}`]: true }))}
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
              <View style={styles.infoContainer}>
                <FastImage source={{ uri: tripImageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <TouchableOpacity
                  onPress={() => {
                    ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
                    navigation.navigate(SCREEN.TRIPS);
                  }}
                  style={styles.backButton}>
                  <View style={styles.backCircle}>
                    <SVG.BackIcon fill={COLOR.white} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.editButton} onPress={handleEditTripPress}>
                  <SVG.Edit fill={COLOR.white} width={20} height={20} />
                </TouchableOpacity>

                <View style={styles.infoContent}>
                  <LinearGradient
                    colors={['rgba(0,0,0,0.8)', 'transparent', 'rgba(0,0,0,0.8)']}
                    locations={[0, 0.1, 0.9]}
                    style={styles.infoGradientOverlay}
                    pointerEvents="none"
                  />
                  <Animated.View style={[styles.infoText, { opacity: infoFadeAnim }]}>
                    <Label style={styles.infoDestination}>{trip.destination}</Label>
                    <Label style={styles.infoDate}>
                      {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                    </Label>
                    {trip.weather && (
                      <View style={styles.infoRow}>
                        <Label style={styles.weatherIcon}>🌤</Label>
                        <Label style={styles.infoText}>
                          {trip.weather.description} · {trip.weather.temperature}°C
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
                </View>
              </View>

              <View style={styles.attractionsOverlay}>
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
                              <Image
                                source={getAttractionImageSource(place.photos[0].photo_reference, `card-${place.place_id}`)}
                                style={styles.attractionImage}
                                resizeMode="cover"
                                onLoadStart={() => setLoadedImages(prev => ({ ...prev, [place.place_id]: false }))}
                                onLoadEnd={() => setLoadedImages(prev => ({ ...prev, [place.place_id]: true }))}
                                onError={() => setFailedImages(prev => ({ ...prev, [`card-${place.place_id}`]: true }))}
                              />
                              {!loadedImages[place.place_id] && <ActivityIndicator style={{ position: 'absolute', top: 60, alignSelf: 'center' }} size="small" color={COLOR.primary} />}
                            </View>
                          ) : (
                            <View style={styles.noImageBox}>
                              <Text style={styles.noImageText}>Kein Bild</Text>
                            </View>
                          )}
                          <View style={styles.placeDetailsContainer}>
                            <Text style={styles.attractionName}>{place.name}</Text>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: wp(1) }}>
                              <Text style={styles.attractionRating}>⭐</Text>
                              <Text style={styles.attractionRating}>
                                {place.rating ?? '—'} – {place.user_ratings_total ?? 0} Reviews
                              </Text>
                            </View>

                            <TouchableOpacity
                              style={{ flexDirection: 'row', alignItems: 'center', gap: wp(1) }}
                              onLongPress={() => {
                                Clipboard.setString(place.vicinity);
                                ReactNativeHapticFeedback.trigger('impactLight');
                                showToast('success', 'Address copied!');
                              }}
                            >
                              <Text>📍</Text>
                              <Text
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${place.place_id}`)}
                                style={styles.attractionAddress}
                              >
                                {place.vicinity}
                              </Text>
                            </TouchableOpacity>

                            {place.opening_hours?.open_now !== undefined && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: wp(1) }}>
                                <Text>🕒</Text>
                                <Text style={[styles.attractionStatus, { color: place.opening_hours.open_now ? 'green' : 'red' }]}>
                                  {place.opening_hours.open_now ? 'Open' : 'Closed'}
                                </Text>
                              </View>
                            )}
                          </View>

                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </Animated.View>
                )}
              </View>
            </Animated.View>
          ) : null}
          <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
            <TouchableOpacity onPress={handleOptionsPress} activeOpacity={0.8} style={styles.fabInner}>
              <SVG.Eagle width={40} height={40} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      <RBSheet
        ref={bottomSheetRef}
        useNativeDriver={false}
        draggable
        height={hp(52)}
        customStyles={{
          wrapper: { backgroundColor: 'rgba(0, 0, 0, 0)' },
          draggableIcon: { backgroundColor: 'rgba(255, 255, 255, 0.36)' },
          container: {
            backgroundColor: COLOR.primary,
            shadowColor: COLOR.black,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 12,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: 'hidden',
          },
        }}
        customModalProps={{ animationType: 'slide', statusBarTranslucent: true }}
        customAvoidingViewProps={{ enabled: false }}>
        <LinearGradient colors={['#002953', '#063D78', '#001B39']} style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Explore Your Trip</Text>
          <View style={styles.optionsContainer}>
            {[
              {
                label: 'Daily Itinerary',
                icon: <SVG.Itinerary width={24} height={24} fill="#007AFF" />,
                action: async () => {
                  if (loadingItinerary) {
                    showToast('info', 'Loading itinerary...', 'Please wait a few seconds and try again.');
                    return;
                  }

                  if (itinerary.length > 0) {
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
                    showToast('error', 'No itinerary available', 'Please try again later.');
                  }
                  bottomSheetRef.current?.close();
                },
              },
              {
                label: 'Fun Facts',
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

      {loadingRegeneration && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={COLOR.primary} />
          <Text style={styles.overlayText}>Creating your personalized trip plan...</Text>
        </View>
      )}
    </View>
  );
};

export default TripDetailsScreen;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.primary,
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
  infoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: hp(22),
    overflow: 'hidden',
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  backButton: {
    position: 'absolute',
    top: hp(8),
    left: wp(4),
    zIndex: 2,
  },
  backCircle: {
    width: hp(4.8),
    height: hp(4.8),
    borderRadius: hp(2.4),
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLOR.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  infoContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: hp(4),
  },
  infoText: {
    ...TEXT_STYLE.textSmall,
    color: COLOR.white,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },
  infoDestination: {
    ...TEXT_STYLE.title,
    color: COLOR.white,
    marginBottom: hp(0.5),
    textAlign: 'center',
    fontWeight: '800',
  },
  infoDate: {
    ...TEXT_STYLE.textSmall,
    color: COLOR.white,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  weatherIcon: {
    fontSize: 18,
  },
  editButton: {
    position: 'absolute',
    top: hp(8),
    right: wp(4),
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    padding: wp(2.5),
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  attractionsOverlay: {
    position: 'absolute',
    bottom: hp(2),
    left: 0,
    right: 0,
  },
  attractionsContainer: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(2),
  },
  attractionCard: {
    width: wp(50),
    minHeight: 250,
    marginRight: wp(4),
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: hp(2),
    padding: wp(2),
    shadowColor: COLOR.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
    flexDirection: 'column',
  },
  attractionImage: {
    width: '100%',
    height: 120,
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
    color: '#4B5563',
  },
  attractionName: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: hp(1),
    color: COLOR.primary,
  },
  attractionRating: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: hp(0.5),
  },
  attractionAddress: {
    fontSize: 13,
    color: '#2563EB',
    marginTop: 4,
    textDecorationLine: 'underline',
    paddingRight: wp(6)
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
    flex: 1,
    justifyContent: 'space-between',
    gap: 4
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
    shadowColor: COLOR.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  fabInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: COLOR.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetContent: {
    flex: 1,
    backgroundColor: COLOR.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: hp(2),
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.white,
    marginBottom: hp(2),
    textAlign: 'center',
  },
  optionsContainer: {
    paddingHorizontal: wp(5),
  },
  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderRadius: hp(1.6),
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
    color: COLOR.white,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  overlayText: {
    marginTop: 12,
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoGradientOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
});
