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
import type { GamesStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';
import type { ChessAIDifficulty } from '@services/claude';
import { TIME_CONTROLS, type ITimeControl } from '@app-types/game.types';

type Props = NativeStackScreenProps<GamesStackParamList, 'ChessAISetup'>;

interface IDifficultyOption {
  level: ChessAIDifficulty;
  label: string;
  description: string;
  emoji: string;
}

const DIFFICULTIES: IDifficultyOption[] = [
  { level: 'beginner', label: 'Beginner', description: 'Just learning the game', emoji: '🌱' },
  { level: 'casual', label: 'Casual', description: 'Plays for fun, basic strategy', emoji: '😊' },
  { level: 'intermediate', label: 'Intermediate', description: 'Knows tactics, thinks ahead', emoji: '⚡' },
  { level: 'advanced', label: 'Advanced', description: 'Strong player, deep calculation', emoji: '🔥' },
  { level: 'expert', label: 'Expert', description: 'Best possible play', emoji: '👑' },
];

/** ChessAISetupScreen — choose difficulty and time control before playing vs Claude AI */
export default function ChessAISetupScreen({ navigation }: Props): React.JSX.Element {
  const [selected, setSelected] = useState<ChessAIDifficulty>('intermediate');
  const [timeControl, setTimeControl] = useState<ITimeControl>(TIME_CONTROLS[0]);

  const handleStart = (): void => {
    navigation.navigate('ChessBoard', {
      roomId: `ai_${selected}`,
      timeControl: timeControl.seconds,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.emoji}>🤖</Text>
          <Text style={styles.title}>Play vs AI</Text>
          <Text style={styles.subtitle}>
            Powered by Claude. Choose difficulty and time control.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Difficulty</Text>
        <View style={styles.difficulties}>
          {DIFFICULTIES.map((d) => {
            const isSelected = selected === d.level;
            return (
              <TouchableOpacity
                key={d.level}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => setSelected(d.level)}
                accessibilityLabel={`Select ${d.label} difficulty`}
              >
                <Text style={styles.optionEmoji}>{d.emoji}</Text>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                    {d.label}
                  </Text>
                  <Text style={styles.optionDesc}>{d.description}</Text>
                </View>
                {isSelected && <View style={styles.selectedDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Time control</Text>
        <View style={styles.timeControls}>
          {TIME_CONTROLS.map((tc) => {
            const isSelected = timeControl.label === tc.label;
            return (
              <TouchableOpacity
                key={tc.label}
                style={[styles.tcOption, isSelected && styles.tcOptionSelected]}
                onPress={() => setTimeControl(tc)}
                accessibilityLabel={`Select ${tc.label}`}
              >
                <Text style={[styles.tcLabel, isSelected && styles.tcLabelSelected]}>
                  {tc.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.startBtn}
          onPress={handleStart}
          accessibilityLabel="Start game against AI"
        >
          <Text style={styles.startBtnText}>Start game</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOURS.BACKGROUND },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, gap: 20 },
  back: { alignSelf: 'flex-start', paddingVertical: 8 },
  backText: { color: COLOURS.TEXT_SECONDARY, fontSize: 15 },
  header: { alignItems: 'center', gap: 8 },
  emoji: { fontSize: 52 },
  title: { color: COLOURS.TEXT_PRIMARY, fontSize: 28, fontWeight: '700' },
  subtitle: { color: COLOURS.TEXT_SECONDARY, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  sectionTitle: { color: COLOURS.TEXT_SECONDARY, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  difficulties: { gap: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    gap: 14,
  },
  optionSelected: { borderColor: COLOURS.PRIMARY, backgroundColor: COLOURS.SURFACE_ELEVATED },
  optionEmoji: { fontSize: 28 },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { color: COLOURS.TEXT_PRIMARY, fontSize: 16, fontWeight: '600' },
  optionLabelSelected: { color: COLOURS.PRIMARY },
  optionDesc: { color: COLOURS.TEXT_SECONDARY, fontSize: 12 },
  selectedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLOURS.PRIMARY },
  timeControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tcOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLOURS.SURFACE,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
  },
  tcOptionSelected: { borderColor: COLOURS.PRIMARY, backgroundColor: COLOURS.SURFACE_ELEVATED },
  tcLabel: { color: COLOURS.TEXT_SECONDARY, fontSize: 13, fontWeight: '500' },
  tcLabelSelected: { color: COLOURS.PRIMARY, fontWeight: '700' },
  startBtn: {
    backgroundColor: COLOURS.PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startBtnText: { color: COLOURS.TEXT_PRIMARY, fontSize: 16, fontWeight: '700' },
});