import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView, StyleSheet, View, ScrollView, Text, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import { AppHeader } from '../../components';
import { COLOR, TEXT_STYLE, hp, wp, commonStyles } from '../../enums/StyleGuide';
import { SVG } from '../../assets/svgs';
import { callChatGptForResponse } from '../../apis/ChatGptApi';
import Toast from 'react-native-toast-message';
import { SCREEN } from '../../enums/AppEnums';
import { getFunFactsPrompt } from '../../apis/Prompts';
import Clipboard from '@react-native-clipboard/clipboard';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const FunFactsScreen = ({ navigation }) => {
  const route = useRoute();
  const { tripId } = route.params;
  const user = useSelector(({ appReducer }) => appReducer.user);
  const [funFacts, setFunFacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [destination, setDestination] = useState('');
  const [tripImageUrl, setTripImageUrl] = useState(null);
  const fadeAnims = useRef([]).current;
  const copyScales = useRef([]).current;

  useEffect(() => {
    const fetchTripImage = async () => {
      try {
        const response = await fetch(`https://openai-proxy-gilt-three.vercel.app/api/unsplash?destination=${destination}`);
        const data = await response.json();
        const imageUrl = data.results[0]?.urls?.small;
        setTripImageUrl(imageUrl);
      } catch (error) {
        console.error('Error fetching trip image:', error);
      }
    };
    if (destination) fetchTripImage();
  }, [destination]);

  useEffect(() => {
    const fetchFunFacts = async () => {
      if (!user?.uid || !tripId) {
        setError('User or trip ID missing');
        setLoading(false);
        return;
      }

      try {
        const tripDoc = await firestore()
          .collection('users')
          .doc(user.uid)
          .collection('trips')
          .doc(tripId)
          .get();

        if (!tripDoc.exists) {
          setError('Trip not found');
          setLoading(false);
          return;
        }

        const tripData = tripDoc.data();
        setDestination(tripData.destination || 'Unknown');

        if (tripData.funFacts && tripData.funFacts.length > 0) {
          setFunFacts(tripData.funFacts);
          setLoading(false);
          // Initialize animations
          fadeAnims.length = 0;
          copyScales.length = 0;
          tripData.funFacts.forEach((_, index) => {
            fadeAnims[index] = new Animated.Value(0);
            copyScales[index] = new Animated.Value(1);
            Animated.timing(fadeAnims[index], {
              toValue: 1,
              duration: 300,
              delay: index * 200,
              useNativeDriver: true,
            }).start();
          });
        } else {
          await regenerateFunFacts(tripData.destination);
        }
      } catch (err) {
        console.error('❌ Error fetching fun facts:', err);
        setError('Failed to load fun facts');
        setLoading(false);
        Toast.show({
          type: 'error',
          text1: 'Failed to load fun facts',
          position: 'top',
          visibilityTime: 2000,
        });
      }
    };

    fetchFunFacts();
  }, [user?.uid, tripId]);

  const regenerateFunFacts = async (dest) => {
    setLoading(true);
    try {
      const funFactsResponse = await callChatGptForResponse(getFunFactsPrompt(dest), "");
      const newFunFacts = funFactsResponse.split('\n').filter(fact => fact.trim().match(/^\d+\./));

      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .update({ funFacts: newFunFacts });

      setFunFacts(newFunFacts);
      // Initialize animations for new facts
      fadeAnims.length = 0;
      copyScales.length = 0;
      newFunFacts.forEach((_, index) => {
        fadeAnims[index] = new Animated.Value(0);
        copyScales[index] = new Animated.Value(1);
        Animated.timing(fadeAnims[index], {
          toValue: 1,
          duration: 300,
          delay: index * 200,
          useNativeDriver: true,
        }).start();
      });
      Toast.show({
        type: 'success',
        text1: 'Fun facts regenerated!',
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (err) {
      console.error('❌ Error regenerating fun facts:', err);
      Toast.show({
        type: 'error',
        text1: 'Failed to regenerate fun facts',
        position: 'top',
        visibilityTime: 2000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyFact = (fact, index) => {
    ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
    Clipboard.setString(fact);
    Toast.show({
      type: 'success',
      text1: 'Fact copied!',
      position: 'top',
      visibilityTime: 2000,
    });

    Animated.sequence([
      Animated.spring(copyScales[index], {
        toValue: 0.8,
        useNativeDriver: true,
      }),
      Animated.spring(copyScales[index], {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const parseFact = (fact) => {
    const match = fact.match(/^\d+\.\s*([^:]+):\s*(.+)$/);
    if (match) {
      return { title: match[1].trim(), description: match[2].trim() };
    }
    return { title: '', description: fact };
  };

  return (
    <LinearGradient colors={['#002953', '#063D78', '#001B39']} style={styles.screenContainer}>
      <SafeAreaView />
      <AppHeader
        leftComp={
          <TouchableOpacity
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
              navigation.navigate(SCREEN.TRIPDETAILS, { tripId });
            }}
          >
            <SVG.BackIcon fill={COLOR.white} />
          </TouchableOpacity>
        }
        title="Fun Facts"
        titleStyle={{ ...TEXT_STYLE.smallTitleBold, color: COLOR.white }}
      />
      <View style={styles.headerImageContainer}>
        {tripImageUrl ? (
          <FastImage
            source={{ uri: tripImageUrl }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage} />
        )}
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.7)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
        <Text style={styles.headerTitle}>{destination}</Text>
      </View>
      <View style={styles.contentContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={COLOR.accent} style={styles.loader} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : funFacts.length > 0 ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {funFacts.map((fact, index) => {
              const { title, description } = parseFact(fact);
              return (
                <Animated.View
                  key={index}
                  style={[styles.factContainer, { opacity: fadeAnims[index] }]}
                >
                  <View style={styles.factContent}>
                    <View style={styles.factHeader}>
                      <SVG.Light width={20} height={20} fill="#F59E0B" style={styles.factIcon} />
                      <Text style={styles.factTitle}>{title}</Text>
                    </View>
                    <Text style={styles.factDescription}>{description}</Text>
                  </View>
                  <Animated.View style={[styles.copyButton, { transform: [{ scale: copyScales[index] }] }]}>
                    <TouchableOpacity
                      onPress={() => handleCopyFact(fact, index)}
                      activeOpacity={0.8}
                    >
                      <SVG.Copy width={20} height={20} fill={COLOR.primary} />
                    </TouchableOpacity>
                  </Animated.View>
                </Animated.View>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={styles.noFactsText}>No fun facts available.</Text>
        )}
      </View>
    </LinearGradient>
  );
};

export default FunFactsScreen;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLOR.primary,
  },
  headerImageContainer: {
    height: hp(20),
    marginHorizontal: wp(5),
    marginTop: hp(1),
    marginBottom: hp(2),
    borderRadius: hp(2),
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  placeholderImage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLOR.lightGray,
  },
  headerTitle: {
    ...TEXT_STYLE.title,
    color: COLOR.white,
    fontSize: 24,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: wp(5),
  },
  scrollContent: {
    paddingBottom: hp(10),
  },
  factContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(2),
    padding: wp(4),
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: hp(1.8),
    ...commonStyles.shadow_3,
  },
  factContent: {
    flex: 1,
  },
  factHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.5),
  },
  factIcon: {
    marginRight: wp(2),
  },
  factTitle: {
    ...TEXT_STYLE.bigTextBold,
    color: COLOR.primary,
  },
  factDescription: {
    ...TEXT_STYLE.text,
    color: '#4B5563',
    lineHeight: 20,
  },
  copyButton: {
    padding: wp(2),
  },
  regenerateButton: {
    position: 'absolute',
    bottom: hp(3),
    right: wp(5),
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLOR.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...commonStyles.shadow_10,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...TEXT_STYLE.textBold,
    color: COLOR.danger,
    textAlign: 'center',
    marginTop: hp(2),
  },
  noFactsText: {
    ...TEXT_STYLE.text,
    color: '#DDEBFF',
    textAlign: 'center',
    marginTop: hp(2),
  },
});
