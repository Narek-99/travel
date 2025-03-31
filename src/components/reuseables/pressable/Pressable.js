import { StyleSheet, TouchableOpacity } from 'react-native'
import React, { memo } from 'react'

const Pressable = ({ children, hitSlop, onPress, style, onLongPress }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      hitSlop={hitSlop}
      style={style}
      onPress={() => { onPress && onPress() }}
      onLongPress={() => { onLongPress && onLongPress() }}
    >
      {children}
    </TouchableOpacity>
  )
}

export default memo(Pressable)

const styles = StyleSheet.create({})