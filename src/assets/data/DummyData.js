import { En } from "../../locales/En"
import { SVG } from "../svgs"



export const subscriptionPlans = [
    {
        text: En.yearly,
        time: 'year',
        price: "$59.99 /",
        freeIcon: <SVG.Free />,
        trial: "Cancel anytime",
        trialNoPaymentNow: "No Payment Now!",
        newestTechnologies: "Newest and Fastest AI Technologies",
        icon: <SVG.Circle />,
        iconActive: <SVG.CircleFill fill="#7548E3" />,
        earlyaccess: 'Faster GPT-4o Model',
        nolimit: "Unlimited Chat Messages",
        noAds: "Enjoy AI without any Ads", earlyIcon: <SVG.Ai />,
        noLimitIcon: <SVG.Infinity />,
        noAdsIcon: <SVG.AdsFree />
    },
    {
        text: En.weekly,
        time: 'week',
        price: "$7.99 /",
        freeIcon: <SVG.Free />,
        icon: <SVG.Circle />,
        iconActive: <SVG.CircleFill />,
        trial: "Cancel anytime",
        earlyIcon: <SVG.Ai />,
        earlyaccess: 'Faster GPT-4o Model',
        noLimitIcon: <SVG.Infinity />, nolimit: "Unlimited Chat Messages",
        noAdsIcon: <SVG.AdsFree />,
        noAds: "Enjoy AI without any Ads"
    },
]

export const dietaryTypes = [
    { text: "Vegan" },
    { text: "Vegetarian" },
    { text: "Gluten-free" },
]

export const allergiesTypes = [
    { text: "Lactose-free" },
    { text: "Nut-free" },
]

export const mealTypes = [
    { text: "Breakfast" },
    { text: "Lunch" },
    { text: "Dinner" },
]

export const dietGoalsTypes = [
    { text: "Weight loss" },
    { text: "Low-carb" },
]

