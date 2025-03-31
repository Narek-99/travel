import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { COLOR, TEXT_STYLE } from '../../enums/StyleGuide';

const suggestionsData = {
  fun: {
    title: '🎉  Fun & Games',
    suggestions: [
      { questionKey: 'Mind-Blowing Fact', questionValue: 'Tell me a mind-blowing fact about ancient civilizations!' },
      { questionKey: 'Hilarious Joke', questionValue: 'Make me laugh with the funniest joke you’ve got!' },
      { questionKey: 'Outfit Wizard', questionValue: 'I’ve got a big event coming up! What’s the perfect outfit?' },
      { questionKey: 'Rap Battle', questionValue: 'Drop a rap battle verse in the style of Eminem about: [Insert Topic]' },
      { questionKey: 'Emoji Master', questionValue: 'Turn this sentence into a full emoji story: [Insert Text]' }
    ]
  },
  social: {
    title: '💬  Social Vibes',
    suggestions: [
      { questionKey: 'Creative Gift Ideas', questionValue: 'What’s the coolest gift I can get for an 18-year-old guy?' },
      { questionKey: 'Flirting Tips', questionValue: 'Give me 5 smooth conversation starters and a killer pick-up line!' },
      { questionKey: 'Conversation Spark', questionValue: 'What’s a fun and unique conversation starter for my next hangout?' },
      { questionKey: 'Group Fun', questionValue: 'Plan 3 exciting activities for a group of friends to try together!' }
    ]
  },
  travel: {
    title: '✈️  Travel Adventures',
    suggestions: [
      { questionKey: 'Dream Vacation', questionValue: 'Plan the ultimate vacation! Location: [Insert Location], Budget: [Insert Budget], Days: [Insert Days]' },
      { questionKey: 'Local Delicacies', questionValue: 'What are the must-try local dishes in [Insert Location]?' },
      { questionKey: 'Travel on a Budget', questionValue: 'What are some clever travel hacks for saving money in [Insert Location]?' },
      { questionKey: 'Top Sights', questionValue: 'What are the must-see attractions and hidden gems in [Insert Location]?' }
    ]
  },
  writing: {
    title: '✍️  Creative Writing',
    suggestions: [
      { questionKey: 'Epic Shakespeare Story', questionValue: 'Write a dramatic story in the style of Shakespeare!' },
      { questionKey: 'Essay Magic', questionValue: 'Create a short and engaging essay on: [Insert Topic]' },
      { questionKey: 'Rewrite & Refresh', questionValue: 'Polish and improve this text for me: [Insert Text]' },
      { questionKey: 'Story Continuation', questionValue: 'Continue this story from where I left off: [Insert Story]' },
      { questionKey: 'Writing Guru', questionValue: 'Take my writing to the next level! Here’s the text: [Insert Text]' }
    ]
  },
  art: {
    title: '🎨  Arts & Inspiration',
    suggestions: [
      { questionKey: 'Top Book Picks', questionValue: 'Recommend 4 thought-provoking books on World War II' },
      { questionKey: 'Adele-Inspired Lyrics', questionValue: 'Write emotional song lyrics in the style of Adele with the theme: [Insert Theme]' },
      { questionKey: 'Mood Music', questionValue: 'Suggest 5 songs for when I’m feeling [Insert Mood], Genre: [Insert Genre]' },
      { questionKey: 'Poetry Magic', questionValue: 'Write a beautiful poem about: [Insert Topic]' }
    ]
  },
  health: {
    title: '💪  Health & Wellness',
    suggestions: [
      { questionKey: 'Healthy Gourmet', questionValue: 'Give me a tasty, 500-calorie recipe for two that’s healthy and delicious!' },
      { questionKey: 'Sleep Boosters', questionValue: 'Share 3 tips to improve my sleep quality. I get about [Insert Hours] hours of sleep' },
      { questionKey: 'Stress Relief', questionValue: 'What are some simple ways to manage stress and anxiety?' },
      { questionKey: 'Personalized Workout Plan', questionValue: 'Create a custom workout plan! Workouts per week: [Insert Number], Type: [Insert Type], Duration: [Insert Duration]' }
    ]
  },
  learning: {
    title: '🧠  Brain Boosters',
    suggestions: [
      { questionKey: 'Solve This!', questionValue: 'Can you solve this tricky math problem for me? P=m/V' },
      { questionKey: 'Write an Insightful Essay', questionValue: 'Write a well-structured essay on: [Insert Topic]' },
      { questionKey: 'Design a Course', questionValue: 'Create a full course outline on: [Insert Topic]' },
      { questionKey: 'Cite That Source', questionValue: 'Generate a citation in [Style] for this source: [Insert Details]' },
      { questionKey: 'Explain Simply', questionValue: 'Break down this complex topic into simple terms: [Insert Topic]' }
    ]
  },
  career: {
    title: '📈  Career & Growth',
    suggestions: [
      { questionKey: 'Interview Prep', questionValue: 'What are 5 powerful interview questions for a [Insert Role] position?' },
      { questionKey: 'Career Path Advice', questionValue: 'Give me advice on pursuing a career in [Insert Industry]' },
      { questionKey: 'Stay Motivated', questionValue: 'I’m struggling with [Insert Issue]. What are some tips to stay motivated?' },
      { questionKey: 'Smart Money Moves', questionValue: 'I have $3K saved. What’s the best way to invest or use it for [Insert Purpose]?' }
    ]
  },
  email: {
    title: '📧  Smart Emails',
    suggestions: [
      { questionKey: 'Pitch Email', questionValue: 'Write a persuasive email to promote [Insert Product] to [Insert Audience]' },
      { questionKey: 'Crypto Insights', questionValue: 'Create a sharp newsletter on the latest trends in the crypto world' },
      { questionKey: 'Handle an Angry Client', questionValue: 'Help me craft a calm and professional reply to an upset customer' },
      { questionKey: 'Engaging Marketing Email', questionValue: 'Write a catchy marketing email for a new skincare product that’s creative and convincing!' }
    ]
  }
};

const SuggestionSheet = ({ refRBSheet, setText }) => {
  const [activeCategory, setActiveCategory] = useState('fun');

  const handleSuggestionSelect = (suggestionValue) => {
    setText(suggestionValue);  // This will prefill the input field with the selected suggestion
    refRBSheet.current.close(); // Close the sheet after selection
  };

  return (
    <View style={styles.sheetContainer}>
      <SafeAreaView></SafeAreaView>

      <Text style={styles.sheetTitle}>Suggestions</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
        {Object.keys(suggestionsData).map((category) => (
          <Pressable
            key={category}
            style={[
              styles.categoryTab,
              activeCategory === category ? styles.activeTab : {},
            ]}
            onPress={() => setActiveCategory(category)}
          >
            <Text style={styles.tabText}>{suggestionsData[category].title}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView>
        {suggestionsData[activeCategory].suggestions.map((suggestion, index) => (
          <Pressable
            key={index}
            style={styles.suggestionItem}
            onPress={() => handleSuggestionSelect(suggestion.questionValue)}
          >
            <Text style={styles.suggestionText}>{suggestion.questionKey}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    padding: 20,
  },
  sheetTitle: {
    ...TEXT_STYLE.title,
    fontSize: 18,
    marginBottom: 15,
    color: COLOR.white,
    alignSelf: 'center'
  },
  categoriesRow: {
    flexDirection: 'row',
    marginBottom: 25,
    marginTop: 10,
    alignItems: 'center',
  },
  categoryTab: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'black',
    marginRight: 10,
  },
  activeTab: {
    backgroundColor: '#7548E3',
  },
  tabText: {
    color: COLOR.white,
    ...TEXT_STYLE.textSemiBold,
  },
  suggestionItem: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 10,
  },
  suggestionText: {
    ...TEXT_STYLE.textMedium,
    color: COLOR.black,
  },
});

export default SuggestionSheet;
