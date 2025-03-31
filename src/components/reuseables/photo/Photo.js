import { StyleSheet} from 'react-native'
import React, { memo } from 'react'
import FastImage from 'react-native-fast-image'
import { hp } from '../../../enums/StyleGuide'

const Photo = ({ src, style, contain, url }) => {
  return (
    <FastImage
            source={src ? src : { uri: url }}
            style={[styles.image, style]}
            resizeMode={contain ?  FastImage.resizeMode.contain : FastImage.resizeMode.cover}
        />
  )
}

export default memo(Photo)

const styles = StyleSheet.create({
  image: {
    // height: hp(5),
    // width: hp(5),
},
})