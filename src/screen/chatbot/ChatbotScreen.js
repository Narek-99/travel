import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView, StyleSheet, View, ScrollView, TextInput, TouchableOpacity, Keyboard, Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import { AppHeader, Label } from '../../components';
import { COLOR, TEXT_STYLE, hp, wp } from '../../enums/StyleGuide';
import { callChatGptForResponse } from '../../apis/ChatGptApi';
import { SVG } from '../../assets/svgs';
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
      }, (error) => console.error('❌ Error fetching trip:', error));
    return () => unsubscribe();
  }, [user?.uid, tripId]);

  const handleQuestionSubmit = async () => {
    if (!userQuery.trim()) return;
    Keyboard.dismiss();
    scrollViewRef.current.scrollToEnd({ animated: true });
    setUserQuery('');
    setMessages(prev => [...prev, { id: Date.now(), text: userQuery, sender: 'user' }]);
    setIsGenerating(true);
    isGeneratingRef.current = true;

    const botMessage = { id: Date.now() + 1, text: '', sender: 'bot' };
    const enrichedPrompt = `
      User's Question: "${userQuery}"
      Context: The user is planning a trip to ${trip.destination}, from ${getDateString(trip.startDate)} to ${getDateString(trip.endDate)}. They will be traveling with ${trip.companion}, and they are interested in ${trip.activities?.join(', ') || 'various activities'}. The user might have preferences for ${trip.accommodation?.join(', ') || 'certain types of accommodation'} and has a budget described as ${trip.budget || 'medium'}.
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
    return (
      <View style={[styles.messageWrapper, isUser ? styles.userMessageWrapper : styles.botMessageWrapper]}>
        <View style={styles.avatarContainer}>
          {isUser ? <SVG.Person width={23} height={23} /> : <SVG.Robot width={35} height={35} />}
        </View>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
          <Text style={styles.messageText}>{item.text}</Text>
        </View>
      </View>
    );
  });

  return (
    <View style={styles.screenContainer}>
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
        title="Chatbot"
        titleStyle={{ ...TEXT_STYLE.smallTitleBold, color: COLOR.dark }}
      />
      <View style={styles.contentContainer}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.messagesContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Start chatting about your trip!</Text>
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
            placeholder="Ask about your trip..."
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
    </View>
  );
};

export default ChatbotScreen;

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
    padding: wp(3),
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
  messageText: {
    color: COLOR.black,
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(3),
    backgroundColor: COLOR.white,
  },
  textInput: {
    flex: 1,
    color: COLOR.black,
    borderRadius: 25,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    fontSize: 16,
    borderWidth: 0.5,
    borderColor: '#333333',
  },
  sendButton: {
    marginLeft: wp(2),
    backgroundColor: COLOR.black,
    borderRadius: 50,
    padding: wp(2.5),
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