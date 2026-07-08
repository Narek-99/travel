import { Platform } from 'react-native';
import {
  getTrackingStatus,
  requestTrackingPermission,
} from 'react-native-tracking-transparency';

export const requestAppTrackingTransparency = async () => {
  if (Platform.OS !== 'ios') {
    return 'unavailable';
  }

  try {
    const currentStatus = await getTrackingStatus();
    if (currentStatus === 'not-determined') {
      return requestTrackingPermission();
    }

    return currentStatus;
  } catch (error) {
    console.warn('Unable to request App Tracking Transparency:', error);
    return 'unavailable';
  }
};
