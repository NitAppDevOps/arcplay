import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';
import { useAuthStore } from '@store/authStore';
import {
  getRoom,
  joinRoom,
  subscribeToRoom,
} from '@services/rooms';

type Props = NativeStackScreenProps<GamesStackParamList, 'ChessRoomLobby'>;

/** ChessRoomLobbyScreen — waiting room for both players before game starts */
export default function ChessRoomLobbyScreen({ navigation, route }: Props): React.JSX.Element {
  const { roomId } = route.params;
  const { user } = useAuthStore();

  const [room, setRoom] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [joinCode, setJoinCode] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [mode, setMode] = useState<'host' | 'join' | null>(null);
  const hasNavigated = useRef<boolean>(false);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Navigates to board — guarded to prevent double navigation */
  const navigateToBoard = (): void => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    if (pollInterval.current) clearInterval(pollInterval.current);
    navigation.replace('ChessBoard', { roomId });
  };

  /** Loads room data on mount */
  useEffect(() => {
    const loadRoom = async (): Promise<void> => {
      const { room: fetchedRoom, error: fetchError } = await getRoom(roomId);
      if (fetchError || !fetchedRoom) {
        setError('Room not found.');
        setIsLoading(false);
        return;
      }
      setRoom(fetchedRoom);
      setMode(fetchedRoom.host_id === user?.id ? 'host' : 'join');
      if (fetchedRoom.status === 'active') {
        navigateToBoard();
        return;
      }
      setIsLoading(false);
    };
    loadRoom();
  }, [roomId]);

  /** Realtime subscription to room updates */
  useEffect(() => {
    if (!roomId) return;
    const subscription = subscribeToRoom(roomId, (updatedRoom) => {
      setRoom(updatedRoom);
      if (updatedRoom?.status === 'active') {
        navigateToBoard();
      }
    });
    return () => { subscription.unsubscribe(); };
  }, [roomId]);

  /** Polling fallback — checks room status every 2 seconds */
  useEffect(() => {
    pollInterval.current = setInterval(async () => {
      const { room: freshRoom } = await getRoom(roomId);
      if (freshRoom) {
        setRoom(freshRoom);
        if (freshRoom.status === 'active') {
          navigateToBoard();
        }
      }
    }, 2000);

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [roomId]);

  /** Handles guest joining */
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
      navigation.replace('ChessBoard', { roomId: joinCode.trim().toUpperCase() });
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={COLOURS.PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  const isHost = mode === 'host';
  const guestJoined = room?.guest_id !== null && room?.guest_id !== undefined;
  const myColour = isHost
    ? room?.host_colour === 'w' ? 'White' : 'Black'
    : room?.host_colour === 'w' ? 'Black' : 'White';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>

        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          {isHost ? 'Waiting for opponent' : 'Join a room'}
        </Text>

        {isHost && (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Room code</Text>
            <Text style={styles.code}>{roomId}</Text>
            <Text style={styles.codeHint}>Share this with your opponent</Text>
          </View>
        )}

        {!isHost && !guestJoined && (
          <View style={styles.joinForm}>
            <Text style={styles.fieldLabel}>Enter room code</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. ABC123"
              placeholderTextColor={COLOURS.TEXT_MUTED}
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="Room code input"
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
                <Text style={styles.joinBtnText}>Join room</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.players}>
          <Text style={styles.playersTitle}>Players</Text>
          <View style={styles.playerRow}>
            <View style={styles.playerDot} />
            <Text style={styles.playerName}>You (Host)</Text>
            <Text style={styles.playerColour}>
              {room?.host_colour === 'w' ? '⬜ White' : '⬛ Black'}
            </Text>
            <View style={styles.readyBadge}>
              <Text style={styles.readyText}>Ready</Text>
            </View>
          </View>
          <View style={styles.playerRow}>
            <View style={[styles.playerDot, !guestJoined && styles.playerDotEmpty]} />
            <Text style={[styles.playerName, !guestJoined && styles.playerNameMuted]}>
              {guestJoined ? 'Opponent' : 'Waiting for opponent...'}
            </Text>
            {guestJoined && (
              <Text style={styles.playerColour}>
                {room?.host_colour === 'w' ? '⬛ Black' : '⬜ White'}
              </Text>
            )}
            {guestJoined && (
              <View style={styles.readyBadge}>
                <Text style={styles.readyText}>Ready</Text>
              </View>
            )}
          </View>
        </View>

        {room && (
          <View style={styles.colourInfo}>
            <Text style={styles.colourInfoText}>
              You are playing as <Text style={styles.colourBold}>{myColour}</Text>
            </Text>
          </View>
        )}

        {!guestJoined && (
          <View style={styles.waitingRow}>
            <ActivityIndicator size="small" color={COLOURS.TEXT_MUTED} />
            <Text style={styles.waitingText}>
              Waiting for opponent to join...
            </Text>
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOURS.BACKGROUND },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 16, gap: 20 },
  back: { alignSelf: 'flex-start', paddingVertical: 8 },
  backText: { color: COLOURS.TEXT_SECONDARY, fontSize: 15 },
  title: { color: COLOURS.TEXT_PRIMARY, fontSize: 28, fontWeight: '700' },
  codeBox: {
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLOURS.PRIMARY,
  },
  codeLabel: { color: COLOURS.TEXT_SECONDARY, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  code: { color: COLOURS.PRIMARY, fontSize: 42, fontWeight: '800', letterSpacing: 6 },
  codeHint: { color: COLOURS.TEXT_MUTED, fontSize: 12 },
  joinForm: { gap: 12 },
  fieldLabel: { color: COLOURS.TEXT_SECONDARY, fontSize: 13, fontWeight: '500' },
  input: {
    backgroundColor: COLOURS.SURFACE,
    color: COLOURS.TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
  },
  joinBtn: { backgroundColor: COLOURS.PRIMARY, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnDisabled: { backgroundColor: COLOURS.SURFACE_ELEVATED },
  joinBtnText: { color: COLOURS.TEXT_PRIMARY, fontSize: 16, fontWeight: '700' },
  players: {
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
  },
  playersTitle: { color: COLOURS.TEXT_SECONDARY, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLOURS.SUCCESS },
  playerDotEmpty: { backgroundColor: COLOURS.BORDER },
  playerName: { color: COLOURS.TEXT_PRIMARY, fontSize: 14, fontWeight: '500', flex: 1 },
  playerNameMuted: { color: COLOURS.TEXT_MUTED },
  playerColour: { color: COLOURS.TEXT_SECONDARY, fontSize: 13 },
  readyBadge: { backgroundColor: COLOURS.SUCCESS, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  readyText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  colourInfo: {
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
  },
  colourInfoText: { color: COLOURS.TEXT_SECONDARY, fontSize: 14 },
  colourBold: { color: COLOURS.TEXT_PRIMARY, fontWeight: '700' },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  waitingText: { color: COLOURS.TEXT_MUTED, fontSize: 13 },
  error: { color: COLOURS.ERROR, fontSize: 13, textAlign: 'center' },
});