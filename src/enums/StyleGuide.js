import { Dimensions, StyleSheet } from 'react-native'
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen'

export const WIDTH = Dimensions.get('window').width
export const HEIGHT = Dimensions.get('window').height

export { wp, hp }

export const ACTIVE_OPACITY = 0.8
export const BACKDROP_OPACITY = 0.2

export const COLOR = {
    Charcoal: "#24293E",
    lightBlue: "#8EBBFF",
    white: "#F4F5FC",
    lightGray: "#CCCCCC",
    darkBlue: "#2F3855",
    white2: "#dfe6e9",
    black: '#000000'

}

export const FONT = {
    title: 'Poppins-Bold',
    bold: 'Poppins-Bold',
    semiBold: 'Poppins-SemiBold',
    medium: 'Poppins-Medium',
    regular: 'Poppins-Regular',

}

export const TEXT_STYLE = StyleSheet.create({
    title: {
        fontFamily: FONT.medium,
        fontSize: 28,
    },
    smallTitleBold: {
        fontFamily: FONT.bold,
        fontSize: 18,
    },
    smallTitleSemiBold: {
        fontFamily: FONT.semiBold,
        fontSize: 20,
    },
    smallTitleMedium: {
        fontFamily: FONT.medium,
        fontSize: 20,
    },
    bigText: {
        fontFamily: FONT.regular,
        fontSize: 17,
    },
    bigTextSemiBold: {
        fontFamily: FONT.semiBold,
        fontSize: 17,
    },
    bigTextMedium: {
        fontFamily: FONT.medium,
        fontSize: 17,
    },
    bigTextBold: {
        fontFamily: FONT.bold,
        fontSize: 17,
    },
    text: {
        fontFamily: FONT.regular,
        fontSize: 14,
    },
    textSemiBold: {
        fontFamily: FONT.semiBold,
        fontSize: 14,
    },
    textMedium: {
        fontFamily: FONT.medium,
        fontSize: 14,
    },
    textBold: {
        fontFamily: FONT.bold,
        fontSize: 14,
    },
    smallText: {
        fontFamily: FONT.regular,
        fontSize: 11,
    },
    smallTextSemiBold: {
        fontFamily: FONT.semiBold,
        fontSize: 11,
    },
    smallTextMedium: {
        fontFamily: FONT.medium,
        fontSize: 11,
    },
    smallTextBold: {
        fontFamily: FONT.bold,
        fontSize: 11,
    },
})

export const commonStyles = StyleSheet.create({
    horizontalView: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    horizontalView_m05: {
        alignItems: 'center',
        flexDirection: 'row',
        marginVertical: hp(0.5),
    },
    horizontalView_m1: {
        alignItems: 'center',
        flexDirection: 'row',
        marginVertical: hp(1),
    },
    justifyView: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    justifyView_m05: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: hp(0.5),
    },
    justifyView_m1: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: hp(1),
    },
    justifyView_m2: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: hp(2),
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    shadow_5: {
        elevation: 5,
        shadowColor: COLOR.black,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    shadow_3: {
        elevation: 3,
        shadowColor: COLOR.black,
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
    },
    shadow_10: {
        elevation: 10,
        shadowColor: COLOR.black,
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.34,
        shadowRadius: 6.27,
    },
    shadow_20: {
        elevation: 20,
        shadowColor: COLOR.black,
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.51,
        shadowRadius: 13.16,
    },
    noPadding: {
        paddingTop: 0,
        paddingLeft: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingStart: 0,
        paddingEnd: 0,
    },
    noMargin: {
        marginTop: 0,
        marginLeft: 0,
        marginRight: 0,
        marginBottom: 0,
        marginStart: 0,
        marginEnd: 0,
    },
    logoStyle: {
        height: hp(6),
        width: wp(30),
    },
}) 
