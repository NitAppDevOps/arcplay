import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';
import { useAuthStore } from '@store/authStore';
import { createRoom } from '@services/rooms';

type Props = NativeStackScreenProps<GamesStackParamList, 'ChessCreateRoom'>;

/** ChessCreateRoomScreen — creates a private room and shows shareable code */
export default function ChessCreateRoomScreen({ navigation }: Props): React.JSX.Element {
  const { user } = useAuthStore();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  /** Creates a new room in Supabase */
  const handleCreateRoom = async (): Promise<void> => {
    if (!user) return;
    setIsLoading(true);
    setError('');
    try {
      const { roomId: newRoomId, error: createError } = await createRoom(user.id);
      if (createError || !newRoomId) {
        setError(createError ?? 'Failed to create room.');
        return;
      }
      setRoomId(newRoomId);
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  /** Shares the room code via native share sheet */
  const handleShare = async (): Promise<void> => {
    if (!roomId) return;
    try {
      await Share.share({
        message: `Join my ARCPLAY chess game! Room code: ${roomId}`,
      });
    } catch {
      // User dismissed share sheet — no action needed
    }
  };

  /** Navigates to the room lobby */
  const handleEnterLobby = (): void => {
    if (!roomId) return;
    navigation.navigate('ChessRoomLobby', { roomId });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>

        {/* Header */}
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create a room</Text>
        <Text style={styles.subtitle}>
          Generate a room code and share it with a friend. They enter the code
          to join your game.
        </Text>

        {/* Room code display */}
        {roomId ? (
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Your room code</Text>
            <Text style={styles.code}>{roomId}</Text>
            <Text style={styles.codeHint}>
              Share this code with your opponent
            </Text>

            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleShare}
              accessibilityLabel="Share room code"
            >
              <Text style={styles.shareBtnText}>Share code</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.lobbyBtn}
              onPress={handleEnterLobby}
              accessibilityLabel="Enter room lobby"
            >
              <Text style={styles.lobbyBtnText}>Enter lobby →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.createContainer}>
            <View style={styles.infoBox}>
              <Text style={styles.infoItem}>♟  Chess — 2 players</Text>
              <Text style={styles.infoItem}>🌐  Online multiplayer</Text>
              <Text style={styles.infoItem}>⚡  Real-time sync</Text>
              <Text style={styles.infoItem}>🎨  Colour assigned randomly</Text>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.createBtn, isLoading && styles.createBtnDisabled]}
              onPress={handleCreateRoom}
              disabled={isLoading}
              accessibilityLabel="Create chess room"
            >
              {isLoading ? (
                <ActivityIndicator color={COLOURS.TEXT_PRIMARY} />
              ) : (
                <Text style={styles.createBtnText}>Create room</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

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
    lineHeight: 22,
  },
  codeContainer: {
    alignItems: 'center',
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 20,
    padding: 32,
    gap: 16,
    borderWidth: 1,
    borderColor: COLOURS.PRIMARY,
  },
  codeLabel: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  code: {
    color: COLOURS.PRIMARY,
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 8,
  },
  codeHint: {
    color: COLOURS.TEXT_MUTED,
    fontSize: 12,
  },
  shareBtn: {
    backgroundColor: COLOURS.SURFACE_ELEVATED,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    width: '100%',
    alignItems: 'center',
  },
  shareBtnText: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '600',
  },
  lobbyBtn: {
    backgroundColor: COLOURS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  lobbyBtnText: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  createContainer: {
    gap: 20,
  },
  infoBox: {
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
  },
  infoItem: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 14,
  },
  error: {
    color: COLOURS.ERROR,
    fontSize: 13,
    textAlign: 'center',
  },
  createBtn: {
    backgroundColor: COLOURS.PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createBtnDisabled: {
    backgroundColor: COLOURS.SURFACE_ELEVATED,
  },
  createBtnText: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
});