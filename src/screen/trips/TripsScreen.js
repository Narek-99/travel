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

const TripsScreen = ({ navigation }) => {
  const user = useSelector(({ appReducer }) => appReducer.user);
  const [trips, setTrips] = useState([]);
  const hapticOptions = { enableVibrateFallback: true };
  const [tripImages, setTripImages] = useState({});
  const [loadingImages, setLoadingImages] = useState({});
  const [lastFetchedDestinations, setLastFetchedDestinations] = useState({});
  const hasShownRating = useRef(false);
  const { showRating } = useRating();
  const translateAnims = useRef({}).current; // Store animation values for each trip

  useEffect(() => {
    if (user?.uid && !hasShownRating.current) {
      showRating();
      hasShownRating.current = true;
    }
  }, [showRating, user?.uid]);

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

  useFocusEffect(
    useCallback(() => {
      if (user?.uid) {
        fetchTrips();
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
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate(SCREEN.DESTINATION);
  };

  const handleAccessPress = () => {
    navigation.navigate(SCREEN.ADVANTAGE);
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
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
      <LinearGradient
        colors={['#002953', '#063D78', '#001B39']}
        locations={[0, 0.45, 1]}
        style={styles.background}
      />
      <View style={styles.glowTop} />
      <SafeAreaView />
      <AppHeader
        style={styles.header}
        leftComp={
          <Pressable onPress={() => {
            navigation.navigate(SCREEN.SETTINGS);
            ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
          }} style={styles.headerIconButton}>
            <SVG.Settings fill={COLOR.white} />
          </Pressable>
        }
        centerComp={
          <View style={styles.headerActions}>
            <Pressable
              style={styles.gptPlusButton}
              onPress={handleAccessPress}
            >
              <SVG.Flash fill={COLOR.accent} />
              <Label style={styles.accessText}>Prime Access</Label>
            </Pressable>
          </View>
        }
        rightComp={
          <Pressable onPress={handleAddTripNavigation} style={styles.headerIconButton}>
            <SVG.Plus width="22" height="22" fill={COLOR.white} />
          </Pressable>
        }
      />

      <View style={styles.titleBlock}>
        <Label style={styles.screenEyebrow}>Triposo Planner</Label>
        <Label style={styles.screenTitle}>Your trips</Label>
      </View>

      <Pressable style={styles.contentContainer}>
        {trips.length === 0 ? (
          <Pressable onPress={handleAddTripNavigation} style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <SVG.Plus fill={COLOR.accent} width={wp(8)} height={wp(8)} />
            </View>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySubtitle}>Create your first itinerary and let Triposo shape the journey.</Text>
            <View style={styles.benefitsContainer}>
              <View style={styles.benefitItem}>
                <View style={styles.benefitDot} />
                <Text style={styles.benefitText}>Plan your trip day by day</Text>
              </View>
              <View style={styles.benefitItem}>
                <View style={styles.benefitDot} />
                <Text style={styles.benefitText}>Get smart tips from Triposo</Text>
              </View>
              <View style={styles.benefitItem}>
                <View style={styles.benefitDot} />
                <Text style={styles.benefitText}>Find flights, hotels, and local gems</Text>
              </View>
              <View style={styles.benefitItem}>
                <View style={styles.benefitDot} />
                <Text style={styles.benefitText}>Personalize every plan to your interests</Text>
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
  container: { flex: 1, backgroundColor: COLOR.primary, paddingBottom: 10 },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  glowTop: {
    position: 'absolute',
    top: hp(8),
    right: -wp(20),
    width: wp(58),
    height: wp(58),
    borderRadius: wp(29),
    backgroundColor: 'rgba(254, 163, 0, 0.16)',
  },
  header: {
    paddingHorizontal: wp(5),
  },
  headerIconButton: {
    width: hp(4.8),
    height: hp(4.8),
    borderRadius: hp(2.4),
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gptPlusButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderRadius: hp(3),
    flexDirection: 'row',
    gap: wp(2),
    alignItems: 'center',
  },
  accessText: {
    color: '#FFF4D6',
    fontWeight: '700',
    fontSize: 13,
  },
  headerActions: { flexDirection: 'col', alignItems: 'center', gap: wp(3) },
  titleBlock: {
    paddingHorizontal: wp(5),
    marginBottom: hp(1),
  },
  screenEyebrow: {
    ...TEXT_STYLE.smallTextSemiBold,
    color: '#FFE0A6',
    marginBottom: hp(0.4),
  },
  screenTitle: {
    ...TEXT_STYLE.title,
    color: COLOR.white,
    fontWeight: '800',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderRadius: hp(2.5),
    marginBottom: hp(1),
  },
  emptyTitle: {
    color: COLOR.white,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: hp(1),
  },
  emptySubtitle: {
    color: '#DDEBFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: hp(2.4),
  },
  emptyIcon: {
    width: wp(18),
    height: wp(18),
    borderRadius: wp(9),
    backgroundColor: 'rgba(254, 163, 0, 0.16)',
    borderColor: 'rgba(254, 163, 0, 0.34)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(2),
  },
  benefitsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    padding: wp(4),
    borderRadius: hp(2),
    width: '100%',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(0.8),
  },
  benefitText: {
    color: COLOR.white,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    flex: 1,
  },
  benefitDot: {
    width: hp(0.8),
    height: hp(0.8),
    borderRadius: hp(0.4),
    backgroundColor: COLOR.accent,
    marginRight: wp(2.5),
  },
  tripCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
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
    color: COLOR.primary,
    marginBottom: 4,
  },
  infoDate: {
    ...TEXT_STYLE.textSmall,
    color: '#4B5563',
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
    backgroundColor: COLOR.danger,
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
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: hp(2),
    marginBottom: hp(2),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  cardImageContainer: {
    height: hp(24),
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
    right: 0,
  },
  dateText: {
    fontSize: 14,
    color: 'white',
    fontWeight: "500",
  },
  destinationText: {
    fontSize: 26,
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
    backgroundColor: COLOR.accent,
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(4),
    borderRadius: hp(2),
  },
  detailButtonText: {
    color: COLOR.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  editButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 41, 83, 0.78)',
    padding: wp(3),
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TripsScreen;
