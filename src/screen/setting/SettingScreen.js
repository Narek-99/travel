import { ActivityIndicator, Linking, SafeAreaView, StyleSheet, View } from 'react-native'
import React, { useState } from 'react'
import { COLOR, hp, TEXT_STYLE, wp } from '../../enums/StyleGuide'
import { AppHeader, Label, Pressable } from '../../components'
import { SVG } from '../../assets/svgs'
import { FIREBASE_COLLECTIONS, SCREEN } from '../../enums/AppEnums'
import { useSelector } from 'react-redux'
import { DeleteMessages } from '../../services/FirebaseMethods'
import Toast from 'react-native-toast-message'
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import LinearGradient from 'react-native-linear-gradient';

const options = {
  enableVibrateFallback: true
};

const SettingScreen = ({ navigation }) => {
  const user = useSelector(({ appReducer }) => appReducer.user);
  const [loading, setLoading] = useState(false)

  const openPrivacyPolicy = () => {
    Linking.openURL('https://docs.google.com/document/d/1xcSSKsrhrdHGS9gcfYEqIboULPlLyzpASzGJG7VAM8I/edit?usp=sharing');
  };

  const openTermsOfUse = () => {
    Linking.openURL('https://docs.google.com/document/d/1VWEJDIbVF-zyO6a0BfqVauAcyT2pvAaUMbkwQ9m4WJY/edit?usp=sharing');
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
      <LinearGradient
        colors={['#002953', '#063D78', '#001B39']}
        locations={[0, 0.48, 1]}
        style={styles.background}
      />
      <View style={styles.glowTop} />
      <SafeAreaView></SafeAreaView>
      <AppHeader
        style={styles.header}
        leftComp={
          <Pressable onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', options);
            navigation.navigate(SCREEN.TRIPS);

          }} style={styles.headerIconButton}>
            <SVG.BackIcon fill={COLOR.white} />
          </Pressable>
        }
        title={"Settings"}
        titleStyle={styles.headerTitle}
      />
      <View style={styles.innerContainer}>
        <View style={styles.heroCard}>
          <Label style={styles.heroEyebrow}>Triposo</Label>
          <Label style={styles.heroTitle}>App settings</Label>
          <Label style={styles.heroText}>Manage your access, support, and travel history.</Label>
        </View>

        <Pressable style={styles.pressBtn} onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight', options);
          handleDeleteChats();
        }}>
          {
            loading ?
              <ActivityIndicator size={'small'} color={COLOR.accent} />
              :
              <Label style={styles.pressBtnText}>Clear History</Label>
          }
        </Pressable>

        <Pressable style={styles.pressBtn} onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight', options);
          navigation.navigate(SCREEN.ADVANTAGE, { from: 'settings' })
        }}>
          <Label style={styles.pressBtnText}>Prime Access</Label>
        </Pressable>

        {/* <Pressable style={styles.pressBtn} onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight', options);
          Share.share({
            url: "https://apps.apple.com/de/app/best-ai-assist-guru/id6737259052?l=en-GB",
          })
        }}>
          <Label style={styles.pressBtnText}>Share</Label>
        </Pressable> */}
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
    backgroundColor: COLOR.primary
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  glowTop: {
    position: 'absolute',
    top: hp(9),
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
  headerTitle: {
    ...TEXT_STYLE.smallTitleBold,
    color: COLOR.white,
  },
  innerContainer: {
    marginTop: hp(1),
    paddingHorizontal: wp(5)
  },
  heroCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderRadius: hp(2),
    padding: wp(5),
    marginBottom: hp(2),
  },
  heroEyebrow: {
    ...TEXT_STYLE.smallTextSemiBold,
    color: '#FFE0A6',
    marginBottom: hp(0.5),
  },
  heroTitle: {
    ...TEXT_STYLE.title,
    color: COLOR.white,
    fontWeight: '800',
    marginBottom: hp(0.6),
  },
  heroText: {
    ...TEXT_STYLE.textMedium,
    color: '#DDEBFF',
    lineHeight: 21,
  },
  pressBtn: {
    marginBottom: hp(1.2),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.7),
    borderRadius: hp(1.6),
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
  },
  pressBtnText: {
    ...TEXT_STYLE.textSemiBold,
    color: COLOR.white
  }
})
