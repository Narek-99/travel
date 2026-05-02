import React, { useEffect } from 'react';
import RootNavigation from './src/navigation/RootNavigation';
import { Provider } from 'react-redux';
import store from './src/redux/store/Store';
import FlashMessage from 'react-native-flash-message';
import BootSplash from 'react-native-bootsplash';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const App = () => {
  useEffect(() => {
    const init = async () => {};

    init().finally(async () => {
      await BootSplash.hide({ fade: true });
    });
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <RootNavigation />
        <FlashMessage position="top" />
        <Toast />
      </SafeAreaProvider>
    </Provider>
  );
};

export default App;
