import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'SkillSurvey'>;

interface IQuestion {
  id: string;
  question: string;
  options: IOption[];
}

interface IOption {
  id: string;
  label: string;
  sublabel: string;
  points: number;
}

const QUESTIONS: IQuestion[] = [
  {
    id: 'q1',
    question: 'How long have you been playing skill-based board or card games?',
    options: [
      { id: 'q1a', label: 'Just starting out', sublabel: 'Less than 6 months', points: 1 },
      { id: 'q1b', label: 'Getting the hang of it', sublabel: '6 months to 2 years', points: 2 },
      { id: 'q1c', label: 'Experienced player', sublabel: '2 to 5 years', points: 3 },
      { id: 'q1d', label: 'Veteran', sublabel: '5+ years', points: 4 },
    ],
  },
  {
    id: 'q2',
    question: 'How often do you play competitively?',
    options: [
      { id: 'q2a', label: 'Casually', sublabel: 'Just for fun with friends', points: 1 },
      { id: 'q2b', label: 'Regularly', sublabel: 'A few times a week', points: 2 },
      { id: 'q2c', label: 'Seriously', sublabel: 'Daily with a focus on improving', points: 3 },
      { id: 'q2d', label: 'Professionally', sublabel: 'I compete in tournaments', points: 4 },
    ],
  },
  {
    id: 'q3',
    question: 'What best describes your goal on ARCPLAY?',
    options: [
      { id: 'q3a', label: 'Play with friends', sublabel: 'Enjoy games in my own circle', points: 1 },
      { id: 'q3b', label: 'Improve my game', sublabel: 'Learn and get better over time', points: 2 },
      { id: 'q3c', label: 'Compete seriously', sublabel: 'Win tournaments and climb rankings', points: 3 },
      { id: 'q3d', label: 'Build a presence', sublabel: 'Earn reputation and sponsorships', points: 4 },
    ],
  },
];

/** Maps total survey points to an initial skill rating label */
const getRating = (points: number): string => {
  if (points <= 4) return 'Beginner';
  if (points <= 7) return 'Casual';
  if (points <= 10) return 'Intermediate';
  return 'Advanced';
};

/** SkillSurveyScreen — 3 questions to set the player's initial skill rating */
export default function SkillSurveyScreen({ navigation }: Props): React.JSX.Element {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const allAnswered = QUESTIONS.every((q) => answers[q.id]);

  const totalPoints = QUESTIONS.reduce((sum, q) => {
    const selected = q.options.find((o) => o.id === answers[q.id]);
    return sum + (selected?.points ?? 0);
  }, 0);

  /** Handles answer selection */
  const handleSelect = (questionId: string, optionId: string): void => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  /** Navigates to GameLibraryIntro once all questions answered */
  const handleContinue = (): void => {
    navigation.navigate('GameLibraryIntro');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Tell us about yourself</Text>
        <Text style={styles.subtitle}>
          3 quick questions so we can set your starting skill level accurately.
        </Text>

        {/* Progress dots */}
        <View style={styles.progress}>
          {QUESTIONS.map((q) => (
            <View
              key={q.id}
              style={[
                styles.dot,
                answers[q.id] ? styles.dotFilled : styles.dotEmpty,
              ]}
            />
          ))}
        </View>

        {/* Questions */}
        {QUESTIONS.map((q, qi) => (
          <View key={q.id} style={styles.questionBlock}>
            <Text style={styles.questionNumber}>Question {qi + 1} of {QUESTIONS.length}</Text>
            <Text style={styles.questionText}>{q.question}</Text>
            <View style={styles.options}>
              {q.options.map((opt) => {
                const isSelected = answers[q.id] === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.option,
                      isSelected && styles.optionSelected,
                    ]}
                    onPress={() => handleSelect(q.id, opt.id)}
                    accessibilityLabel={opt.label}
                  >
                    <View style={styles.optionLeft}>
                      <View style={[
                        styles.radio,
                        isSelected && styles.radioSelected,
                      ]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelSelected,
                      ]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.optionSublabel}>{opt.sublabel}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Rating preview */}
        {allAnswered && (
          <View style={styles.ratingPreview}>
            <Text style={styles.ratingLabel}>Your starting rating</Text>
            <Text style={styles.ratingValue}>{getRating(totalPoints)}</Text>
            <Text style={styles.ratingNote}>
              This will be refined as you play your first games.
            </Text>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.btn, !allAnswered && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!allAnswered}
          accessibilityLabel="Continue to game library"
        >
          <Text style={styles.btnText}>
            {allAnswered ? 'Continue' : 'Answer all questions to continue'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOURS.BACKGROUND,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 24,
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  backText: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 15,
  },
  title: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
  },
  progress: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  dotFilled: {
    backgroundColor: COLOURS.PRIMARY,
  },
  dotEmpty: {
    backgroundColor: COLOURS.BORDER,
  },
  questionBlock: {
    gap: 12,
  },
  questionNumber: {
    color: COLOURS.PRIMARY,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  questionText: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
  },
  options: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    gap: 12,
  },
  optionSelected: {
    borderColor: COLOURS.PRIMARY,
    backgroundColor: COLOURS.SURFACE_ELEVATED,
  },
  optionLeft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLOURS.BORDER_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLOURS.PRIMARY,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLOURS.PRIMARY,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '500',
  },
  optionLabelSelected: {
    color: COLOURS.PRIMARY,
  },
  optionSublabel: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 12,
  },
  ratingPreview: {
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOURS.PRIMARY,
    gap: 6,
  },
  ratingLabel: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '500',
  },
  ratingValue: {
    color: COLOURS.PRIMARY,
    fontSize: 32,
    fontWeight: '800',
  },
  ratingNote: {
    color: COLOURS.TEXT_MUTED,
    fontSize: 12,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: COLOURS.PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: COLOURS.SURFACE_ELEVATED,
  },
  btnText: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
});