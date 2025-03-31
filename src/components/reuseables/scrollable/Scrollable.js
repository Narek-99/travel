import { ScrollView } from 'react-native'
import React, { memo } from 'react'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import If from '../if'

const Scrollable = (props) => {
    const { children, hasInput, horizontal, containerStyle } = props
    return (
        <If condition={hasInput}
            elseComp={
                <ScrollView
                    overScrollMode='never'
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={containerStyle}
                    horizontal={horizontal}
                    bounces={false}
                >
                    {children}
                </ScrollView>
            }
        >
            <KeyboardAwareScrollView
                overScrollMode='never'
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={containerStyle}
                horizontal={horizontal}
                bounces={false}
            >
                {children}
            </KeyboardAwareScrollView>
        </If>
    )
}

export default memo(Scrollable)
