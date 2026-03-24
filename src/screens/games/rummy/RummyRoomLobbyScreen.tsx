import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';
import { useAuthStore } from '@store/authStore';
import {
  getRummyRoom,
  joinRummyRoom,
  startRummyGame,
  subscribeToRummyRoom,
  type IRummyRoom,
} from '@services/rummyRooms';

type Props = NativeStackScreenProps<GamesStackParamList, 'RummyRoomLobby'>;

const VARIANT_LABELS: Record<string, string> = {
  points: 'Points Rummy',
  deals: 'Deals Rummy',
  pool: 'Pool Rummy',
};

/** RummyRoomLobbyScreen — waiting room with player list, host config display, start button */
export default function RummyRoomLobbyScreen({ navigation, route }: Props): React.JSX.Element {
  const { roomId } = route.params;
  const { user } = useAuthStore();

  const [room, setRoom] = useState<IRummyRoom | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinCode, setJoinCode] = useState<string>(roomId ?? '');
  const [error, setError] = useState<string>('');
  const [mode, setMode] = useState<'host' | 'guest_in_room' | 'guest_entering' | null>(null);

  const hasNavigated = useRef<boolean>(false);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Navigates to the table once game is active — accepts fresh room data to avoid stale closure */
  const navigateToTable = (freshRoom: IRummyRoom): void => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    if (pollInterval.current) clearInterval(pollInterval.current);
    const playerIds: string[] = freshRoom.player_ids ?? [];
    const myIndex = playerIds.indexOf(user?.id ?? '');
    navigation.replace('RummyTable', {
      roomId: freshRoom.id,
      mode: 'online',
      playerIndex: myIndex >= 0 ? myIndex : 0,
    });
  };

  /** Loads room and determines mode */
  useEffect(() => {
    const load = async (): Promise<void> => {
      // If no roomId provided, user is entering from the join side
      if (!roomId) {
        setMode('guest_entering');
        setIsLoading(false);
        return;
      }

      const { room: fetchedRoom, error: fetchError } = await getRummyRoom(roomId);
      if (fetchError || !fetchedRoom) {
        setError('Room not found.');
        setIsLoading(false);
        return;
      }

      setRoom(fetchedRoom);

      const playerIds: string[] = fetchedRoom.player_ids ?? [];
      const isHost = fetchedRoom.host_id === user?.id;
      const isPlayer = playerIds.includes(user?.id ?? '');

      if (isHost) {
        setMode('host');
      } else if (isPlayer) {
        setMode('guest_in_room');
      } else if (user) {
        // roomId came from the home screen join flow — auto-join without showing the form again
        const displayName = user.user_metadata?.username ?? user.user_metadata?.full_name ?? user.email ?? 'Guest';
        const { error: joinError } = await joinRummyRoom(roomId, user.id, displayName);
        if (joinError) {
          setError(joinError);
          setMode('guest_entering');
        } else {
          const { room: updated } = await getRummyRoom(roomId);
          if (updated) setRoom(updated);
          setMode('guest_in_room');
        }
      } else {
        setMode('guest_entering');
      }

      if (fetchedRoom.status === 'active') {
        navigateToTable(fetchedRoom);
        return;
      }

      setIsLoading(false);
    };

    load();
  }, [roomId]);

  /** Realtime subscription */
  useEffect(() => {
    if (!roomId) return;
    const sub = subscribeToRummyRoom(roomId, (updatedRoom) => {
      setRoom(updatedRoom);
      if (updatedRoom?.status === 'active') {
        navigateToTable(updatedRoom);
      }
    });
    return () => { sub.unsubscribe(); };
  }, [roomId]);

  /** Polling fallback every 2 seconds */
  useEffect(() => {
    if (!roomId) return;
    pollInterval.current = setInterval(async () => {
      const { room: freshRoom } = await getRummyRoom(roomId);
      if (freshRoom) {
        setRoom(freshRoom);
        if (freshRoom.status === 'active') navigateToTable(freshRoom);
      }
    }, 2000);
    return () => { if (pollInterval.current) clearInterval(pollInterval.current); };
  }, [roomId]);

  /** Guest joins via entered room code */
  const handleJoin = async (): Promise<void> => {
    if (!user) return;
    setError('');
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setError('Please enter a 6-character room code.');
      return;
    }
    setIsJoining(true);
    try {
      const displayName = user.user_metadata?.username ?? user.user_metadata?.full_name ?? user.email ?? 'Guest';
      const { error: joinError } = await joinRummyRoom(code, user.id, displayName);
      if (joinError) {
        setError(joinError);
        return;
      }
      // Navigate to a fresh lobby with the real roomId so subscriptions wire up correctly
      navigation.replace('RummyRoomLobby', { roomId: code });
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsJoining(false);
    }
  };

  /** Host starts the game */
  const handleStartGame = async (): Promise<void> => {
    if (!user || !room) return;
    const playerIds: string[] = room.player_ids ?? [];
    const config = room.config;
    if (playerIds.length < 2) {
      setError('Need at least 2 players to start.');
      return;
    }
    if (config && playerIds.length < config.playerCount) {
      Alert.alert(
        'Start with fewer players?',
        `Room is set for ${config.playerCount} players but only ${playerIds.length} have joined. Start anyway?`,
        [
          { text: 'Wait', style: 'cancel' },
          { text: 'Start now', onPress: () => doStartGame() },
        ]
      );
      return;
    }
    doStartGame();
  };

  const doStartGame = async (): Promise<void> => {
    if (!user || !room) return;
    setIsStarting(true);
    setError('');
    try {
      const { error: startError } = await startRummyGame(room.id, user.id);
      if (startError) {
        setError(startError);
      }
      // Navigation will fire from realtime subscription once status → active
    } catch {
      setError('Failed to start game.');
    } finally {
      setIsStarting(false);
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

  // ── Guest entering — show join form ─────────────────────────────────────────
  if (mode === 'guest_entering') {
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

          <Text style={styles.title}>Join a room</Text>
          <Text style={styles.subtitle}>Enter the room code shared by the host.</Text>

          <View style={styles.joinForm}>
            <Text style={styles.fieldLabel}>Room code</Text>
            <TextInput
              style={styles.codeInput}
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
              style={[styles.primaryBtn, isJoining && styles.btnDisabled]}
              onPress={handleJoin}
              disabled={isJoining}
              accessibilityLabel="Join Rummy room"
            >
              {isJoining ? (
                <ActivityIndicator color={COLOURS.TEXT_ON_PRIMARY} />
              ) : (
                <Text style={styles.primaryBtnText}>Join room</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Host or guest already in room ────────────────────────────────────────────
  const isHost = mode === 'host';
  const playerIds: string[] = room?.player_ids ?? [];
  const playerNames: string[] = room?.player_names ?? [];
  const config = room?.config;
  const variantLabel = room ? VARIANT_LABELS[room.variant] ?? room.variant : '';
  const slotsNeeded = config?.playerCount ?? 2;
  const slotsRemaining = slotsNeeded - playerIds.length;
  const canStart = playerIds.length >= 2;

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

        <Text style={styles.title}>
          {isHost ? 'Waiting for players' : 'Waiting for host'}
        </Text>

        {/* Room code display */}
        {isHost && (
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>ROOM CODE</Text>
            <Text style={styles.code}>{room?.id}</Text>
            <Text style={styles.codeHint}>Share this with your players</Text>
          </View>
        )}

        {/* Game config summary */}
        <View style={styles.configCard}>
          <Text style={styles.configCardTitle}>Game settings</Text>
          <View style={styles.configRows}>
            <View style={styles.configItem}>
              <Text style={styles.configItemLabel}>Variant</Text>
              <Text style={styles.configItemValue}>{variantLabel}</Text>
            </View>
            <View style={styles.configItem}>
              <Text style={styles.configItemLabel}>Players</Text>
              <Text style={styles.configItemValue}>{slotsNeeded}</Text>
            </View>
            {config && (
              <>
                <View style={styles.configItem}>
                  <Text style={styles.configItemLabel}>First scoot</Text>
                  <Text style={styles.configItemValue}>{config.firstScootPoints} pts</Text>
                </View>
                <View style={styles.configItem}>
                  <Text style={styles.configItemLabel}>Mid scoot</Text>
                  <Text style={styles.configItemValue}>{config.midScootPoints} pts</Text>
                </View>
                {room?.variant === 'pool' && (
                  <View style={styles.configItem}>
                    <Text style={styles.configItemLabel}>Pool limit</Text>
                    <Text style={styles.configItemValue}>{config.poolSize} pts</Text>
                  </View>
                )}
                {room?.variant === 'deals' && (
                  <View style={styles.configItem}>
                    <Text style={styles.configItemLabel}>Total deals</Text>
                    <Text style={styles.configItemValue}>{config.totalDeals}</Text>
                  </View>
                )}
                <View style={styles.configItem}>
                  <Text style={styles.configItemLabel}>Turn timer</Text>
                  <Text style={styles.configItemValue}>
                    {config.turnTimerSeconds ? `${config.turnTimerSeconds}s` : 'Off'}
                  </Text>
                </View>
                <View style={styles.configItem}>
                  <Text style={styles.configItemLabel}>Joker</Text>
                  <Text style={styles.configItemValue}>
                    {config.jokerType === 'open' ? 'Open' : 'Closed'}
                  </Text>
                </View>
                <View style={styles.configItem}>
                  <Text style={styles.configItemLabel}>Joker from discard</Text>
                  <Text style={styles.configItemValue}>
                    {config.allowJokerFromDiscard ? 'Allowed' : 'Not allowed'}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Player list */}
        <View style={styles.playersCard}>
          <Text style={styles.playersTitle}>
            Players — {playerIds.length} / {slotsNeeded}
          </Text>
          {playerIds.map((id, index) => {
            const isMe = id === user?.id;
            const name = playerNames[index] ?? `Player ${index + 1}`;
            const isRoomHost = id === room?.host_id;
            return (
              <View key={id} style={styles.playerRow}>
                <View style={styles.playerDot} />
                <Text style={styles.playerName}>
                  {name}{isMe ? ' (you)' : ''}
                </Text>
                {isRoomHost && (
                  <View style={styles.hostBadge}>
                    <Text style={styles.hostBadgeText}>Host</Text>
                  </View>
                )}
                <View style={styles.readyBadge}>
                  <Text style={styles.readyBadgeText}>Ready</Text>
                </View>
              </View>
            );
          })}
          {Array.from({ length: slotsRemaining }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.playerRow}>
              <View style={styles.playerDotEmpty} />
              <Text style={styles.playerNameMuted}>Waiting for player...</Text>
            </View>
          ))}
        </View>

        {/* Error */}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Waiting indicator for guests */}
        {!isHost && (
          <View style={styles.waitingRow}>
            <ActivityIndicator size="small" color={COLOURS.TEXT_MUTED} />
            <Text style={styles.waitingText}>Waiting for host to start...</Text>
          </View>
        )}

        {/* Start button — host only */}
        {isHost && (
          <TouchableOpacity
            style={[styles.primaryBtn, (!canStart || isStarting) && styles.btnDisabled]}
            onPress={handleStartGame}
            disabled={!canStart || isStarting}
            accessibilityLabel="Start Rummy game"
          >
            {isStarting ? (
              <ActivityIndicator color={COLOURS.TEXT_ON_PRIMARY} />
            ) : (
              <Text style={styles.primaryBtnText}>
                {canStart ? 'Start game →' : `Need ${2 - playerIds.length} more player${playerIds.length < 1 ? 's' : ''}`}
              </Text>
            )}
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOURS.BACKGROUND },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, gap: 20 },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: { alignSelf: 'flex-start', paddingVertical: 8 },
  backText: { color: COLOURS.TEXT_SECONDARY, fontSize: 15 },
  title: { color: COLOURS.TEXT_PRIMARY, fontSize: 28, fontWeight: '700' },
  subtitle: { color: COLOURS.TEXT_SECONDARY, fontSize: 14, lineHeight: 22 },
  codeCard: {
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLOURS.PRIMARY,
  },
  codeLabel: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  code: { color: COLOURS.PRIMARY, fontSize: 42, fontWeight: '800', letterSpacing: 6 },
  codeHint: { color: COLOURS.TEXT_MUTED, fontSize: 12 },
  configCard: {
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    overflow: 'hidden',
  },
  configCardTitle: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  configRows: { borderTopWidth: 1, borderTopColor: COLOURS.BORDER },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLOURS.BORDER,
  },
  configItemLabel: { color: COLOURS.TEXT_SECONDARY, fontSize: 14 },
  configItemValue: { color: COLOURS.TEXT_PRIMARY, fontSize: 14, fontWeight: '600' },
  playersCard: {
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
  },
  playersTitle: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  playerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLOURS.SUCCESS },
  playerDotEmpty: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLOURS.BORDER },
  playerName: { color: COLOURS.TEXT_PRIMARY, fontSize: 14, fontWeight: '500', flex: 1 },
  playerNameMuted: { color: COLOURS.TEXT_MUTED, fontSize: 14, flex: 1 },
  hostBadge: {
    backgroundColor: COLOURS.PRIMARY_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hostBadgeText: { color: COLOURS.PRIMARY, fontSize: 11, fontWeight: '700' },
  readyBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  readyBadgeText: { color: COLOURS.SUCCESS, fontSize: 11, fontWeight: '600' },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  waitingText: { color: COLOURS.TEXT_MUTED, fontSize: 13 },
  joinForm: { gap: 12 },
  fieldLabel: { color: COLOURS.TEXT_SECONDARY, fontSize: 13, fontWeight: '500' },
  codeInput: {
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
  primaryBtn: {
    backgroundColor: COLOURS.PRIMARY,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  primaryBtnText: { color: COLOURS.TEXT_ON_PRIMARY, fontSize: 16, fontWeight: '700' },
  error: { color: COLOURS.ERROR, fontSize: 13, textAlign: 'center' },
});
