import { SafeAreaView, StyleSheet, View } from 'react-native';
import React, { } from 'react';
import { COLOR } from '../../enums/StyleGuide';

const hapticOptions = {
  enableVibrateFallback: true,
};

const FunFactsScreen = ({ navigation }) => {
  return (
    <View style={styles.screenContainer}>
      <View style={styles.contentContainer}>
        <SafeAreaView />

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
    paddingTop: '8%',
    paddingHorizontal: '5%',
  },
});
