import { showFlash } from "../utils/MyUtils";
import { Alert } from 'react-native'
import Toast from 'react-native-toast-message'


export const imageApi = async (url) => {
  const PAT = 'd9f94efd46f2454e801aabcc7641a896';
  const USER_ID = 'jzhd6c7r8sse';
  const APP_ID = 'AIFridge';
  const MODEL_ID = 'food-item-recognition';
  const MODEL_VERSION_ID = '1d5fd481e0cf4826aa72ec3ff049e044';
  const IMAGE_URL = url;

  const raw = JSON.stringify({
    "user_app_id": {
      "user_id": USER_ID,
      "app_id": APP_ID
    },
    "inputs": [
      {
        "data": {
          "image": {
            "url": url
          }
        }
      }
    ]
  });

  const requestOptions = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': 'Key ' + PAT
    },
    body: raw
  };

  try {
    const response = await fetch(
      `https://api.clarifai.com/v2/models/${MODEL_ID}/versions/${MODEL_VERSION_ID}/outputs`,
      requestOptions
    );


    if (response.ok) {
      const data = await response.json();
      if (data.outputs && data.outputs.length > 0) {
        const output = data.outputs[0];
        const extractedData = output.data.concepts;
        // console.log("extractedData=================>",extractedData)
        // Example: Filtering items with confidence > 0.5 (if model supports confidence scoring)
        const threshold = 0.1;
        const items = extractedData
          .filter(item => item.value > threshold)
          .map(item => item.name)
          .join(', ');


        // Return the extracted items if any valid ones are found
        return items || "No food items detected";
      } else {
        throw new Error('No outputs found in the response');
      }
    } else {
      console.error('Error:', response.status, response.statusText);
      // showFlash("imageApi ==>> Server error: " + response.statusText);import { ActivityIndicator, Linking, SafeAreaView, StyleSheet, View, Alert } from 'react-native'
      Toast.show({
        visibilityTime: 3000,
        type: 'error',
        text1: "Something went wrong.",
        text2: "Please check your internet connection or try again.",
        position: 'top',
      })
    }
  } catch (error) {
    console.error('Error:', error);
    Toast.show({
      visibilityTime: 3000,
      type: 'error',
      text1: "Something went wrong.",
      text2: "Please check your internet connection or try again.",
      position: 'top',
    })
  }
};
