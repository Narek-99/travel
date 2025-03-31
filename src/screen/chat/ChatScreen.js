import React, { useEffect, useState, useRef } from 'react';
import { FlatList, SafeAreaView, StyleSheet, View, TextInput, TouchableOpacity, Text, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useSelector } from 'react-redux';
import { AppHeader, Label, SubscriptionSheet, SuggestionSheet, ToolSheet } from '../../components';
import { COLOR, TEXT_STYLE, wp, hp } from '../../enums/StyleGuide';
import { SCREEN } from '../../enums/AppEnums';
import { callChatGptForResponse } from '../../apis/ChatGptApi';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import RBSheet from 'react-native-raw-bottom-sheet';
import Toast from 'react-native-toast-message';
import Clipboard from '@react-native-clipboard/clipboard';
import { useRoute } from '@react-navigation/native';
import { SVG } from '../../assets/svgs';
import useRating from '../../utils/useRating';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChatScreen = ({ navigation }) => {
  const toolsData = {
    ask: '💬  Ask AI',
    detect: '🤖  AI Detector',
    essay: '📝  Essay Writer',
    summarize: '📑  Summarizer',
    enhance: '✍️  Text Enhancer'
  };
  const route = useRoute();
  const flatListRef = useRef(null);
  const subscriptionSheetRef = useRef(null);
  const suggestionSheetRef = useRef(null);
  const toolSheetRef = useRef(null);
  // const { showRating } = useRating();
  const user = useSelector(({ appReducer }) => appReducer.user);

  const [chatMessages, setChatMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const selectedMessage = route.params?.selectedMessage;

  const hapticOptions = { enableVibrateFallback: true };
  const [currentTool, setCurrentTool] = useState('ask');


  useEffect(() => {
    let unsubscribeMessages = null;
    if (user?.uid) {
      const messagesQuery = firestore()
        .collection('chats')
        .doc(user.uid)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .limit(2);

      if (selectedMessage) {
        messagesQuery.where('timestamp', '>=', selectedMessage.timestamp).onSnapshot(querySnapshot => {
          const allMessages = [];
          querySnapshot.forEach(docSnap => {
            allMessages.push({
              ...docSnap.data(),
              docId: docSnap.id,
            });
          });
          setChatMessages(allMessages);
          if (allMessages.length !== 0) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          }
        });
      }
    }

    return () => {
      if (unsubscribeMessages) {
        unsubscribeMessages();
      }
    };
  }, [user?.uid, selectedMessage]);

  const saveMessageToFirestore = async (message) => {
    if (user?.uid) {
      await firestore()
        .collection('chats')
        .doc(user.uid)
        .collection('messages')
        .add(message);
    }
  };

  const handleSendMessage = async () => {
    const userMessage = {
      sendBy: 'user',
      message: inputText,
      timestamp: firestore.FieldValue.serverTimestamp(),
    };

    setChatMessages(prevMessages => [...prevMessages, userMessage]);
    setInputText('');
    await saveMessageToFirestore(userMessage);

    try {
      const chatGptResponse = await callChatGptForResponse(inputText, currentTool);
      const botMessage = {
        sendBy: 'bot',
        message: '',
        timestamp: firestore.FieldValue.serverTimestamp(),
      };

      setChatMessages(prevMessages => [...prevMessages, botMessage]);

      let currentMessage = '';
      chatGptResponse.split('').forEach((char, index) => {
        setTimeout(() => {
          currentMessage += char;
          setChatMessages(prevMessages => {
            const updatedMessages = [...prevMessages];
            updatedMessages[updatedMessages.length - 1].message = currentMessage;
            return updatedMessages;
          });
        }, 15 * index);
      });

      setTimeout(async () => {
        botMessage.message = currentMessage;
        await saveMessageToFirestore(botMessage);
      }, 10 * chatGptResponse.length);

      // setTimeout(() => showRating(), 3000);
    } catch (error) {
      console.error('Error fetching AI response:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      const hasUsedFree = await AsyncStorage.getItem('@FREE_TRANSACTIONS');
      const lastUsage = await AsyncStorage.getItem('@LAST_TRANSACTION_TIME');
      const usageCount = await AsyncStorage.getItem('@USAGE_COUNT');
      const currentTime = new Date().getTime();

      let count = usageCount ? parseInt(usageCount, 10) : 0;
      const timeDifference = lastUsage ? currentTime - parseInt(lastUsage, 10) : 86400000;

      // Reset count if more than an hour has passed (600000 milliseconds = 10 min)
      if (timeDifference >= 600000) {
        count = 0; // Reset the count after 10 min
      }

      // Check if the user has exceeded the hourly limit of 10 requests
      if (count >= 15) {
        Toast.show({
          visibilityTime: 2000,
          type: 'error',
          text1: 'You are sending messages too fast.',
          text2: 'Please try again later.',
          position: 'top',
        });
        return;
      }

      // Increment the usage count and save it
      count += 1;
      await AsyncStorage.setItem('@USAGE_COUNT', count.toString());
      await AsyncStorage.setItem('@LAST_TRANSACTION_TIME', currentTime.toString());

      // If the user does not have a subscription, show the subscription prompt
      if (user?.subscription === false) {
        if (hasUsedFree === 'true' && subscriptionSheetRef.current) {
          subscriptionSheetRef.current.open();
          return;
        }
        await AsyncStorage.setItem('@FREE_TRANSACTIONS', 'true');
      }

      // Proceed with sending the message
      await handleSendMessage();
    } catch (error) {
      Toast.show({
        visibilityTime: 2000,
        type: 'error',
        text1: 'Something went wrong.',
        text2: 'Please check your internet connection or try again.',
        position: 'top',
      });
      console.error('Error sending message:', error);
    }
  };

  const handleCopyToClipboard = (text) => {
    Clipboard.setString(text);
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    Toast.show({
      visibilityTime: 2000,
      type: 'success',
      text1: 'Copied to Clipboard!',
      position: 'top',
    });
  };

  const renderMessageItem = ({ item }) => {
    const isUserMessage = item.sendBy === 'user';
    return (
      <Pressable onLongPress={() => handleCopyToClipboard(item.message)}>
        <View style={[styles.messageContainer, isUserMessage ? styles.userMessage : styles.botMessage]}>
          <Text style={styles.messageText}>{item.message}</Text>
        </View>
      </Pressable>
    );
  };

  useEffect(() => {
    if (user?.subscription === false && subscriptionSheetRef.current) {
      subscriptionSheetRef.current.open();
    }
  }, [user?.subscription]);

  return (
    <View style={styles.container}>
      <SafeAreaView />
      <AppHeader
        leftComp={<Pressable onPress={() => { navigation.navigate(SCREEN.HISTORY); ReactNativeHapticFeedback.trigger('impactLight', hapticOptions); }}>
          <SVG.GripLines fill='white' />
        </Pressable>}
        centerComp={
          <View style={styles.headerActions}>
            <Pressable style={styles.gptPlusButton} onPress={() => { if (user?.subscription === false && subscriptionSheetRef.current) { subscriptionSheetRef.current.open(); ReactNativeHapticFeedback.trigger('impactLight', hapticOptions); } }}>
              <SVG.Flash fill='#99FF00' />
              <Label style={{ ...TEXT_STYLE.textSemiBold }}>{user?.subscription === true ? "  PRO" : "  Get Access"}</Label>
            </Pressable>
          </View>
        }
        rightComp={<Pressable onPress={() => { navigation.navigate(SCREEN.SETTINGS); ReactNativeHapticFeedback.trigger('impactLight', hapticOptions); }}>
          <SVG.Settings fill='white' />
        </Pressable>}
        style={{ backgroundColor: COLOR.black }}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        <Pressable onPress={() => {
          toolSheetRef.current && toolSheetRef.current.open(); ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
        }} >
          <View style={styles.emptyMessageContainer1}>
            {currentTool ? (
              <Text style={styles.currentToolText}>Current Tool:   {toolsData[currentTool]} </Text>
            ) : null}
          </View>
        </Pressable>

        <FlatList
          ref={flatListRef}
          data={chatMessages}
          renderItem={renderMessageItem}
          keyExtractor={item => item.docId}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {chatMessages.length < 1 && currentTool === "ask" && (
          <View style={styles.emptyMessageContainer}>
            <Label style={{ ...TEXT_STYLE.textSemiBold }}>Get question ideas! 😊</Label>
            <Pressable onPress={() => suggestionSheetRef.current && suggestionSheetRef.current.open()} style={styles.suggestionButton}>
              <Label style={{ ...TEXT_STYLE.textSemiBold, paddingHorizontal: wp(2) }}> 🤌  Suggestions</Label>
            </Pressable>
          </View>
        )}

        <View style={styles.inputArea}>
          <TextInput
            style={styles.textInput}
            placeholder="Message"
            placeholderTextColor="#CCCCCC"
            value={inputText}
            onChangeText={setInputText}
            multiline={true}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {user?.subscription === false && (
        <RBSheet
          ref={subscriptionSheetRef}
          useNativeDriver={false}
          draggable
          height={hp(85)}
          customStyles={{
            wrapper: { backgroundColor: 'transparent' },
            draggableIcon: { backgroundColor: COLOR.black },
            container: {
              backgroundColor: COLOR.black,
              shadowColor: COLOR.black,
              shadowOffset: { width: 2, height: 12 },
              shadowOpacity: 0.58,
              shadowRadius: 16,
              elevation: 24,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }
          }}
          customModalProps={{ animationType: 'slide', statusBarTranslucent: true }}
          customAvoidingViewProps={{ enabled: false }}
        >
          <SubscriptionSheet refRBSheet={subscriptionSheetRef} />
        </RBSheet>
      )}

      <RBSheet
        ref={suggestionSheetRef}
        useNativeDriver={false}
        draggable
        height={hp(85)}
        customStyles={{
          wrapper: { backgroundColor: 'transparent' },
          draggableIcon: { backgroundColor: COLOR.white },
          container: {
            backgroundColor: COLOR.black,
            shadowColor: COLOR.white,
            shadowOffset: { width: 2, height: 12 },
            shadowOpacity: 0.58,
            shadowRadius: 16,
            elevation: 24,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }
        }}
        customModalProps={{ animationType: 'slide', statusBarTranslucent: true }}
        customAvoidingViewProps={{ enabled: false }}
      >
        <SuggestionSheet refRBSheet={suggestionSheetRef} setText={setInputText} />
      </RBSheet>

      <RBSheet
        ref={toolSheetRef}
        useNativeDriver={false}
        draggable
        height={hp(85)}
        customStyles={{
          wrapper: { backgroundColor: 'transparent' },
          draggableIcon: { backgroundColor: COLOR.white },
          container: {
            backgroundColor: COLOR.black,
            shadowColor: COLOR.white,
            shadowOffset: { width: 2, height: 12 },
            shadowOpacity: 0.58,
            shadowRadius: 16,
            elevation: 24,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }
        }}
        customModalProps={{ animationType: 'slide', statusBarTranslucent: true }}
        customAvoidingViewProps={{ enabled: false }}
      >
        <ToolSheet refRBSheet={toolSheetRef} currentTool={currentTool} setCurrentTool={setCurrentTool} />
      </RBSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.black,
    paddingBottom: 10,
  },
  messageList: {
    paddingHorizontal: 15,
  },
  messageContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 8,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#1a1a1a',
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#333333',
  },
  messageText: {
    color: COLOR.white,
    fontSize: 16,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 15,
  },
  textInput: {
    flex: 1,
    color: COLOR.white,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#222222',
    borderColor: '#333333',
    borderWidth: 1,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#0084FF',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  sendButtonText: {
    color: COLOR.white,
    fontSize: 16,
  },
  gptPlusButton: {
    backgroundColor: '#191919',
    paddingHorizontal: wp(6),
    paddingVertical: hp(1),
    borderRadius: hp(1),
    flexDirection: 'row',
    gap: wp(1),
    alignItems: 'center'
  },
  headerActions: {
    flexDirection: 'col',
    alignItems: 'center',
    gap: wp(3),
  },
  emptyMessageContainer: {
    backgroundColor: '#191919',
    padding: wp(4),
    borderRadius: wp(2),
    marginBottom: hp(2),
    marginHorizontal: wp(2),
    alignSelf: 'flex-start',
    maxWidth: '70%',
  },
  emptyMessageContainer1: {
    padding: wp(2),
    backgroundColor: '#191919',
    borderRadius: wp(2),
    marginHorizontal: wp(2),
    marginTop: hp(1),
    marginBottom: hp(2),
    alignSelf: 'flex-start',
    maxWidth: '70%',
  },
  suggestionButton: {
    backgroundColor: '#7548E3',
    maxWidth: wp(35),
    borderRadius: wp(1),
    paddingVertical: wp(1.2),
    marginTop: hp(2),
    alignItems: 'center',
  },
  currentToolText: {
    color: '#99FF00',
    ...TEXT_STYLE.textSemiBold,
  },
});

export default ChatScreen;
