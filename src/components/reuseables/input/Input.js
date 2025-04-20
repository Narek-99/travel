import { StyleSheet, TextInput, View } from 'react-native'
import React, { memo } from 'react'
import { COLOR, TEXT_STYLE, hp, wp } from '../../../enums/StyleGuide'
import Label from '../label'
import Pressable from '../pressable'
import SvgItem from '../svgItem'

const Input = ({ sendMessage, setShow, leftIconName, style, rightIconName, iconSize, inputStyle, placeholder, placeholderTextColor, onChange, value, multiline, keyboard, inputLabel, labelStyle, passwordWarnig }) => {
  const leftIconSize = hp(3)
  const rightIconSize = hp(2.5)
  return (
    <View style={{ marginVertical: hp(1) }}>
      {inputLabel && <Label style={[styles.inputLabelText, labelStyle]}>{inputLabel}</Label>}
      <View style={[styles.inputContainer, style]}>
        {leftIconName && <Pressable onPress={() => setShow(prev => !prev)} style={styles.LeftIconContainer}><SvgItem name={leftIconName} size={leftIconSize} /></Pressable>}
        <TextInput
          style={[styles.input, inputStyle,]}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor || COLOR.white}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboard}
          multiline={multiline}
          cursorColor={COLOR.white}
        />
        {rightIconName && <Pressable onPress={() => sendMessage()} style={styles.RightIconContainer}><SvgItem name={rightIconName} size={rightIconSize} /></Pressable>}
      </View>
      {passwordWarnig && <Label style={styles.passwordWarningText}>{passwordWarnig}</Label>}
    </View>
  )
}

export default memo(Input)
const styles = StyleSheet.create({
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: hp(2.75),
    borderWidth: 1,
    borderColor: COLOR.lightGray,
    backgroundColor: COLOR.black,
    paddingVertical: hp(1),
  },
  input: {
    flex: 1,
    ...TEXT_STYLE.text,
    color: COLOR.white,
    paddingLeft: wp(4),
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  RightIconContainer: {
    marginRight: '4%',
  },
  LeftIconContainer: {
    marginLeft: '4%',
  },
  inputLabelText: {},
  passwordWarningText: {
    ...TEXT_STYLE.text,
    color: 'red',
    marginTop: hp(0.5),
  },
});