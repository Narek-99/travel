import { ActivityIndicator, Linking, SafeAreaView, StyleSheet, View, Share } from 'react-native'
import React, { useState } from 'react'
import { COLOR, hp, TEXT_STYLE, wp } from '../../enums/StyleGuide'
import { AppHeader, Label, Pressable } from '../../components'
import { SVG } from '../../assets/svgs'
import { FIREBASE_COLLECTIONS, SCREEN } from '../../enums/AppEnums'
import { useSelector } from 'react-redux'
import { DeleteMessages } from '../../services/FirebaseMethods'
import Toast from 'react-native-toast-message'
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const options = {
  enableVibrateFallback: true
};

const SettingScreen = ({ navigation }) => {
  const user = useSelector(({ appReducer }) => appReducer.user);
  const [loading, setLoading] = useState(false)

  const openPrivacyPolicy = () => {
    Linking.openURL('https://docs.google.com/document/d/1v0fMkViBl7NbAKbzsyYGJ3f7OUHcXkdsvqVBu2MW1Fk/edit?usp=drive_link');
  };

  const openTermsOfUse = () => {
    Linking.openURL('https://docs.google.com/document/d/14djrKrMOClxo0Qz_2wDxJ-iCphE4vmnx7Kvs1Y0n8fo/edit?usp=sharing');
  };

  const handleSupportPress = () => {
    Linking.openURL('mailto:arshaluysasriyan1961@gmail.com');
  }
  const handleDeleteChats = async () => {
    try {
      setLoading(true)
      await DeleteMessages(FIREBASE_COLLECTIONS.CHATS, user?.uid);
      Toast.show({
        visibilityTime: 2000,
        type: 'success',
        text1: "Dialogue History cleared!",
        position: 'top',
      })

    } catch (error) {
      console.log(error)
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView></SafeAreaView>
      <AppHeader
        leftComp={
          <Pressable onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', options);
            navigation.navigate(SCREEN.TRIPS);

          }}>
            <SVG.BackIcon fill="black" />
          </Pressable>
        }
        title={"Settings"}
        titleStyle={{ ...TEXT_STYLE.smallTitleBold, color: COLOR.black }}
      />
      <View style={styles.innerContainer}>
        <Pressable style={styles.pressBtn} onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight', options);
          handleDeleteChats();
        }}>
          {
            loading ?
              <ActivityIndicator size={'small'} color={COLOR.lightBlue} />
              :
              <Label style={styles.pressBtnText}>Clear History</Label>
          }
        </Pressable>

        {!user?.subscription && (
          <Pressable style={styles.pressBtn} onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', options);
            navigation.navigate(SCREEN.SUBSCRIPTION, { from: 'settings' })
          }}>
            <Label style={styles.pressBtnText}>Subscribe</Label>
          </Pressable>
        )}

        <Pressable style={styles.pressBtn} onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight', options);
          Share.share({
            url: "https://apps.apple.com/de/app/best-ai-assist-guru/id6737259052?l=en-GB",
          })
        }}>
          <Label style={styles.pressBtnText}>Share</Label>
        </Pressable>
        <Pressable style={styles.pressBtn} onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight', options);
          handleSupportPress()
        }}>
          <Label style={styles.pressBtnText}>Contact</Label>
        </Pressable>
        <Pressable style={styles.pressBtn} onPress={() => {
          openPrivacyPolicy();
          ReactNativeHapticFeedback.trigger('impactLight', options);
        }}>
          <Label style={styles.pressBtnText}>Privacy Policy</Label>
        </Pressable>

        <Pressable style={styles.pressBtn} onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight', options);
          openTermsOfUse()
        }}>
          <Label style={styles.pressBtnText}>Terms of Service</Label>
        </Pressable>

      </View>
    </View>
  )
}

export default SettingScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.white
  },
  innerContainer: {
    marginTop: hp(2),
    paddingHorizontal: wp(4)
  },
  pressBtn: {
    marginVertical: hp(2),
    paddingHorizontal: wp(2),
    paddingBottom: hp(1),
    borderBottomWidth: 0.2,
    borderColor: COLOR.black,
  },
  pressBtnText: {
    ...TEXT_STYLE.textSemiBold,
    color: COLOR.black
  }
})