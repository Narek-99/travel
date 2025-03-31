import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, View, ScrollView, Share, Pressable, Image, Text, Linking, TextInput, TouchableOpacity, Keyboard, Animated, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import Markdown from 'react-native-markdown-display';
import { Label, AppHeader } from '../../components';
import { COLOR, TEXT_STYLE, hp, wp } from '../../enums/StyleGuide';
import { SCREEN } from '../../enums/AppEnums';
import { callChatGptForResponse } from '../../apis/ChatGptApi';
import { SVG } from '../../assets/svgs';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import MapView, { Marker } from 'react-native-maps';
import Geocoder from 'react-native-geocoding';
import Toast from 'react-native-toast-message';
import Clipboard from '@react-native-clipboard/clipboard';
import { useRef } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import * as Animatable from 'react-native-animatable';

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
  const inputRef = useRef(null);
  const [trip, setTrip] = useState(null);
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);
  const [attractions, setAttractions] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const timeoutRef = useRef(null);
  const isGeneratingRef = useRef(false);
  const [loadingAttractions, setLoadingAttractions] = useState(true);
  const [loadingMap, setLoadingMap] = useState(true);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [loadingTripPlan, setLoadingTripPlan] = useState(true);
  const infoFadeAnim = useFadeIn();
  const mapFadeAnim = useFadeIn();
  const attractionsFadeAnim = useFadeIn();
  const [loadedImages, setLoadedImages] = useState({});

  const handleAskAIPress = () => {
    scrollViewRef.current.scrollToEnd({ animated: true })

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 500);
  };

  const handleQuestionSubmit = async () => {
    if (userQuery.trim() === '') return;

    Keyboard.dismiss();
    scrollViewRef.current.scrollToEnd({ animated: true })
    setUserQuery('');
    setMessages(prev => [...prev, { id: Date.now(), text: userQuery, sender: 'user' }]);
    setIsGenerating(true);
    isGeneratingRef.current = true;

    const botMessage = {
      id: Date.now() + 1,
      text: '',
      sender: 'bot',
    };

    const enrichedPrompt = `
      User's Question: "${userQuery}"
      ---
      Context: The user is planning a trip to ${trip.destination}, from ${getDateString(trip.startDate)} to ${getDateString(trip.endDate)}. They will be traveling with ${trip.companion}, and they are interested in ${trip.activities?.join(', ') || 'various activities'}. The user might have preferences for ${trip.accommodation?.join(', ') || 'certain types of accommodation'} and has a budget described as ${trip.budget || 'medium'}.
      Answer the question taking into account these details about their trip.
    `;

    try {
      const response = await callChatGptForResponse(enrichedPrompt);
      let index = 0;

      const addCharacter = () => {
        if (index < response.length && isGeneratingRef.current) {
          botMessage.text += response.charAt(index++);
          setMessages(prev => {
            const otherMessages = prev.filter(m => m.id !== botMessage.id);
            return [...otherMessages, { ...botMessage }];
          }); if (index % 10 === 0) scrollViewRef.current?.scrollToEnd({ animated: true });
          timeoutRef.current = setTimeout(addCharacter, 10);
        } else {
          setIsGenerating(false);
          isGeneratingRef.current = false;
        }
      };

      addCharacter();
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
      isGeneratingRef.current = false;
      setMessages([{ id: Date.now(), text: "Failed to get response", sender: 'bot' }]);
    }
  };

  const handleStopGeneration = () => {
    clearTimeout(timeoutRef.current);
    setIsGenerating(false);
  };

  const copyToClipboard = () => {
    Clipboard.setString(trip.aiPlan);
    ReactNativeHapticFeedback.trigger('impactMedium', { enableVibrateFallback: true });
    Toast.show({ type: 'success', text1: 'Copied!', position: 'bottom' });
  };

  useEffect(() => {
    if (trip?.destination) {
      setLoadingMap(true);
      Geocoder.init("AIzaSyCNJjMnjX6DYOlog0w0HsHxWTrigKqlCM8");
      Geocoder.from(trip.destination)
        .then(json => {
          const location = json.results[0].geometry.location;
          setRegion({
            latitude: location.lat,
            longitude: location.lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
          setLoadingMap(false);
        })
        .catch(error => {
          console.error('❌ Geocoding failed:', error);
          setLoadingMap(false);
        });
    }
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
        if (data) {
          setTrip(data);
          setLoadingTripPlan(!data.aiPlan);
        }
      } catch (error) {
        console.error('❌ Fehler beim Laden des Trips:', error);
      }
    };

    if (user?.uid && tripId) {
      fetchTripDetails();
    }
  }, [user?.uid, tripId]);

  const [weather, setWeather] = useState(null);
  const mapRef = React.useRef();

  const fetchAttractions = async () => {
    setLoadingAttractions(true); // ✅ show skeletons
    if (!region?.latitude || !region?.longitude) return;

    try {
      const response = await fetch(
        `https://openai-proxy-gilt-three.vercel.app/api/places?lat=${region.latitude}&lng=${region.longitude}`
      );
      const data = await response.json();
      setAttractions(data.results.slice(0, 10)); // Top 10
    } catch (err) {
      console.error('❌ Fehler beim Laden der Sehenswürdigkeiten:', err);
    } finally {
      setLoadingAttractions(false); // ✅ hide skeletons
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
      const maxForecastDate = new Date();
      maxForecastDate.setDate(today.getDate() + 14);

      const useForecast = tripDate <= maxForecastDate;
      const url = `https://openai-proxy-gilt-three.vercel.app/api/weather?lat=${lat}&lon=${lon}${useForecast ? `&date=${date}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (useForecast && data?.forecast?.forecastday?.[0]) {
        const day = data.forecast.forecastday[0].day;
        setWeather({
          condition: day.condition.text,
          icon: day.condition.icon,
          temp: day.avgtemp_c
        });
      } else if (data?.current) {
        setWeather({
          condition: data.current.condition.text,
          icon: data.current.condition.icon,
          temp: data.current.temp_c
        });
        console.log('ℹ️ Keine Prognose möglich, aktuelles Wetter verwendet');
      }
    } catch (err) {
      console.error("❌ Fehler beim Wetterabruf (Proxy):", err);
    } finally {
      setLoadingWeather(false);
    }
  };

  const getDateString = (timestamp) => {
    if (!timestamp?.toDate) return '';
    const date = timestamp.toDate();
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  useEffect(() => {
    if (region && trip?.startDate) {
      const dateStr = getDateString(trip.startDate);
      fetchWeather(region.latitude, region.longitude, dateStr);
    }
  }, [region, trip?.startDate]);

  const regenerateAiPlan = async () => {
    if (!trip) return;

    const tripPrompt = `
    Create a highly personalized, clearly structured day-by-day travel itinerary based strictly on the user's provided preferences and trip details below.
    
    Follow these instructions carefully:
    
    1. Begin with a concise, enthusiastic summary (one single sentence) emphasizing exactly why this itinerary is perfect for the user's specified preferences.
    2. Then, provide a separate, clearly marked itinerary for EVERY SINGLE DAY of the trip, from the start date (${getDateString(trip.startDate)} ) through to and including the end date (${getDateString(trip.endDate)}). Do not skip any days.
    3. Use this precise daily structure for each day (provide the response in Markdown):
    
    ---

    📅 Day [X]
    - 📍 Activity & Location: Specific location name and a brief description tailored exactly to user's preferences.
    - 🕒 Suggested defined time range (e.g., 9:00–12:00)
    - 💰 Budget-friendly tips (where applicable, based on user's selected budget).
    - 🥘 Recommended dining spots relevant to user's preferences.
    - 🏨 Recommended accommodations aligned with user's preferences (if applicable).
    - 🚶 Travel tips or local insights relevant to the itinerary.

    ----
    Repeat exactly this structured format for every single day of the trip.
    
    
    User’s Trip Details to Strictly Follow:
    
    - **Destination:** ${trip.destination}
    - **Travel Dates:** ${trip.startDate} to ${trip.endDate} (Provide itinerary for every day!)
    - **Traveling with:** ${trip.companion}, ${trip.persons || '1'} person(s)
    - **Budget:** ${trip.budget || 'medium'}
    - **Preferred Activities:** ${trip.activities?.join(', ') || 'no specific activities'}
    - **Special Wishes:** ${trip.wishes?.join(', ') || 'none'}
    - **Accommodation Preferences:** ${trip.accommodation?.join(', ') || 'no specific preferences'}
    - **Preferred Location within Destination:** ${trip.location?.join(', ') || 'no specific location'}
    - **Additional Information:** ${trip.additionalInfo || 'none'}
    
    Maintain a friendly, enthusiastic, and highly personalized tone throughout. It should feel obvious that the itinerary was carefully crafted specifically for the user's provided wishes and preferences.
    `;

    try {
      const newPlan = await callChatGptForResponse(tripPrompt);
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .update({ aiPlan: newPlan });
      setTrip(prev => ({ ...prev, aiPlan: newPlan }));
    } catch (error) {
      console.error('❌ Fehler beim Neugenerieren des Plans:', error);
    }
  };

  const shareTrip = async () => {
    try {
      await Share.share({
        title: `Trip to ${trip.destination}`,
        message: trip.aiPlan,
      });
    } catch (error) {
      console.error('❌ Fehler beim Teilen:', error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getCompanionEmoji = (companion) => {
    switch ((companion || '').toLowerCase()) {
      case 'partner':
        return '❤️';
      case 'familie':
      case 'family':
        return '👨‍👩‍👧‍👦';
      case 'freunde':
      case 'friends':
        return '🧑‍🤝‍🧑';
      case 'kollegen':
      case 'colleagues':
        return '💼';
      case 'allein':
      case 'alone':
        return '👤';
      default:
        return '👥';
    }
  };

  const MessageBubble = React.memo(({ item }) => {
    const isUser = item.sender === 'user';
    return (
      <View
        style={[
          styles.messageWrapper,
          isUser ? styles.userMessageWrapper : styles.botMessageWrapper,
        ]}
      >
        <View style={styles.avatarContainer}>
          {isUser ? (
            <SVG.Person width={23} height={23} />
          ) : (
            <SVG.Robot width={35} height={35} />
          )}
        </View>

        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.botBubble
        ]}>
          <Text style={styles.messageText}>{item.text}</Text>
        </View>
      </View>
    );
  });


  return (
    <View style={styles.container}>
      <SafeAreaView />
      <AppHeader
        leftComp={
          <Pressable onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
            navigation.navigate(SCREEN.TRIPS);
          }}>
            <SVG.BackIcon fill={COLOR.dark} />
          </Pressable>
        }
        titleStyle={{ ...TEXT_STYLE.smallTitleBold, color: COLOR.dark }}
        rightComp={
          <View style={styles.rightContainer}>
            <Pressable onPress={handleAskAIPress} style={styles.askAiContainer}>
              <SVG.AiStar fill="#90009C" />
              <Text style={styles.askAiText}>Ask AI</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate(SCREEN.DESTINATION, { tripId })}>
              <SVG.Edit fill={COLOR.dark} />
            </Pressable>
            <Pressable onPress={regenerateAiPlan}>
              <SVG.Regenerate fill={COLOR.dark} />
            </Pressable>
            <Pressable onPress={shareTrip}>
              <SVG.Share fill={COLOR.dark} />
            </Pressable>
          </View>
        }
      />

      <KeyboardAwareScrollView
        innerRef={ref => (scrollViewRef.current = ref)}
        extraScrollHeight={hp(3)}
        contentContainerStyle={{ paddingBottom: hp(2) }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {loadingWeather ? (
          <SkeletonPlaceholder borderRadius={10}>
            <View style={styles.infoCard}>
              <View style={{ width: 180, height: 25, marginBottom: 10 }} />
              <View style={{ width: 120, height: 18, marginBottom: 8 }} />
              <View style={{ width: 160, height: 18 }} />
            </View>
          </SkeletonPlaceholder>
        ) : (
          <Animated.View style={[styles.infoCard, { opacity: infoFadeAnim }]}>
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
              <Label style={styles.infoText}>{trip.companion} · {trip.numberOfPersons || '1'} person</Label>
            </View>
          </Animated.View>
        )}

        {loadingMap ? (
          <SkeletonPlaceholder borderRadius={10}>
            <View style={styles.map} />
          </SkeletonPlaceholder>
        ) : region && (
          <>
            <Pressable
              onPress={() => setIsMapFullScreen(prev => !prev)}
              style={{
                alignSelf: 'flex-end',
                marginRight: wp(5),
                marginBottom: 8,
                backgroundColor: '#fff',
                paddingHorizontal: 6,
                paddingVertical: 6,
                borderRadius: 8,
                shadowColor: '#000',
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              {isMapFullScreen ? <SVG.NormalScreen fill={COLOR.dark} /> : <SVG.Fullscreen fill={COLOR.dark} />}
            </Pressable>

            <Animated.View style={{ opacity: mapFadeAnim }}>

              <MapView
                ref={mapRef}
                style={isMapFullScreen ? styles.mapFull : styles.map}
                region={region}
              >
                <Marker coordinate={region} title={trip.destination} />
                {attractions.map((place, index) => (
                  <Marker
                    key={index}
                    coordinate={{
                      latitude: place.geometry.location.lat,
                      longitude: place.geometry.location.lng,
                    }}
                    title={place.name}
                    description={place.vicinity}
                  />
                ))}
              </MapView>
            </Animated.View>

          </>
        )}

        {loadingAttractions ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.attractionsContainer}
          >
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.attractionsContainer}
            >
              {attractions.map((place, index) => (
                <Pressable
                  key={index}
                  onPress={() => {
                    const loc = place.geometry.location;
                    mapRef.current?.animateToRegion({
                      latitude: loc.lat,
                      longitude: loc.lng,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }, 800);
                  }}
                  style={styles.attractionCard}
                >
                  {place.photos?.[0]?.photo_reference ? (
                    <View style={{ position: 'relative' }}>
                      <Image
                        source={{
                          uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=AIzaSyCNJjMnjX6DYOlog0w0HsHxWTrigKqlCM8`,
                        }}
                        style={[
                          styles.attractionImage,
                          { opacity: loadedImages[place.place_id] ? 1 : 0.3 },
                        ]}
                        resizeMode="cover"
                        onLoadStart={() =>
                          setLoadedImages(prev => ({ ...prev, [place.place_id]: false }))
                        }
                        onLoadEnd={() =>
                          setLoadedImages(prev => ({ ...prev, [place.place_id]: true }))
                        }
                      />
                      {!loadedImages[place.place_id] && (
                        <ActivityIndicator
                          style={{
                            position: 'absolute',
                            top: 60,
                            alignSelf: 'center',
                          }}
                          size="small"
                          color={COLOR.dark}
                        />
                      )}
                    </View>
                  ) : (
                    <View style={styles.noImageBox}>
                      <Text style={styles.noImageText}>Kein Bild</Text>
                    </View>
                  )}

                  <View style={styles.placeDetailsContainer}>
                    <Text style={styles.attractionName}>{place.name}</Text>
                    <Text style={styles.attractionRating}>
                      ⭐ {place.rating ?? '—'} – {place.user_ratings_total ?? 0} Reviews
                    </Text>
                    <Text
                      style={styles.attractionAddress}
                      onPress={() =>
                        Linking.openURL(`https://www.google.com/maps/place/?q=place_id:${place.place_id}`)
                      }
                    >
                      📍 {place.vicinity}
                    </Text>
                    {place.opening_hours?.open_now !== undefined && (
                      <Text style={styles.attractionStatus}>
                        🕒 {place.opening_hours.open_now ? 'Open' : 'Closed'}
                      </Text>
                    )}
                    <Text
                      style={styles.attractionLink}
                      onPress={() =>
                        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${place.place_id}`)
                      }
                    >
                      🔗 See on Google Maps
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        <Text style={styles.tripPlanTitle}>Your Personalized Day-by-Day Travel Plan</Text>

        {loadingTripPlan ? (
          <SkeletonPlaceholder borderRadius={10}>
            <View style={styles.card}>
              <View style={{ height: 22, width: '70%', marginBottom: 10 }} />
              <View style={{ height: 14, width: '90%', marginBottom: 8 }} />
              <View style={{ height: 14, width: '95%', marginBottom: 8 }} />
              <View style={{ height: 14, width: '60%' }} />
            </View>
          </SkeletonPlaceholder>
        ) : (
          <Animatable.View animation="fadeInUp" duration={600} style={styles.card}>
            <Pressable onLongPress={copyToClipboard}>
              <Markdown style={markdownStyles}>
                {trip.aiPlan || 'No AI plan available.'}
              </Markdown>
            </Pressable>
          </Animatable.View>
        )}

        <Text style={styles.tripPlanTitle}>Ask AI Any Question About Your Trip</Text>

        {messages.map((item, index) => (
          <MessageBubble key={item.id ?? index} item={item} />
        ))}

        <View style={styles.questionContainer}>
          <TextInput
            style={styles.textInput}
            ref={inputRef}
            placeholderTextColor={COLOR.lightGray}
            value={userQuery}
            onChangeText={setUserQuery}
            placeholder="Ask here..."
            onSubmitEditing={handleQuestionSubmit}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={isGenerating ? handleStopGeneration : handleQuestionSubmit}
          >
            {isGenerating ? (
              <SVG.Stop fill='#fff' width={15} height={15} />)
              :
              (<SVG.Send fill='#fff' width={15} height={15} />)}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};

export default TripDetailsScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.white,
  },
  card: {
    backgroundColor: COLOR.white,
    borderRadius: 10,
    padding: wp(4),
    margin: wp(5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  rightContainer: {
    flexDirection: "row",
    gap: wp(5),
    alignItems: "center"
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
    color: COLOR.dark,
    marginBottom: 4,
  },
  infoDate: {
    ...TEXT_STYLE.textSmall,
    color: COLOR.mediumGray,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  infoText: {
    ...TEXT_STYLE.textSmall,
    color: COLOR.dark,
  },
  weatherIcon: {
    fontSize: 18,
  },
  map: {
    height: 200,
    marginHorizontal: wp(5),
    borderRadius: 10,
    marginBottom: hp(2),
  },
  attractionsContainer: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(2),
  },
  attractionCard: {
    width: wp(64), // ca. 256px
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
    flexDirection: "column",
    gap: hp(1.5)
  },
  mapFull: {
    height: hp(50),
    width: '100%',
    borderRadius: 10
  },
  tripPlanTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLOR.dark,
    paddingHorizontal: wp(5),
    marginTop: hp(2)
  },
  textInput: {
    flex: 1,
    color: COLOR.black,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 0.5,
    borderColor: '#333333',
  },
  sendButton: {
    marginLeft: wp(1),
    backgroundColor: 'black',
    borderRadius: 50,
    padding: 10
  },
  sendButtonText: {
    color: COLOR.white,
    fontSize: 16,
  },
  chatContainer: {
    backgroundColor: COLOR.white2,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  chatResponse: {
    fontSize: 16,
    color: COLOR.dark,
  },
  questionContainer: {
    flexDirection: "row",
    gap: wp(1),
    padding: wp(5),
    // marginBottom: hp(2),
    alignItems: 'center',
  },
  askAiContainer: {
    flexDirection: 'row',
    gap: wp(2),
    justifyContent: "flex-start",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#0084FF',
    borderRadius: 25,
  },
  askAiText: {
    color: COLOR.white,
    fontSize: 16,
    fontWeight: "bold"
  },
  messageContainer: {
    padding: 15,
    backgroundColor: COLOR.lightBlue,
    borderRadius: 20,
    marginHorizontal: wp(5),
    marginTop: hp(2)
  },
  messageText: {
    color: 'black',
    fontSize: 16,
  },
  messagesList: {
    flex: 1,
    marginBottom: hp(2)
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: wp(5),
    marginTop: hp(2),
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  botMessageWrapper: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: wp(3),
    marginTop: hp(1),
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: COLOR.lightBlue,
    borderTopRightRadius: 0,
  },
  botBubble: {
    backgroundColor: COLOR.white2,
    borderTopLeftRadius: 0,
  },
});

const markdownStyles = {
  body: {
    color: COLOR.dark,
    fontSize: 16,
    lineHeight: 22,
  },
  heading1: {
    fontSize: 22,
    color: COLOR.lightBlue,
    marginBottom: 8,
  },
  strong: {
    color: COLOR.dark,
  },

};