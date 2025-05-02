import React, { useEffect, useState, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Text,
  Animated,
  KeyboardAvoidingView
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import { AppHeader } from '../../components';
import { COLOR, TEXT_STYLE, hp, wp } from '../../enums/StyleGuide';
import { callChatGptForResponse } from '../../apis/ChatGptApi';
import { SVG } from '../../assets/svgs';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const ChatbotScreen = ({ navigation }) => {
  const user = useSelector(({ appReducer }) => appReducer.user);
  const route = useRoute();
  const { tripId } = route.params;
  const [trip, setTrip] = useState(null);
  const [userQuery, setUserQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const timeoutRef = useRef(null);
  const isGeneratingRef = useRef(false);
  const scrollViewRef = useRef();
  const inputRef = useRef(null);
  const ringAnim = useRef(new Animated.Value(0)).current;

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
      }, error => console.error('❌ Error fetching trip:', error));
    return () => unsubscribe();
  }, [user?.uid, tripId]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [ringAnim]);

  const handleQuestionSubmit = async () => {
    if (!userQuery.trim()) return;
    Keyboard.dismiss();
    const userMessage = { id: Date.now(), text: userQuery, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    scrollViewRef.current.scrollToEnd({ animated: true });
    setUserQuery('');
    setIsGenerating(true);
    isGeneratingRef.current = true;

    const botMessage = { id: Date.now() + 1, text: '', sender: 'bot' };
    const enrichedPrompt = `
      User's Question: "${userQuery}"
      Context: The user is planning a trip to ${trip.destination}, from ${getDateString(trip.startDate)} to ${getDateString(trip.endDate)}. They will be traveling with ${trip.companion}, and they are interested in ${trip.activities?.join(', ') || 'various activities'}. The user prefers staying in ${trip.accommodation || 'any type of accommodation'} and has a budget described as ${trip.budget || 'medium'}.
      Answer the question taking into account these details about their trip.
    `;

    try {
      const response = await callChatGptForResponse(enrichedPrompt, "35");
      let index = 0;
      const addCharacter = () => {
        if (index < response.length && isGeneratingRef.current) {
          botMessage.text += response.charAt(index++);
          setMessages(prev => [...prev.filter(m => m.id !== botMessage.id), { ...botMessage }]);
          if (index % 10 === 0) scrollViewRef.current?.scrollToEnd({ animated: true });
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
      setMessages(prev => [...prev, { id: Date.now(), text: "Failed to get response", sender: 'bot' }]);
    }
  };

  const handleStopGeneration = () => {
    clearTimeout(timeoutRef.current);
    setIsGenerating(false);
    isGeneratingRef.current = false;
  };

  const getDateString = (timestamp) => {
    if (!timestamp?.toDate) return '';
    return timestamp.toDate().toISOString().split('T')[0];
  };

  const MessageBubble = React.memo(({ item }) => {
    const isUser = item.sender === 'user';

    const handleLongPress = () => {
      ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
      Clipboard.setString(item.text);
      Toast.show({
        type: 'success',
        text1: isUser ? 'Question copied!' : 'Answer copied!',
        position: 'top',
        visibilityTime: 2000,
      });
    };

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={handleLongPress}
        delayLongPress={300}
        style={[styles.messageWrapper, isUser ? styles.userMessageWrapper : styles.botMessageWrapper]}
      >
        <View style={styles.avatarContainer}>
          {isUser ? (
            <SVG.Person fill="#00A3FF" width={25} height={25} />
          ) : (
            <SVG.Eagle width={25} height={25} />
          )}
        </View>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
          <Text style={styles.messageText}>{item.text}</Text>
        </View>
      </TouchableOpacity>
    );
  });



  return (
    <View style={styles.screenContainer}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <SafeAreaView />
        <AppHeader
          leftComp={
            <TouchableOpacity
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
                navigation.goBack();
              }}
            >
              <SVG.BackIcon fill={COLOR.dark} />
            </TouchableOpacity>
          }
          title="Travel AI"
          titleStyle={{ ...TEXT_STYLE.smallTitleBold, color: COLOR.dark }}
        />
        <View style={styles.contentContainer}>
          {messages.length === 0 && (
            <View style={styles.ringContainer}>
              <SVG.Eagle width={40} height={40} style={styles.eagle} />
              <Animated.View style={[styles.ring, {
                opacity: ringAnim,
                transform: [{
                  scale: ringAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1.5],
                  }),
                }],
              }]} />
            </View>
          )}
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.messagesContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Ask Travel AI about your trip!</Text>
              </View>
            ) : (
              messages.map((item, index) => <MessageBubble key={item.id ?? index} item={item} />)
            )}
          </ScrollView>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              ref={inputRef}
              placeholderTextColor={COLOR.lightGray}
              value={userQuery}
              onChangeText={setUserQuery}
              placeholder="Ask Travel AI..."
              onSubmitEditing={handleQuestionSubmit}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={isGenerating ? handleStopGeneration : handleQuestionSubmit}
            >
              {isGenerating ? (
                <SVG.Stop fill="#fff" width={15} height={15} />
              ) : (
                <SVG.Send fill="#fff" width={15} height={15} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ChatbotScreen;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
  },
  ringContainer: {
    position: 'absolute',
    top: hp(8),
    left: wp(42),
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  ring: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: COLOR.primary,
  },
  eagle: {
    zIndex: 2,
  },
  messagesContainer: {
    flexGrow: 1,
    paddingBottom: hp(2),
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: hp(1),
  },
  userMessageWrapper: {
    flexDirection: 'row-reverse',
  },
  botMessageWrapper: {
    flexDirection: 'row',
  },
  avatarContainer: {
    marginHorizontal: wp(3),
    marginTop: hp(1),
  },
  messageBubble: {
    maxWidth: '80%',
    padding: wp(3),
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: 'transparent',
    borderTopRightRadius: 0,
  },
  botBubble: {
    backgroundColor: COLOR.white,
    borderTopLeftRadius: 0,
    shadowColor: COLOR.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: {
    color: COLOR.black,
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1),
    borderTopColor: '#E0E0E0',
    borderRadius: 25,
    marginBottom: hp(2),
    paddingHorizontal: wp(3),
    backgroundColor: COLOR.white,
    shadowColor: COLOR.black,
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  textInput: {
    flex: 1,
    color: COLOR.black,
    borderRadius: 25,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    fontSize: 16,
    borderWidth: 0.2,
    borderColor: COLOR.lightGray,
  },
  sendButton: {
    marginLeft: wp(2),
    backgroundColor: COLOR.primary,
    borderRadius: 25,
    padding: wp(2.5),
    shadowColor: COLOR.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: hp(5),
  },
  emptyText: {
    fontSize: 16,
    color: COLOR.mediumGray,
    textAlign: 'center',
  },
});
