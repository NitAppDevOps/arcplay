import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'AvatarSetup'>;

const { width } = Dimensions.get('window');
const AVATAR_SIZE = (width - 48 - 24) / 4;

const AVATARS = [
  { id: '1', emoji: '♟', label: 'Knight' },
  { id: '2', emoji: '♜', label: 'Rook' },
  { id: '3', emoji: '♛', label: 'Queen' },
  { id: '4', emoji: '♚', label: 'King' },
  { id: '5', emoji: '🃏', label: 'Joker' },
  { id: '6', emoji: '🎴', label: 'Card' },
  { id: '7', emoji: '🎯', label: 'Target' },
  { id: '8', emoji: '⚡', label: 'Flash' },
  { id: '9', emoji: '🔥', label: 'Fire' },
  { id: '10', emoji: '💎', label: 'Diamond' },
  { id: '11', emoji: '🌟', label: 'Star' },
  { id: '12', emoji: '🦁', label: 'Lion' },
];

/** AvatarSetupScreen — player picks an avatar to represent them on the platform */
export default function AvatarSetupScreen({ navigation }: Props): React.JSX.Element {
  const [selected, setSelected] = useState<string>('1');

  /** Navigates to SkillSurvey with selected avatar */
  const handleContinue = (): void => {
    navigation.navigate('SkillSurvey');
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

        <Text style={styles.title}>Choose your avatar</Text>
        <Text style={styles.subtitle}>
          This is how other players will recognise you. You can change it later.
        </Text>

        {/* Selected preview */}
        <View style={styles.preview}>
          <Text style={styles.previewEmoji}>
            {AVATARS.find((a) => a.id === selected)?.emoji}
          </Text>
          <Text style={styles.previewLabel}>
            {AVATARS.find((a) => a.id === selected)?.label}
          </Text>
        </View>

        {/* Avatar grid */}
        <View style={styles.grid}>
          {AVATARS.map((avatar) => (
            <TouchableOpacity
              key={avatar.id}
              style={[
                styles.avatarCell,
                selected === avatar.id && styles.avatarCellSelected,
              ]}
              onPress={() => setSelected(avatar.id)}
              accessibilityLabel={`Select ${avatar.label} avatar`}
            >
              <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.uploadHint}>
          Custom photo upload coming soon
        </Text>

        {/* CTA */}
        <TouchableOpacity
          style={styles.btn}
          onPress={handleContinue}
          accessibilityLabel="Continue to skill survey"
        >
          <Text style={styles.btnText}>Continue with this avatar</Text>
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
    gap: 20,
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
  preview: {
    alignItems: 'center',
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 20,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: COLOURS.PRIMARY,
    gap: 8,
  },
  previewEmoji: {
    fontSize: 64,
  },
  previewLabel: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  avatarCell: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
  },
  avatarCellSelected: {
    borderColor: COLOURS.PRIMARY,
    backgroundColor: COLOURS.PRIMARY_LIGHT,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  uploadHint: {
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
  btnText: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
});