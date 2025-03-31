import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { COLOR, TEXT_STYLE } from '../../enums/StyleGuide';
import Toast from 'react-native-toast-message';

const toolsData = {
  ask: {
    title: '💬  Ask AI',
    suggestions: [
      { questionKey: 'Ask AI anything and get quick answers instantly!', questionValue: 'Write a dramatic story in the style of Shakespeare!' },
    ]
  },
  detect: {
    title: '🤖  AI Detector',
    suggestions: [
      { questionKey: '1. Paste your text.', questionValue: 'Tell me a mind-blowing fact about ancient civilizations!' },
      { questionKey: '2. AI will analyze your text, estimate how likely it is human-written, highlight non-human-like sections, suggest changes, and explain what was adjusted.', questionValue: 'Tell me a mind-blowing fact about ancient civilizations!' },
    ]
  },
  essay: {
    title: '📝  Essay Writer',
    suggestions: [
      { questionKey: '1. Provide all the details for your essay.' },
      { questionKey: "2. AI will craft a natural, human-like essay that's undetectable as AI-written. 😊" },
    ]
  },
  summarize: {
    title: '📑  Summarizer',
    suggestions: [
      { questionKey: '1. Paste your text.' },
      { questionKey: '2. AI will turn long content (webpages, YoutTube videos, documents) into a quick TL;DR.' },
    ]
  },
  enhance: {
    title: '✍️  Text Enhancer',
    suggestions: [
      { questionKey: '1. Paste your text.' },
      { questionKey: "2. AI will improve grammar and fix mistakes—work smarter, not harder!" },
    ]
  }
};

const ToolSheet = ({ refRBSheet, setCurrentTool, currentTool }) => {
  const [activeCategory, setActiveCategory] = useState(currentTool ? currentTool : "ask");

  return (
    <View style={styles.sheetContainer}>
      <SafeAreaView></SafeAreaView>

      <Text style={styles.sheetTitle}>Choose a Tool</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
        {Object.keys(toolsData).map((category) => (
          <Pressable
            key={category}
            style={[
              styles.categoryTab,
              activeCategory === category ? styles.activeTab : {},
            ]}
            onPress={() => {
              setActiveCategory(category); setCurrentTool(category); Toast.show({
                visibilityTime: 2000,
                type: 'success',
                text1: 'Tool selected and ready to go! 😊',
                position: 'top',
              });
            }}
          >
            <Text style={styles.tabText}>{toolsData[category].title}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView>
        {toolsData[activeCategory].suggestions.map((suggestion, index) => (
          <Pressable
            key={index}
            style={styles.suggestionItem}
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

export default ToolSheet;
