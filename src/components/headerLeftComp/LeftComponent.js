import { StyleSheet, View } from 'react-native'
import React from 'react'
import { Label } from '../reuseables'
import { En } from '../../locales/En'
import { TEXT_STYLE, wp } from '../../enums/StyleGuide'

const LeftComponent = () => {
    return (
        <View style={styles.contianer}>
            <Label style={styles.text}>{En.AppName}</Label>
        </View>
    )
}

export default LeftComponent

const styles = StyleSheet.create({
    contianer: {
        flexDirection: "row",
        alignItems: 'center'
    },
    text: {
        ...TEXT_STYLE.smallTitleSemiBold,
        marginLeft: wp(3),
        color: 'black'
    }
})