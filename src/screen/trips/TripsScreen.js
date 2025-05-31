import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Pressable,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { useSelector } from 'react-redux';
import { AppHeader, Label } from '../../components';
import { COLOR, TEXT_STYLE, wp, hp } from '../../enums/StyleGuide';
import { SCREEN } from '../../enums/AppEnums';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { SVG } from '../../assets/svgs';
import firestore from '@react-native-firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { SwipeListView } from 'react-native-swipe-list-view';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import useRating from '../../utils/useRating';
import { useSubscriptions } from '../../contexts/subscriptionContext';

const TripsScreen = ({ navigation }) => {
  const user = useSelector(({ appReducer }) => appReducer.user);
  const [trips, setTrips] = useState([]);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true);
  const hapticOptions = { enableVibrateFallback: true };
  const [tripImages, setTripImages] = useState({});
  const [loadingImages, setLoadingImages] = useState({});
  const [lastFetchedDestinations, setLastFetchedDestinations] = useState({});
  const hasShownRating = useRef(false);
  const { isSubscribed, isProductListLoading, getAvailablePurchase } = useSubscriptions();
  const { showRating } = useRating();
  const translateAnims = useRef({}).current; // Store animation values for each trip

  useEffect(() => {
    if (!hasShownRating.current) {
      showRating();
      hasShownRating.current = true;
    }
  }, [showRating]);

  const fetchTripImage = async (destination, tripId) => {
    if (tripImages[tripId] && lastFetchedDestinations[tripId] === destination) return;

    setLoadingImages(prev => ({ ...prev, [tripId]: true }));

    try {
      const response = await fetch(`https://openai-proxy-gilt-three.vercel.app/api/unsplash?destination=${destination}`);
      const data = await response.json();
      const imageUrl = data.results[0]?.urls?.small;

      if (imageUrl) {
        setTripImages(prev => ({ ...prev, [tripId]: imageUrl }));
        setLastFetchedDestinations(prev => ({ ...prev, [tripId]: destination }));
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden des Bildes:', error);
    } finally {
      setLoadingImages(prev => ({ ...prev, [tripId]: false }));
    }
  };

  const fetchTrips = useCallback(async () => {
    try {
      const snapshot = await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .orderBy('createdAt', 'desc')
        .get();

      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(trip => trip.destination);

      // Initialize translate animation for each trip
      data.forEach(trip => {
        if (!translateAnims[trip.id]) {
          translateAnims[trip.id] = new Animated.Value(0);
        }
      });

      setTrips(data);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Trips:', error);
    }
  }, [user.uid, translateAnims]);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot(
        doc => {
          setIsSubscriptionLoading(false);
        },
        error => {
          console.error('❌ Error fetching subscription:', error);
          setIsSubscriptionLoading(false);
        }
      );

    return () => unsubscribe();
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      if (user?.uid) {
        fetchTrips();
        getAvailablePurchase();
      }
    }, [user?.uid, fetchTrips])
  );

  useEffect(() => {
    trips.forEach(trip => fetchTripImage(trip.destination, trip.id));
  }, [trips]);

  const ImageSkeleton = () => (
    <SkeletonPlaceholder borderRadius={4}>
      <SkeletonPlaceholder.Item width="100%" height={200} />
    </SkeletonPlaceholder>
  );

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

  const budgetOptions = [
    { label: '💵 Budget: Low', value: 'low' },
    { label: '💰 Budget: Medium', value: 'medium' },
    { label: '💎 Budget: High', value: 'high' },
    { label: '🔢 Enter specific amount', value: 'custom' },
  ];

  const getBudgetDisplay = (budget, customAmount) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });

    if (budget === 'custom' && customAmount) {
      return `💰 Budget: ${formatter.format(customAmount)}`;
    }

    const option = budgetOptions.find(opt => opt.value === budget);

    if (option?.label) {
      return `${option.label}`;
    }

    return '💵 Medium Budget';
  };

  const deleteTrip = async (tripId) => {
    Alert.alert("Delete Trip", "Are you sure you want to delete this trip?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            // Start slide-out animation
            Animated.timing(translateAnims[tripId], {
              toValue: -wp(100), // Slide out to the left
              duration: 200, // Faster 200ms animation
              useNativeDriver: true,
            }).start(async () => {
              // After animation, delete from Firestore and update state
              await firestore()
                .collection('users')
                .doc(user.uid)
                .collection('trips')
                .doc(tripId)
                .delete();

              setTrips(prev => prev.filter(trip => trip.id !== tripId));
              delete translateAnims[tripId]; // Clean up animation reference
              ReactNativeHapticFeedback.trigger('impactHeavy', hapticOptions);
            });
          } catch (error) {
            console.error('❌ Error deleting trip:', error);
            // Reset animation if deletion fails
            translateAnims[tripId].setValue(0);
          }
        }
      }
    ]);
  };

  const formatDateRange = (start, end) => {
    let startDate, endDate;

    // Handle Firestore Timestamps
    if (start?.toDate) {
      startDate = start.toDate();
    } else if (typeof start === 'string') {
      startDate = new Date(start);
    }

    if (end?.toDate) {
      endDate = end.toDate();
    } else if (typeof end === 'string') {
      endDate = new Date(end);
    }

    if (!startDate || !endDate || isNaN(startDate) || isNaN(endDate)) return '';

    const options = { day: '2-digit', month: 'short' };
    const startStr = startDate.toLocaleDateString('en-US', options);
    const endStr = endDate.toLocaleDateString('en-US', options);
    return `${startStr} – ${endStr}`;
  };

  const handleAddTripNavigation = () => {
    if (isSubscriptionLoading) return;
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    if (!isSubscribed && !isProductListLoading) {
      navigation.navigate(SCREEN.SUBSCRIPTION);
    } else {
      navigation.navigate(SCREEN.DESTINATION);
    }
  };

  const handlePremiumPress = () => {
    if (isSubscriptionLoading) return;
    if (!user?.subscription) {
      navigation.navigate(SCREEN.SUBSCRIPTION);
      ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    }
  };

  const handleEditTripPress = (tripId) => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate(SCREEN.DESTINATION, { tripId });
  };

  const renderSwipeItem = ({ item }) => (
    <Animated.View style={{ transform: [{ translateX: translateAnims[item.id] }] }}>
      <TouchableOpacity
        activeOpacity={1}
        style={styles.card}
        onPress={() => {
          ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
          navigation.navigate(SCREEN.TRIPDETAILS, { tripId: item.id });
        }}
      >
        <View style={styles.cardImageContainer}>
          {loadingImages[item.id] || !tripImages[item.id] ? (
            <ImageSkeleton />
          ) : (
            <FastImage
              source={{ uri: tripImages[item.id], priority: FastImage.priority.high }}
              style={styles.cardImage}
            />
          )}

          <LinearGradient
            colors={['rgba(0, 0, 0, 0.9)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.overlay}
          >
            <View style={styles.companionRow}>
              <Text style={styles.destinationText}>{item.destination}, {item.country}</Text>
              <Text style={[{ marginTop: hp(1) }, styles.dateText]}>{formatDateRange(item.startDate, item.endDate)}</Text>
              <View style={[styles.infoRow, { marginTop: hp(0.5) }]}>
                <Label style={styles.dateText}>{getCompanionEmoji(item.companion)}</Label>
                <Label style={styles.dateText}>
                  {item.companion} · {item.numberOfPersons || '1'} person
                </Label>
              </View>
              <View style={styles.infoRow}>
                <Label style={styles.dateText}>{getBudgetDisplay(item.budget, item.customAmount)}</Label>
              </View>
            </View>
          </LinearGradient>

          <Pressable
            style={styles.editButton}
            onPress={() => handleEditTripPress(item.id)}
          >
            <SVG.Edit fill={COLOR.white} width={15} height={15} />
          </Pressable>

          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
              navigation.navigate(SCREEN.TRIPDETAILS, { tripId: item.id });
            }}
          >
            <Text style={styles.detailButtonText}>Details →</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderHiddenItem = ({ item }) => (
    <Animated.View style={{ transform: [{ translateX: translateAnims[item.id] }], flex: 1 }}>
      <View style={styles.hiddenRow}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteTrip(item.id)}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView />
      <AppHeader
        leftComp={
          <Pressable onPress={() => {
            navigation.navigate(SCREEN.SETTINGS);
            ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
          }}>
            <SVG.Settings fill="black" />
          </Pressable>
        }
        centerComp={
          <View style={styles.headerActions}>
            {(isSubscriptionLoading || isProductListLoading) ? (
              <SkeletonPlaceholder borderRadius={hp(1)}>
                <SkeletonPlaceholder.Item width={wp(30)} height={hp(4)} />
              </SkeletonPlaceholder>
            ) : isSubscribed ? (
              <View style={styles.gptPlusButton}>
                <SVG.Flash fill="#3B82F6" />
                <Label style={{ color: '#3B82F6', fontWeight: 700 }}>Premium</Label>
              </View>
            ) : (
              <Pressable
                style={styles.gptPlusButton}
                onPress={handlePremiumPress}
                disabled={isSubscriptionLoading}
              >
                <SVG.Flash fill="#3B82F6" />
                <Label style={{ color: '#3B82F6', fontWeight: 700 }}>Try For Free</Label>
              </Pressable>
            )}
          </View>
        }
        rightComp={
          <Pressable onPress={handleAddTripNavigation}>
            <SVG.Plus width="24" height="24" fill="black" />
          </Pressable>
        }
      />

      <Pressable style={styles.contentContainer}>
        {trips.length === 0 ? (
          <Pressable onPress={handleAddTripNavigation} style={styles.emptyContainer}>
            <SVG.Plus fill={'#3B82F6'} width={wp(12)} height={wp(12)} style={styles.plusIcon} />
            <Text style={styles.emptyTitle}>NO TRIPS YET!</Text>
            <Text style={styles.emptySubtitle}>Let’s Craft Your First Journey!</Text>
            <View style={styles.benefitsContainer}>
              <View style={styles.benefitItem}>
                <Text style={styles.benefitText}>💡 Plan Your Trip Day by Day</Text>
              </View>
              <View style={styles.benefitItem}>
                <Text style={styles.benefitText}>🤖 Get Smart Tips from Triposo AI</Text>
              </View>
              <View style={styles.benefitItem}>
                <Text style={styles.benefitText}>✈️ Find Great Deals on Flights & Hotels</Text>
              </View>
              <View style={styles.benefitItem}>
                <Text style={styles.benefitText}>🧭 Get Tips Just for Your Interests</Text>
              </View>
              <View style={styles.benefitItem}>
                <Text style={styles.benefitText}>📍 Discover Secret Spots & Local Gems</Text>
              </View>
            </View>
          </Pressable>
        ) : (
          <SwipeListView
            data={trips}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={renderSwipeItem}
            renderHiddenItem={renderHiddenItem}
            rightOpenValue={-100}
            previewRowKey={'0'}
            previewOpenDelay={3000}
          />
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR.white, paddingBottom: 10 },
  gptPlusButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: wp(6),
    paddingVertical: hp(1),
    borderRadius: hp(1),
    flexDirection: 'row',
    gap: wp(2),
    alignItems: 'center',
  },
  headerActions: { flexDirection: 'col', alignItems: 'center', gap: wp(3) },
  contentContainer: {
    flex: 1,
    padding: "3%"
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  plusIcon: {
    marginBottom: hp(3),
  },
  emptyTitle: {
    color: '#1E3A8A',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: hp(1.5),
    letterSpacing: 1,
  },
  emptySubtitle: {
    color: '#F59E0B',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: hp(4),
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  benefitsContainer: {
    backgroundColor: '#E8F0FE',
    padding: wp(5),
    borderRadius: hp(3.5),
    borderLeftWidth: 5,
    borderLeftColor: '#3B82F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    marginTop: hp(2),
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(3),
    backgroundColor: 'transparent',
    borderRadius: hp(1.5),
    marginVertical: hp(0.1),
  },
  benefitText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    textAlign: 'left',
    marginLeft: wp(2),
  },
  tripCard: {
    backgroundColor: COLOR.darkGrey,
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: COLOR.lightBlue,
  },
  tripTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tripDate: {
    color: COLOR.lightGray,
    fontSize: 14,
    marginTop: 5,
  },
  deleteText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  hiddenRow: {
    flex: 1,
    alignItems: 'flex-end',
  },
  deleteButton: {
    width: 80,
    height: '90%',
    backgroundColor: 'red',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripImage: {
    width: 120,
    height: "100%",
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  imageLoader: {
    width: 100,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
  },
  cardImageContainer: {
    height: 200,
    position: 'relative', // Added to allow absolute positioning of the edit button
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    justifyContent: "flex-start",
    top: 0,
    left: 0,
    bottom: 0,
  },
  dateText: {
    fontSize: 16,
    color: 'white',
    fontWeight: "500",
  },
  destinationText: {
    fontSize: 28,
    fontWeight: "bold",
    color: 'white',
    marginBottom: hp(0.5)
  },
  countryText: {
    fontSize: 18,
    color: 'white',
    fontWeight: "500",
    marginBottom: hp(0.5)
  },
  companionRow: {
    flexDirection: 'column',
    padding: wp(4)
  },
  detailButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: "#3B82F6",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  detailButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  editButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLOR.primary,
    padding: wp(3),
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    textAlign: 'center',
    color: COLOR.dark,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  }
});

export default TripsScreen;