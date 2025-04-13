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
        earlyaccess: 'Enjoy unlimited trip plans',
        noAds: "Almost every city worldwide",
        earlyIcon: <SVG.Ai fill="black" />,
        recommendations: "Personalized recommendations by AI",
        noLimitIcon: <SVG.Infinity fill="black" />,
        noAdsIcon: <SVG.AdsFree fill="black" />
    },
    {
        earlyaccess: 'Enjoy unlimited trip plans',
        noLimitIcon: <SVG.Infinity fill="black" />,
        noAds: "Almost every city worldwide",
        trial: "Cancel anytime",
        recommendations: "Personalized recommendations by AI",
        text: En.weekly,
        time: 'week',
        price: "$7.99 /",
        freeIcon: <SVG.Free fill="black" />,
        icon: <SVG.Circle fill="black" />,
        iconActive: <SVG.CircleFill fill="black" />,
        earlyIcon: <SVG.Ai fill="black" />,
        noAdsIcon: <SVG.AdsFree fill="black" />,
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

