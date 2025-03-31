import { StyleSheet, View } from 'react-native'
import React, { memo } from 'react'
import Label from '../label'
import { COLOR, hp, TEXT_STYLE, commonStyles } from '../../../enums/StyleGuide'

const AppHeader = ({ title, leftComp, rightComp, centerComp, titleStyle, style }) => {
    return (
        <View style={[styles.header, style]}>
            {leftComp ?
                leftComp :
                <View style={styles.space} />
            }

            {centerComp ?
                centerComp :
                title ?
                    <Label style={[styles.textStyle, titleStyle]}>{title}</Label>
                    :
                    <View style={styles.space} />
            }

            {rightComp ?
                rightComp :
                <View style={styles.space} />
            }
        </View>
    )
}

export default memo(AppHeader)

const styles = StyleSheet.create({
    header: {
        height: hp(8),
        paddingHorizontal: '5%',
        ...commonStyles.justifyView,
    },
    space: {
        height: 3,
        width: '10%',
    },
    textStyle: {
        color: COLOR.white,
        ...TEXT_STYLE.textBold,
    },
})