import Toast from 'react-native-toast-message';

export const callChatGptForResponse = async (prompt, model) => {
  try {
    const response = await fetch("https://openai-proxy-gilt-three.vercel.app/api/chat" + model, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: prompt,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    if (data.reply) {
      return data.reply;
    } else {
      throw new Error("No response from the proxy.");
    }
  } catch (error) {
    Toast.show({
      visibilityTime: 4000,
      type: 'error',
      text1: "Something went wrong.",
      text2: "Please try again later.",
      position: 'top',
    });
    console.error('❌ Error fetching response from ChatGPT:', error);
    throw error;
  }
};