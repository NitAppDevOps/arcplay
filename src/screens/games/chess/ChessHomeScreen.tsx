import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';

type Props = NativeStackScreenProps<GamesStackParamList, 'ChessHome'>;

/** ChessHomeScreen — entry point for Chess, shows play options */
export default function ChessHomeScreen({ navigation }: Props): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>

        <View style={styles.header}>
          <Text style={styles.emoji}>♟</Text>
          <Text style={styles.title}>Chess</Text>
          <Text style={styles.subtitle}>
            Play with friends, challenge the AI, or compete offline
          </Text>
        </View>

        <View style={styles.options}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => navigation.navigate('ChessBoard', { roomId: 'local' })}
            accessibilityLabel="Play chess locally against another player"
          >
            <Text style={styles.optionEmoji}>👥</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Play locally</Text>
              <Text style={styles.optionDesc}>Two players, one device</Text>
            </View>
            <Text style={styles.optionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, styles.optionDisabled]}
            accessibilityLabel="Play chess against a friend — coming soon"
          >
            <Text style={styles.optionEmoji}>🌐</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Play vs Friend</Text>
              <Text style={styles.optionDesc}>Private room — coming in Step 7</Text>
            </View>
            <Text style={styles.optionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, styles.optionDisabled]}
            accessibilityLabel="Play chess against AI — coming soon"
          >
            <Text style={styles.optionEmoji}>🤖</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Play vs AI</Text>
              <Text style={styles.optionDesc}>Claude AI — coming in Step 10</Text>
            </View>
            <Text style={styles.optionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, styles.optionDisabled]}
            accessibilityLabel="Play chess offline — coming soon"
          >
            <Text style={styles.optionEmoji}>📡</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Play Offline</Text>
              <Text style={styles.optionDesc}>Wi-Fi / Bluetooth — coming in Steps 8-9</Text>
            </View>
            <Text style={styles.optionArrow}>→</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOURS.BACKGROUND,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 32,
  },
  header: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
  },
  emoji: {
    fontSize: 56,
  },
  title: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 32,
    fontWeight: '800',
  },
  subtitle: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  options: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    gap: 14,
  },
  optionDisabled: {
    opacity: 0.4,
  },
  optionEmoji: {
    fontSize: 28,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
  optionDesc: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 12,
  },
  optionArrow: {
    color: COLOURS.TEXT_MUTED,
    fontSize: 18,
  },
});