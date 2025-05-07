import { StyleSheet, View, ActivityIndicator } from 'react-native';
import React, { memo } from 'react';
import If from '../if';
import Label from '../label';
import Pressable from '../pressable';
import { COLOR, commonStyles, TEXT_STYLE, hp } from '../../../enums/StyleGuide';

const Button = ({ text, textStyle, style, onPress, icon, isLoading, disabled }) => {
    return (
        <Pressable
            onPress={() => {
                if (!disabled && onPress) {
                    onPress();
                }
            }}
            style={[styles.container, style, disabled && styles.disabled]}
            disabled={disabled}
        >
            <If condition={!isLoading} elseComp={<ActivityIndicator size="small" color="white" />}>
                <If condition={icon}>
                    <View style={{ marginRight: '2.5%' }}>
                        {icon}
                    </View>
                </If>
                <Label style={[styles.titleStyle, textStyle, disabled && { color: COLOR.gray }]}>{text}</Label>
            </If>
        </Pressable>
    );
};

export default memo(Button);

const styles = StyleSheet.create({
    container: {
        marginVertical: hp(1),
        height: hp(6),
        borderRadius: hp(2),
        ...commonStyles.horizontalView,
        ...commonStyles.center,
        backgroundColor: COLOR.primary,
        ...commonStyles.borderStyle,
    },
    titleStyle: {
        ...TEXT_STYLE.bigTextSemiBold,
        color: COLOR.darkBlue,
    },
    disabled: {
        backgroundColor: '#CCCCCC',
        opacity: 0.6,
    },
});