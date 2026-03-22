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
import type { RootStackParamList } from '@app-types/navigation.types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { COLOURS } from '@constants/colours';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'GameLibraryIntro'>;

interface IGame {
  id: string;
  emoji: string;
  name: string;
  tagline: string;
  variants?: string;
  players: string;
  difficulty: string;
}

const GAMES: IGame[] = [
  {
    id: 'chess',
    emoji: '♟',
    name: 'Chess',
    tagline: 'The ultimate game of strategy and foresight',
    players: '2 players',
    difficulty: 'All levels',
  },
  {
    id: 'rummy',
    emoji: '🃏',
    name: 'Rummy',
    tagline: 'Form sequences and sets to declare first',
    variants: 'Points · Deals · Pool (101/201)',
    players: '2–6 players',
    difficulty: 'All levels',
  },
];

/** GameLibraryIntroScreen — introduces launch games, player subscribes to start */
export default function GameLibraryIntroScreen({ navigation }: Props): React.JSX.Element {
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [subscribed, setSubscribed] = useState<Set<string>>(new Set(['chess', 'rummy']));

  /** Toggles game subscription */
  const toggleGame = (id: string): void => {
    setSubscribed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /** Navigates to main app — Supabase save happens in Step 5 */
  const handleEnter = (): void => {
    rootNav.navigate('Main');
  };

  const canEnter = subscribed.size > 0;

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

        <Text style={styles.title}>Choose your games</Text>
        <Text style={styles.subtitle}>
          Subscribe to any game with one tap. Your profile, reputation,
          and wallet work across every game you play.
        </Text>

        {/* Game cards */}
        <View style={styles.games}>
          {GAMES.map((game) => {
            const isSubscribed = subscribed.has(game.id);
            return (
              <View
                key={game.id}
                style={[styles.card, isSubscribed && styles.cardSubscribed]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <Text style={styles.cardEmoji}>{game.emoji}</Text>
                  </View>
                  <View style={styles.cardTitle}>
                    <Text style={styles.gameName}>{game.name}</Text>
                    {isSubscribed && (
                      <View style={styles.subscribedBadge}>
                        <Text style={styles.subscribedBadgeText}>Subscribed</Text>
                      </View>
                    )}
                  </View>
                </View>

                <Text style={styles.tagline}>{game.tagline}</Text>

                {game.variants && (
                  <View style={styles.variantRow}>
                    <Text style={styles.variantLabel}>Variants</Text>
                    <Text style={styles.variantValue}>{game.variants}</Text>
                  </View>
                )}

                <View style={styles.metaRow}>
                  <View style={styles.metaChip}>
                    <Text style={styles.metaText}>{game.players}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Text style={styles.metaText}>{game.difficulty}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.subscribeBtn,
                    isSubscribed && styles.subscribeBtnActive,
                  ]}
                  onPress={() => toggleGame(game.id)}
                  accessibilityLabel={
                    isSubscribed
                      ? `Unsubscribe from ${game.name}`
                      : `Subscribe to ${game.name}`
                  }
                >
                  <Text style={[
                    styles.subscribeBtnText,
                    isSubscribed && styles.subscribeBtnTextActive,
                  ]}>
                    {isSubscribed ? '✓ Subscribed' : 'Subscribe — Free'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Coming soon */}
        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonTitle}>Coming soon</Text>
          <Text style={styles.comingSoonText}>
            Poker and more games are on the way. You'll be able to subscribe
            to new games from the Game Library at any time — no new account needed.
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.btn, !canEnter && styles.btnDisabled]}
          onPress={handleEnter}
          disabled={!canEnter}
          accessibilityLabel="Enter ARCPLAY"
        >
          <Text style={styles.btnText}>
            {canEnter
              ? `Enter ARCPLAY with ${subscribed.size} game${subscribed.size > 1 ? 's' : ''}`
              : 'Subscribe to at least one game'}
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
    lineHeight: 22,
  },
  games: {
    gap: 16,
  },
  card: {
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    gap: 14,
  },
  cardSubscribed: {
    borderColor: COLOURS.PRIMARY,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLOURS.SURFACE_ELEVATED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardTitle: {
    flex: 1,
    gap: 4,
  },
  gameName: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: '700',
  },
  subscribedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLOURS.PRIMARY_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subscribedBadgeText: {
    color: COLOURS.PRIMARY,
    fontSize: 11,
    fontWeight: '600',
  },
  tagline: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 18,
  },
  variantRow: {
    gap: 4,
  },
  variantLabel: {
    color: COLOURS.TEXT_MUTED,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  variantValue: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaChip: {
    backgroundColor: COLOURS.SURFACE_ELEVATED,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaText: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 12,
  },
  subscribeBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    backgroundColor: COLOURS.SURFACE_ELEVATED,
  },
  subscribeBtnActive: {
    backgroundColor: COLOURS.PRIMARY,
    borderColor: COLOURS.PRIMARY,
  },
  subscribeBtnText: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '600',
  },
  subscribeBtnTextActive: {
    color: COLOURS.TEXT_PRIMARY,
  },
  comingSoon: {
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 14,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
  },
  comingSoonTitle: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '600',
  },
  comingSoonText: {
    color: COLOURS.TEXT_MUTED,
    fontSize: 12,
    lineHeight: 18,
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