import { En } from "../../locales/En"
import { SVG } from "../svgs"



export const subscriptionPlans = [
    {
        text: En.yearly,
        time: 'year',
        price: "$59.99 /",
        freeIcon: <SVG.Free fill="black" />,
        trial: "Cancel anytime",
        trialNoPaymentNow: "No Payment Now!",
        newestTechnologies: "Newest and Fastest AI Technologies",
        icon: <SVG.Circle fill="black" />,
        iconActive: <SVG.CircleFill fill="black" />,
        earlyaccess: 'Faster GPT-4o Model',
        nolimit: "Unlimited Chat Messages",
        noAds: "Enjoy AI without any Ads", earlyIcon: <SVG.Ai fill="black" />,
        noLimitIcon: <SVG.Infinity fill="black" />,
        noAdsIcon: <SVG.AdsFree fill="black" />
    },
    {
        text: En.weekly,
        time: 'week',
        price: "$7.99 /",
        freeIcon: <SVG.Free fill="black" />,
        icon: <SVG.Circle fill="black" />,
        iconActive: <SVG.CircleFill fill="black" />,
        trial: "Cancel anytime",
        earlyIcon: <SVG.Ai fill="black" />,
        earlyaccess: 'Faster GPT-4o Model',
        noLimitIcon: <SVG.Infinity fill="black" />, nolimit: "Unlimited Chat Messages",
        noAdsIcon: <SVG.AdsFree fill="black" />,
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

