import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView, StyleSheet, View, Pressable, Text, TouchableOpacity, Animated } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import Markdown from 'react-native-markdown-display';
import { AppHeader } from '../../components';
import { COLOR, TEXT_STYLE, hp, wp } from '../../enums/StyleGuide';
import { SVG } from '../../assets/svgs';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import * as Animatable from 'react-native-animatable';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';

const DayByDayPlanScreen = ({ navigation }) => {
  const route = useRoute();
  const { tripId } = route.params;
  const user = useSelector(({ appReducer }) => appReducer.user);


  const [showFullPlan, setShowFullPlan] = useState(false);
  const planHeight = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState(0);
  const maxCollapsedHeight = 500;
  const scrollViewRef = useRef();

  const [aiPlan, setAiPlan] = useState(null);
  const [loadingTripPlan, setLoadingTripPlan] = useState(true);

  useEffect(() => {
    if (!user?.uid || !tripId) return;

    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .collection('trips')
      .doc(tripId)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            const data = doc.data();
            setAiPlan(data.aiPlan);
            setLoadingTripPlan(data.aiPlan === null || !data.aiPlan);
          }
        },
        (error) => {
          console.error('❌ Error fetching trip data:', error);
          setLoadingTripPlan(false);
        }
      );

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [user?.uid, tripId]);

  const togglePlanHeight = () => {
    const finalHeight = showFullPlan ? maxCollapsedHeight : contentHeight;

    Animated.timing(planHeight, {
      toValue: finalHeight,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setShowFullPlan(!showFullPlan);
    });
  };

  const copyToClipboard = () => {
    if (aiPlan) {
      Clipboard.setString(aiPlan);
      ReactNativeHapticFeedback.trigger('impactMedium', { enableVibrateFallback: true });
      Toast.show({ type: 'success', text1: 'Copied!', position: 'top' });
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView />
      <AppHeader
        leftComp={
          <Pressable
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
              navigation.goBack();
            }}
          >
            <SVG.BackIcon fill={COLOR.dark} />
          </Pressable>
        }
        title="Day-by-Day Plan"
        titleStyle={{ ...TEXT_STYLE.smallTitleBold, color: COLOR.dark }}
      />

      <KeyboardAwareScrollView
        innerRef={(ref) => (scrollViewRef.current = ref)}
        extraScrollHeight={hp(3)}
        contentContainerStyle={{ paddingTop: hp(1) }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.tripPlanTitle}>Your Day-by-Day Itinerary</Text>

        {loadingTripPlan && (
          <Text
            style={{
              fontSize: 16,
              padding: wp(5),
              fontStyle: 'italic',
              textAlign: 'center',
              color: COLOR.mediumGray,
            }}
          >
            🧠 Creating your perfect travel plan based on your preferences... This may take a moment – it's worth the wait! ✨
          </Text>
        )}

        {loadingTripPlan ? (
          <SkeletonPlaceholder borderRadius={10}>
            <View style={styles.card}>
              <View style={{ height: 22, width: '70%', marginBottom: 10 }} />
              <View style={{ height: 14, width: '90%', marginBottom: 8 }} />
              <View style={{ height: 14, width: '95%', marginBottom: 8 }} />
              <View style={{ height: 14, width: '60%' }} />
            </View>
          </SkeletonPlaceholder>
        ) : aiPlan ? (
          <Animatable.View animation="fadeInUp" duration={600} style={styles.card}>
            <Animated.View
              style={{
                height: contentHeight > maxCollapsedHeight && !showFullPlan ? planHeight : 'auto',
                overflow: 'hidden',
              }}
            >
              <View
                onLayout={(event) => {
                  const height = event.nativeEvent.layout.height;
                  setContentHeight(height);
                  if (!showFullPlan) {
                    planHeight.setValue(Math.min(height, maxCollapsedHeight));
                  }
                }}
              >
                <Pressable onLongPress={copyToClipboard}>
                  <Markdown style={markdownStyles}>{aiPlan}</Markdown>
                </Pressable>
              </View>
            </Animated.View>

            {contentHeight > maxCollapsedHeight && (
              <TouchableOpacity onPress={togglePlanHeight} style={{ marginTop: 12 }}>
                <Text
                  style={{
                    textAlign: 'center',
                    color: '#0084FF',
                    fontWeight: 'bold',
                    marginTop: hp(2),
                  }}
                >
                  {showFullPlan ? 'Show Less ▲' : 'Show More ▼'}
                </Text>
              </TouchableOpacity>
            )}
          </Animatable.View>
        ) : (
          <Text
            style={{
              fontSize: 16,
              padding: wp(5),
              textAlign: 'center',
              color: COLOR.mediumGray,
            }}
          >
            No plan available. Please generate a plan in the Trip Details screen.
          </Text>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
};

export default DayByDayPlanScreen;

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
  tripPlanTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0084FF',
    paddingHorizontal: wp(5),
    marginTop: hp(2),
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