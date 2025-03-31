import { Platform } from 'react-native'
import { showMessage } from "react-native-flash-message"
import { COLOR, wp } from '../enums/StyleGuide'


export const isIOS = () => {
    return Platform.OS == 'ios'
}


export const showFlash = (message, type = 'success', icon = "none", floating = false) => {
    showMessage({
        message: message,
        type: type,
        icon: icon,
        // floating: true,
        textStyle: { color:COLOR.white2 },
        // titleStyle: { fontFamily: FONT.Montserrat_Regular},
        style: { margin:20 , backgroundColor: COLOR.lightBlue, borderRadius:wp(4) }
    });
}

export const formatDate = (date) => {
    const options = { hour: '2-digit', minute: '2-digit', hour12: true };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  };

 export const generateUniqueId = () => {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  };

  export function calculateTime(timestamp) {
    const nanoseconds = timestamp?.nanoseconds
    const seconds = timestamp?.seconds
    const milliseconds = Math.floor(nanoseconds / 1e6)
    const date = new Date(0)
    date.setSeconds(seconds)
    date.setMilliseconds(milliseconds)
    const timeString = date?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

    return timeString
}


export const textLimit = (text, limit) => {
    if (text?.length >= limit) {
        return `${text?.slice(0, limit)}...`
    } else {
        return text
    }
}