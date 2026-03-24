import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';

type Props = NativeStackScreenProps<GamesStackParamList, 'RummyHome'>;

/** RummyHomeScreen — play mode selection only. Variant selection happens on subsequent screens. */
export default function RummyHomeScreen({ navigation }: Props): React.JSX.Element {
  const [joinExpanded, setJoinExpanded] = useState<boolean>(false);
  const [joinCode, setJoinCode] = useState<string>('');
  const [joinError, setJoinError] = useState<string>('');

  const handleJoinRoom = (): void => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setJoinError('Enter the 6-character room code.');
      return;
    }
    navigation.navigate('RummyRoomLobby', { roomId: code });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🃏</Text>
          <Text style={styles.title}>Rummy</Text>
          <Text style={styles.subtitle}>
            Play with friends or join a room online
          </Text>
        </View>

        {/* ── How to play ─────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>How to play</Text>
        <View style={styles.options}>

          {/* Quick Play — disabled, future step */}
          <View style={[styles.optionCard, styles.optionDisabled]}>
            <Text style={styles.optionEmoji}>⚡</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Quick Play</Text>
              <Text style={styles.optionDesc}>Random matchmaking — coming soon</Text>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </View>

          {/* Create a Room — navigate directly; variant chosen on the next screen */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => navigation.navigate('RummyCreateRoom')}
            accessibilityLabel="Create a Rummy room"
          >
            <Text style={styles.optionEmoji}>🌐</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Create a Room</Text>
              <Text style={styles.optionDesc}>Host a private game and invite friends</Text>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>

          {/* Join a Room — expands code entry inline */}
          <TouchableOpacity
            style={[styles.optionCard, joinExpanded && styles.optionCardActive]}
            onPress={() => { setJoinExpanded(p => !p); setJoinError(''); }}
            accessibilityLabel="Join a room with a code"
          >
            <Text style={styles.optionEmoji}>🚪</Text>
            <View style={styles.optionText}>
              <Text style={[styles.optionTitle, joinExpanded && styles.optionTitleActive]}>
                Join a Room
              </Text>
              <Text style={styles.optionDesc}>Enter a room code from a friend</Text>
            </View>
            <Text style={[styles.optionArrow, joinExpanded && styles.optionArrowActive]}>
              {joinExpanded ? '▾' : '›'}
            </Text>
          </TouchableOpacity>

          {/* Join code entry — visible only when Join is expanded */}
          {joinExpanded && (
            <View style={styles.joinPanel}>
              <TextInput
                style={styles.codeInput}
                value={joinCode}
                onChangeText={t => { setJoinCode(t.toUpperCase()); setJoinError(''); }}
                placeholder="ROOM CODE"
                placeholderTextColor={COLOURS.TEXT_MUTED}
                autoCapitalize="characters"
                maxLength={6}
                autoFocus
                accessibilityLabel="Room code input"
              />
              {joinError ? <Text style={styles.errorText}>{joinError}</Text> : null}
              <TouchableOpacity
                style={[styles.joinBtn, joinCode.trim().length !== 6 && styles.joinBtnDisabled]}
                onPress={handleJoinRoom}
                disabled={joinCode.trim().length !== 6}
                accessibilityLabel="Join room"
              >
                <Text style={styles.joinBtnText}>Join Room</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* vs AI — disabled */}
          <View style={[styles.optionCard, styles.optionDisabled]}>
            <Text style={styles.optionEmoji}>🤖</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>vs AI</Text>
              <Text style={styles.optionDesc}>Claude AI opponent — coming in Step 15</Text>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </View>

          {/* Offline — disabled */}
          <View style={[styles.optionCard, styles.optionDisabled]}>
            <Text style={styles.optionEmoji}>📡</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Play Offline</Text>
              <Text style={styles.optionDesc}>Wi-Fi / Bluetooth — deferred pending Mac</Text>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </View>

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
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  options: { gap: 8 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    gap: 14,
  },
  optionCardActive: {
    borderColor: COLOURS.PRIMARY,
    backgroundColor: COLOURS.SURFACE_ELEVATED,
  },
  optionDisabled: { opacity: 0.38 },
  optionEmoji: { fontSize: 24 },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { color: COLOURS.TEXT_PRIMARY, fontSize: 15, fontWeight: '600' },
  optionTitleActive: { color: COLOURS.PRIMARY },
  optionDesc: { color: COLOURS.TEXT_SECONDARY, fontSize: 12, lineHeight: 17 },
  optionArrow: { color: COLOURS.TEXT_MUTED, fontSize: 18, fontWeight: '600' },
  optionArrowActive: { color: COLOURS.PRIMARY },

  // Join code panel
  joinPanel: {
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLOURS.BORDER_STRONG,
    gap: 12,
    marginTop: -4, // visually attach to the Join card above
  },
  codeInput: {
    backgroundColor: COLOURS.SURFACE_ELEVATED,
    color: COLOURS.TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 6,
    textAlign: 'center',
  },
  errorText: { color: COLOURS.ERROR, fontSize: 13, textAlign: 'center' },
  joinBtn: {
    backgroundColor: COLOURS.PRIMARY,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  joinBtnDisabled: { opacity: 0.4 },
  joinBtnText: { color: COLOURS.TEXT_ON_PRIMARY, fontSize: 15, fontWeight: '700' },
});
