import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';
import { useAuthStore } from '@store/authStore';
import { createRoom } from '@services/rooms';
import { TIME_CONTROLS, type ITimeControl } from '@app-types/game.types';

type Props = NativeStackScreenProps<GamesStackParamList, 'ChessCreateRoom'>;

/** ChessCreateRoomScreen — creates a private room with time control selection */
export default function ChessCreateRoomScreen({ navigation }: Props): React.JSX.Element {
  const { user } = useAuthStore();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [selectedTimeControl, setSelectedTimeControl] = useState<ITimeControl>(TIME_CONTROLS[0]);

  /** Creates a new room in Supabase */
  const handleCreateRoom = async (): Promise<void> => {
    if (!user) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const { roomId: newRoomId, error: createError } = await createRoom(
        user.id,
        selectedTimeControl.seconds
      );
      if (createError || !newRoomId) {
        setErrorMsg(createError ?? 'Failed to create room.');
        return;
      }
      setRoomId(newRoomId);
    } catch {
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  /** Shares the room code */
  const handleShare = async (): Promise<void> => {
    if (!roomId) return;
    try {
      await Share.share({
        message: `Join my ARCPLAY chess game! Room code: ${roomId}`,
      });
    } catch { }
  };

  /** Navigates to lobby */
  const handleEnterLobby = (): void => {
    if (!roomId) return;
    navigation.navigate('ChessRoomLobby', { roomId });
  };

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

        <Text style={styles.title}>Create a room</Text>
        <Text style={styles.subtitle}>
          Generate a room code and share it with a friend.
        </Text>

        {!roomId && (
          <>
            <Text style={styles.sectionTitle}>Time control</Text>
            <View style={styles.timeControls}>
              {TIME_CONTROLS.map((tc) => {
                const isSelected = selectedTimeControl.label === tc.label;
                return (
                  <TouchableOpacity
                    key={tc.label}
                    style={[styles.tcOption, isSelected && styles.tcOptionSelected]}
                    onPress={() => setSelectedTimeControl(tc)}
                    accessibilityLabel={`Select ${tc.label}`}
                  >
                    <Text style={[styles.tcLabel, isSelected && styles.tcLabelSelected]}>
                      {tc.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {roomId ? (
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Your room code</Text>
            <Text style={styles.code}>{roomId}</Text>
            <Text style={styles.codeHint}>
              {selectedTimeControl.seconds
                ? `${selectedTimeControl.label} · Share with your opponent`
                : 'Unlimited time · Share with your opponent'}
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
          <>
            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
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
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOURS.BACKGROUND },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, gap: 20 },
  back: { alignSelf: 'flex-start', paddingVertical: 8 },
  backText: { color: COLOURS.TEXT_SECONDARY, fontSize: 15 },
  title: { color: COLOURS.TEXT_PRIMARY, fontSize: 28, fontWeight: '700' },
  subtitle: { color: COLOURS.TEXT_SECONDARY, fontSize: 14, lineHeight: 22 },
  sectionTitle: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timeControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tcOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLOURS.SURFACE,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
  },
  tcOptionSelected: {
    borderColor: COLOURS.PRIMARY,
    backgroundColor: COLOURS.SURFACE_ELEVATED,
  },
  tcLabel: { color: COLOURS.TEXT_SECONDARY, fontSize: 13, fontWeight: '500' },
  tcLabelSelected: { color: COLOURS.PRIMARY, fontWeight: '700' },
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
  code: { color: COLOURS.PRIMARY, fontSize: 48, fontWeight: '800', letterSpacing: 8 },
  codeHint: { color: COLOURS.TEXT_MUTED, fontSize: 12, textAlign: 'center' },
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
  shareBtnText: { color: COLOURS.TEXT_PRIMARY, fontSize: 15, fontWeight: '600' },
  lobbyBtn: {
    backgroundColor: COLOURS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  lobbyBtnText: { color: COLOURS.TEXT_PRIMARY, fontSize: 16, fontWeight: '700' },
  errorText: { color: COLOURS.ERROR, fontSize: 13, textAlign: 'center' },
  createBtn: {
    backgroundColor: COLOURS.PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createBtnDisabled: { backgroundColor: COLOURS.SURFACE_ELEVATED },
  createBtnText: { color: COLOURS.TEXT_PRIMARY, fontSize: 16, fontWeight: '700' },
});