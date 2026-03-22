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

type Props = NativeStackScreenProps<GamesStackParamList, 'RummyHome'>;

interface IVariant {
  id: string;
  label: string;
  description: string;
  detail: string;
  roomId: string;
}

const VARIANTS: IVariant[] = [
  {
    id: 'points',
    label: 'Points Rummy',
    description: 'Single deal. Fastest format.',
    detail: 'Loser pays points equal to unmelded cards. Winner gets zero points.',
    roomId: 'local_points',
  },
  {
    id: 'deals',
    label: 'Deals Rummy',
    description: 'Fixed number of deals.',
    detail: 'Each player gets equal chips. Play fixed deals — most chips at end wins.',
    roomId: 'local_deals',
  },
  {
    id: 'pool101',
    label: 'Pool Rummy — 101',
    description: 'Eliminated at 101 points.',
    detail: 'Accumulate points across rounds. Reach 101 and you are out. Last player standing wins.',
    roomId: 'local_pool101',
  },
  {
    id: 'pool201',
    label: 'Pool Rummy — 201',
    description: 'Eliminated at 201 points.',
    detail: 'Same as Pool 101 but with a higher elimination threshold. Longer, more strategic.',
    roomId: 'local_pool201',
  },
];

/** RummyHomeScreen — variant selection and play options for Rummy */
export default function RummyHomeScreen({ navigation }: Props): React.JSX.Element {
  const [selected, setSelected] = useState<string>('points');

  const selectedVariant = VARIANTS.find(v => v.id === selected)!;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <Text style={styles.emoji}>🃏</Text>
          <Text style={styles.title}>Rummy</Text>
          <Text style={styles.subtitle}>
            Choose a variant and play with friends or practice locally
          </Text>
        </View>

        {/* Variant selection */}
        <Text style={styles.sectionTitle}>Select variant</Text>
        <View style={styles.variants}>
          {VARIANTS.map((v) => {
            const isSelected = selected === v.id;
            return (
              <TouchableOpacity
                key={v.id}
                style={[styles.variantCard, isSelected && styles.variantCardSelected]}
                onPress={() => setSelected(v.id)}
                accessibilityLabel={`Select ${v.label}`}
              >
                <View style={styles.variantHeader}>
                  <Text style={[styles.variantLabel, isSelected && styles.variantLabelSelected]}>
                    {v.label}
                  </Text>
                  {isSelected && <View style={styles.selectedDot} />}
                </View>
                <Text style={styles.variantDesc}>{v.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected variant detail */}
        <View style={styles.detailBox}>
          <Text style={styles.detailTitle}>{selectedVariant.label}</Text>
          <Text style={styles.detailText}>{selectedVariant.detail}</Text>
        </View>

        {/* Play options */}
        <Text style={styles.sectionTitle}>Coming soon</Text>
        <View style={styles.options}>

          <TouchableOpacity
            style={[styles.optionCard, styles.optionDisabled]}
            accessibilityLabel="Play Rummy online — coming in Step 12"
          >
            <Text style={styles.optionEmoji}>🌐</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Play vs Friend</Text>
              <Text style={styles.optionDesc}>Online rooms — coming in Step 12</Text>
            </View>
            <Text style={styles.optionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, styles.optionDisabled]}
            accessibilityLabel="Play Rummy vs AI — coming in Step 15"
          >
            <Text style={styles.optionEmoji}>🤖</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Play vs AI</Text>
              <Text style={styles.optionDesc}>Claude AI — coming in Step 15</Text>
            </View>
            <Text style={styles.optionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, styles.optionDisabled]}
            accessibilityLabel="Play Rummy offline — deferred pending Mac"
          >
            <Text style={styles.optionEmoji}>📡</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Play Offline</Text>
              <Text style={styles.optionDesc}>Wi-Fi / Bluetooth — deferred pending Mac</Text>
            </View>
            <Text style={styles.optionArrow}>→</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOURS.BACKGROUND },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, gap: 20 },
  header: { alignItems: 'center', gap: 8, paddingTop: 8 },
  emoji: { fontSize: 52 },
  title: { color: COLOURS.TEXT_PRIMARY, fontSize: 32, fontWeight: '800' },
  subtitle: { color: COLOURS.TEXT_SECONDARY, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  sectionTitle: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  variants: { gap: 8 },
  variantCard: {
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    gap: 4,
  },
  variantCardSelected: {
    borderColor: COLOURS.PRIMARY,
    backgroundColor: COLOURS.SURFACE_ELEVATED,
  },
  variantHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  variantLabel: { color: COLOURS.TEXT_PRIMARY, fontSize: 15, fontWeight: '600' },
  variantLabelSelected: { color: COLOURS.PRIMARY },
  variantDesc: { color: COLOURS.TEXT_SECONDARY, fontSize: 12 },
  selectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLOURS.PRIMARY },
  detailBox: {
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    gap: 6,
  },
  detailTitle: { color: COLOURS.TEXT_PRIMARY, fontSize: 14, fontWeight: '600' },
  detailText: { color: COLOURS.TEXT_SECONDARY, fontSize: 13, lineHeight: 20 },
  options: { gap: 10 },
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
  optionDisabled: { opacity: 0.4 },
  optionEmoji: { fontSize: 26 },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { color: COLOURS.TEXT_PRIMARY, fontSize: 15, fontWeight: '600' },
  optionDesc: { color: COLOURS.TEXT_SECONDARY, fontSize: 12 },
  optionArrow: { color: COLOURS.TEXT_MUTED, fontSize: 16 },
});