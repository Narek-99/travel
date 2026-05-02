import React, { useEffect, useState } from 'react';
import { SafeAreaView, FlatList, View, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import { useSelector } from 'react-redux';
import { AppHeader, Label } from '../../components';
import { COLOR, TEXT_STYLE, hp } from '../../enums/StyleGuide';
import Toast from 'react-native-toast-message';
import { SVG } from '../../assets/svgs';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const HistoryScreen = () => {
  const navigation = useNavigation();
  const user = useSelector(({ appReducer }) => appReducer.user);
  const [messageHistory, setMessageHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const hapticOptions = { enableVibrateFallback: true };

  useEffect(() => {
    const fetchMessageHistory = async () => {
      if (user?.uid) {
        try {
          const snapshot = await firestore()
            .collection('chats')
            .doc(user.uid)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .get();

          const userMessages = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(message => message.sendBy === 'user');

          setMessageHistory(userMessages);
        } catch (error) {
          console.error('Error fetching message history:', error);
          Toast.show({
            visibilityTime: 2000,
            type: 'error',
            text1: 'Failed to load history',
            position: 'top',
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchMessageHistory();
  }, [user?.uid]);

  const handleMessagePress = (message) => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate('ChatScreen', { selectedMessage: message });
  };

  const renderMessageItem = ({ item }) => (
    <Pressable onPress={() => handleMessagePress(item)}>
      <View style={styles.messageItem}>
        <Label style={styles.messageText}>{item.message}</Label>
        <Label style={styles.messageTimestamp}>{new Date(item.timestamp?.seconds * 1000).toLocaleString()}</Label>
      </View>
    </Pressable>
  );

  const renderEmptyState = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color={COLOR.lightBlue} />;
    }
    return <Label style={styles.emptyMessage}>No messages found</Label>;
  };

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView />
      <AppHeader
        leftComp={
          <Pressable onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
            navigation.goBack();
          }}>
            <SVG.BackIcon fill="white" />
          </Pressable>
        }
        title="Dialogue History"
        titleStyle={{ ...TEXT_STYLE.textMedium, color: COLOR.white }}
        style={{ backgroundColor: COLOR.primary }}
      />
      <FlatList
        data={messageHistory}
        renderItem={renderMessageItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default HistoryScreen;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLOR.primary,
  },
  messageList: {
    paddingHorizontal: 15,
    paddingTop: 20,
  },
  messageItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    padding: 15,
    borderRadius: hp(1.6),
    marginVertical: 8,
  },
  messageText: {
    color: 'white',
    fontSize: 16,
  },
  messageTimestamp: {
    color: '#DDEBFF',
    fontSize: 12,
    marginTop: 5,
  },
  emptyMessage: {
    color: '#DDEBFF',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
});
