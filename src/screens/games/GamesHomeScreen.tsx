import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';

type Props = NativeStackScreenProps<GamesStackParamList, 'GamesHome'>;

/** GamesHomeScreen — game library showing subscribed games */
export default function GamesHomeScreen({ navigation }: Props): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <Text style={styles.title}>Your Games</Text>
        <Text style={styles.subtitle}>Tap a game to play</Text>

        <View style={styles.games}>
          {/* Chess */}
          <TouchableOpacity
            style={styles.gameCard}
            onPress={() => navigation.navigate('ChessHome')}
            accessibilityLabel="Play Chess"
          >
            <View style={styles.gameIcon}>
              <Text style={styles.gameEmoji}>♟</Text>
            </View>
            <View style={styles.gameInfo}>
              <Text style={styles.gameName}>Chess</Text>
              <Text style={styles.gameDesc}>Strategy · 2 players</Text>
            </View>
            <View style={styles.subscribedBadge}>
              <Text style={styles.subscribedText}>Subscribed</Text>
            </View>
          </TouchableOpacity>

          {/* Rummy */}
          <TouchableOpacity
            style={[styles.gameCard, styles.gameCardDisabled]}
            accessibilityLabel="Play Rummy — coming soon"
          >
            <View style={styles.gameIcon}>
              <Text style={styles.gameEmoji}>🃏</Text>
            </View>
            <View style={styles.gameInfo}>
              <Text style={styles.gameName}>Rummy</Text>
              <Text style={styles.gameDesc}>Card game · 2–6 players · Coming in Step 11</Text>
            </View>
            <View style={styles.subscribedBadge}>
              <Text style={styles.subscribedText}>Subscribed</Text>
            </View>
          </TouchableOpacity>
        </View>

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
    paddingTop: 24,
    paddingBottom: 40,
    gap: 16,
  },
  title: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 14,
  },
  games: {
    gap: 12,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    gap: 14,
  },
  gameCardDisabled: {
    opacity: 0.4,
  },
  gameIcon: {
    width: 56,
    height: 56,
    backgroundColor: COLOURS.SURFACE_ELEVATED,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameEmoji: {
    fontSize: 30,
  },
  gameInfo: {
    flex: 1,
    gap: 4,
  },
  gameName: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '600',
  },
  gameDesc: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 12,
  },
  subscribedBadge: {
    backgroundColor: COLOURS.PRIMARY_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subscribedText: {
    color: COLOURS.PRIMARY,
    fontSize: 11,
    fontWeight: '600',
  },
});