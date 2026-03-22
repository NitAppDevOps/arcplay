import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';
import { useAuthStore } from '@store/authStore';
import { joinRoom } from '@services/rooms';

type Props = NativeStackScreenProps<GamesStackParamList, 'ChessHome'>;

/** ChessHomeScreen — entry point for Chess with play options */
export default function ChessHomeScreen({ navigation }: Props): React.JSX.Element {
  const { user } = useAuthStore();
  const [showJoin, setShowJoin] = useState<boolean>(false);
  const [joinCode, setJoinCode] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  /** Handles joining a room by code */
  const handleJoin = async (): Promise<void> => {
    if (!user) return;
    setError('');
    if (joinCode.trim().length !== 6) {
      setError('Please enter a 6-character room code.');
      return;
    }
    setIsJoining(true);
    try {
      const { error: joinError } = await joinRoom(joinCode.trim(), user.id);
      if (joinError) {
        setError(joinError);
        return;
      }
      navigation.navigate('ChessRoomLobby', { roomId: joinCode.trim().toUpperCase() });
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>

        <View style={styles.header}>
          <Text style={styles.emoji}>♟</Text>
          <Text style={styles.title}>Chess</Text>
          <Text style={styles.subtitle}>
            Play locally, challenge a friend online, or compete offline
          </Text>
        </View>

        <View style={styles.options}>

          {/* Play locally */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => navigation.navigate('ChessBoard', { roomId: 'local', timeControl: null })}
            accessibilityLabel="Play chess locally"
          >
            <Text style={styles.optionEmoji}>👥</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Play locally</Text>
              <Text style={styles.optionDesc}>Two players, one device</Text>
            </View>
            <Text style={styles.optionArrow}>→</Text>
          </TouchableOpacity>

          {/* Create online room */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => navigation.navigate('ChessCreateRoom')}
            accessibilityLabel="Create a chess room"
          >
            <Text style={styles.optionEmoji}>🌐</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Create room</Text>
              <Text style={styles.optionDesc}>Play vs a friend online</Text>
            </View>
            <Text style={styles.optionArrow}>→</Text>
          </TouchableOpacity>

          {/* Join online room */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setShowJoin(!showJoin)}
            accessibilityLabel="Join a chess room"
          >
            <Text style={styles.optionEmoji}>🔗</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Join room</Text>
              <Text style={styles.optionDesc}>Enter a friend's room code</Text>
            </View>
            <Text style={styles.optionArrow}>{showJoin ? '↑' : '→'}</Text>
          </TouchableOpacity>

          {/* Join form inline */}
          {showJoin && (
            <View style={styles.joinForm}>
              <TextInput
                style={styles.input}
                placeholder="Enter 6-character code"
                placeholderTextColor={COLOURS.TEXT_MUTED}
                value={joinCode}
                onChangeText={(t) => setJoinCode(t.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
                accessibilityLabel="Room code"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.joinBtn, isJoining && styles.btnDisabled]}
                onPress={handleJoin}
                disabled={isJoining}
                accessibilityLabel="Join room"
              >
                {isJoining ? (
                  <ActivityIndicator color={COLOURS.TEXT_PRIMARY} />
                ) : (
                  <Text style={styles.joinBtnText}>Join →</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Play vs AI */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => navigation.navigate('ChessAISetup')}
            accessibilityLabel="Play chess against Claude AI"
          >
            <Text style={styles.optionEmoji}>🤖</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Play vs AI</Text>
              <Text style={styles.optionDesc}>Powered by Claude</Text>
            </View>
            <Text style={styles.optionArrow}>→</Text>
          </TouchableOpacity>


          {/* Play offline */}
          <TouchableOpacity
            style={[styles.optionCard, styles.optionDisabled]}
            accessibilityLabel="Play offline — coming soon"
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
  container: { flex: 1, backgroundColor: COLOURS.BACKGROUND },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 16, gap: 32 },
  header: { alignItems: 'center', gap: 8, paddingTop: 16 },
  emoji: { fontSize: 56 },
  title: { color: COLOURS.TEXT_PRIMARY, fontSize: 32, fontWeight: '800' },
  subtitle: { color: COLOURS.TEXT_SECONDARY, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  options: { gap: 12 },
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
  optionEmoji: { fontSize: 28 },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { color: COLOURS.TEXT_PRIMARY, fontSize: 16, fontWeight: '600' },
  optionDesc: { color: COLOURS.TEXT_SECONDARY, fontSize: 12 },
  optionArrow: { color: COLOURS.TEXT_MUTED, fontSize: 18 },
  joinForm: {
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
  },
  input: {
    backgroundColor: COLOURS.BACKGROUND,
    color: COLOURS.TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
  },
  error: { color: COLOURS.ERROR, fontSize: 13, textAlign: 'center' },
  joinBtn: {
    backgroundColor: COLOURS.PRIMARY,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: COLOURS.SURFACE_ELEVATED },
  joinBtnText: { color: COLOURS.TEXT_PRIMARY, fontSize: 15, fontWeight: '700' },
});