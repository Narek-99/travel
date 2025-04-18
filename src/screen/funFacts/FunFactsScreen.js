import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView, StyleSheet, View, ScrollView, Text, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import { AppHeader } from '../../components';
import { COLOR, TEXT_STYLE, hp, wp } from '../../enums/StyleGuide';
import { SVG } from '../../assets/svgs';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { callChatGptForResponse } from '../../apis/ChatGptApi';
import Toast from 'react-native-toast-message';
import { SCREEN } from '../../enums/AppEnums';

const FunFactsScreen = ({ navigation }) => {
  const route = useRoute();
  const { tripId } = route.params;
  const user = useSelector(({ appReducer }) => appReducer.user);
  const [funFacts, setFunFacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [destination, setDestination] = useState('');
  const fadeAnims = useRef(funFacts.map(() => new Animated.Value(0))).current;

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
          // Initialize fade animations for existing facts
          fadeAnims.current = tripData.funFacts.map(() => new Animated.Value(0));
          tripData.funFacts.forEach((_, index) => {
            Animated.timing(fadeAnims.current[index], {
              toValue: 1,
              duration: 300,
              delay: index * 100,
              useNativeDriver: true,
            }).start();
          });
        } else {
          // Generate fun facts if none exist
          const funFactsPrompt = `
            Provide exactly 15 highly engaging, unique, and surprising fun facts about ${tripData.destination}, tailored for a travel app to captivate and inspire travelers. At least 3 facts must focus on famous people who lived or worked there, each including a fun or memorable story about their time in the city. At least 3 additional facts should tell quirky or fascinating stories about the city’s history, culture, or landmarks. Each fact must be concise (1-2 sentences), positive, and exciting to read. Format the response as a plain text numbered list (1. to 15.), with each fact starting with a number and a period (e.g., "1. ..."). Do not include any introductory text, headings, or extra formatting beyond the numbered list.
          `;
          const funFactsResponse = await callChatGptForResponse(funFactsPrompt, "35");
          const newFunFacts = funFactsResponse.split('\n').filter(fact => fact.trim().match(/^\d+\./));

          await firestore()
            .collection('users')
            .doc(user.uid)
            .collection('trips')
            .doc(tripId)
            .update({ funFacts: newFunFacts });

          setFunFacts(newFunFacts);
          setLoading(false);
          // Initialize and start fade animations for new facts
          fadeAnims.current = newFunFacts.map(() => new Animated.Value(0));
          newFunFacts.forEach((_, index) => {
            Animated.timing(fadeAnims.current[index], {
              toValue: 1,
              duration: 300,
              delay: index * 100,
              useNativeDriver: true,
            }).start();
          });
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

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView />
      <AppHeader
        leftComp={
          <TouchableOpacity
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
              navigation.navigate(SCREEN.TRIPDETAILS, { tripId });
            }}
          >
            <SVG.BackIcon fill={COLOR.dark} />
          </TouchableOpacity>
        }
        title={`Fun Facts about ${destination}`}
        titleStyle={{ ...TEXT_STYLE.smallTitleBold, color: COLOR.dark }}
      />
      <View style={styles.contentContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={COLOR.dark} style={styles.loader} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : funFacts.length > 0 ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {funFacts.map((fact, index) => (
              <Animated.View
                key={index}
                style={[styles.factContainer, { opacity: fadeAnims.current[index] }]}
              >
                <Text style={styles.factText}>{fact}</Text>
              </Animated.View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.noFactsText}>No fun facts available.</Text>
        )}
      </View>
    </View>
  );
};

export default FunFactsScreen;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLOR.white,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
  },
  scrollContent: {
    paddingBottom: hp(6),
  },
  factContainer: {
    marginBottom: hp(2.5),
    padding: wp(4),
    backgroundColor: COLOR.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  factText: {
    ...TEXT_STYLE.text,
    color: COLOR.dark,
    fontSize: 15,
    lineHeight: 22,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...TEXT_STYLE.text,
    color: COLOR.red,
    textAlign: 'center',
    marginTop: hp(2),
  },
  noFactsText: {
    ...TEXT_STYLE.text,
    color: COLOR.mediumGray,
    textAlign: 'center',
    marginTop: hp(2),
  },
});