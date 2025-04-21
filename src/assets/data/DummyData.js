import { En } from "../../locales/En";
import { SVG } from "../svgs";

export const subscriptionPlans = [
    {
        text: En.yearly,
        time: 'year',
        price: "$79.99 /",
        planIcon: <SVG.Plus fill="black" />,
        planText: "Plan Unlimited Trips",
        cityIcon: <SVG.Search fill="black" />,
        cityText: "Explore Every City Worldwide",
        attractionIcon: <SVG.AiStar fill="black" />,
        attractionText: "Personalized Attractions",
        weatherIcon: <SVG.Flash fill="black" />,
        weatherText: "Live Weather & Plans",
        chatIcon: <SVG.Robot fill="black" />,
        chatText: "AI Chat Support 24/7",
        cancelIcon: <SVG.Cross fill="black" />,
        cancelText: "Cancel Anytime",
        icon: <SVG.Circle fill="black" />,
        iconActive: <SVG.CircleFill fill="black" />,
    },
    {
        text: En.monthly,
        time: 'month',
        price: "$12.99 //",
        planText: "Plan Unlimited Trips",
        cityText: "Explore Every City Worldwide",
        attractionText: "Personalized Attractions",
        weatherText: "Live Weather & Plans",
        chatText: "AI Chat Support 24/7",
        cancelText: "Cancel Anytime",
    },
];

export const dietaryTypes = [
    { text: "Vegan" },
    { text: "Vegetarian" },
    { text: "Gluten-free" },
];

export const allergiesTypes = [
    { text: "Lactose-free" },
    { text: "Nut-free" },
];

export const mealTypes = [
    { text: "Breakfast" },
    { text: "Lunch" },
    { text: "Dinner" },
];

export const dietGoalsTypes = [
    { text: "Weight loss" },
    { text: "Low-carb" },
];