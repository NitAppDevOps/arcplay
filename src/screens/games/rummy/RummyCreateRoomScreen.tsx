import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';
import { useAuthStore } from '@store/authStore';
import { createRummyRoom } from '@services/rummyRooms';
import {
  DEFAULT_RUMMY_CONFIG,
  type IRummyConfig,
  type TimerExpiryAction,
  type JokerType,
} from '@services/rummy';
import type { RummyVariant } from '@app-types/game.types';

type Props = NativeStackScreenProps<GamesStackParamList, 'RummyCreateRoom'>;

interface IVariantOption {
  id: RummyVariant;
  label: string;
  description: string;
}

const VARIANTS: IVariantOption[] = [
  {
    id: 'points',
    label: 'Points Rummy',
    description: 'Single deal. First to declare wins. Losers pay points.',
  },
  {
    id: 'deals',
    label: 'Deals Rummy',
    description: 'Fixed number of deals. Player with most chips at the end wins.',
  },
  {
    id: 'pool',
    label: 'Pool Rummy',
    description: 'Reach the pool limit and you\'re eliminated. Last player standing wins.',
  },
];

const TIMER_OPTIONS: { label: string; seconds: number | null }[] = [
  { label: 'Off', seconds: null },
  { label: '30s', seconds: 30 },
  { label: '45s', seconds: 45 },
  { label: '60s', seconds: 60 },
  { label: '90s', seconds: 90 },
  { label: '2 min', seconds: 120 },
];

const EXPIRY_OPTIONS: { label: string; value: TimerExpiryAction; hint: string }[] = [
  { label: 'Auto discard', value: 'auto_discard', hint: 'Discards a random card for you' },
  { label: 'Auto drop', value: 'auto_drop', hint: 'You are dropped from the round' },
  { label: 'Warning only', value: 'warning_only', hint: 'Time shown but no forced action' },
];

/** RummyCreateRoomScreen — variant picker, host config, room creation */
export default function RummyCreateRoomScreen({ navigation }: Props): React.JSX.Element {
  const { user } = useAuthStore();

  const [selectedVariant, setSelectedVariant] = useState<RummyVariant>('points');
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Scoring config
  const [firstScootPoints, setFirstScootPoints] = useState<number>(DEFAULT_RUMMY_CONFIG.firstScootPoints);
  const [midScootPoints, setMidScootPoints] = useState<number>(DEFAULT_RUMMY_CONFIG.midScootPoints);
  const [fullHandPoints, setFullHandPoints] = useState<number>(DEFAULT_RUMMY_CONFIG.fullHandPoints);
  const [maxScoots, setMaxScoots] = useState<number>(DEFAULT_RUMMY_CONFIG.maxConsecutiveScoots);
  const [totalDeals, setTotalDeals] = useState<number>(DEFAULT_RUMMY_CONFIG.totalDeals);
  const [poolSize, setPoolSize] = useState<number>(101);

  // Timer config
  const [turnTimerSeconds, setTurnTimerSeconds] = useState<number | null>(null);
  const [timerExpiryAction, setTimerExpiryAction] = useState<TimerExpiryAction>('auto_discard');
  const [showTimeSeconds, setShowTimeSeconds] = useState<number>(90);

  // Joker config
  const [jokerType, setJokerType] = useState<JokerType>('open');
  const [allowJokerFromDiscard, setAllowJokerFromDiscard] = useState<boolean>(false);

  const [roomId, setRoomId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  /** Builds the IRummyConfig from current form state */
  const buildConfig = (): IRummyConfig => ({
    variant: selectedVariant,
    poolSize,
    firstScootPoints,
    midScootPoints,
    fullHandPoints,
    maxConsecutiveScoots: maxScoots,
    totalDeals,
    playerCount,
    turnTimerSeconds,
    timerExpiryAction,
    jokerType,
    allowJokerFromDiscard,
    declarationRule: 'strict',
    showTimeSeconds,
  });

  /** Creates the room in Supabase */
  const handleCreateRoom = async (): Promise<void> => {
    if (!user) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const config = buildConfig();
      const displayName = user.user_metadata?.username ?? user.user_metadata?.full_name ?? user.email ?? 'Host';
      const { roomId: newRoomId, error } = await createRummyRoom(user.id, displayName, config);
      if (error || !newRoomId) {
        setErrorMsg(error ?? 'Failed to create room.');
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
      const variantLabel = VARIANTS.find(v => v.id === selectedVariant)?.label ?? selectedVariant;
      await Share.share({
        message: `Join my ARCPLAY Rummy game!\nVariant: ${variantLabel}\nRoom code: ${roomId}`,
      });
    } catch { }
  };

  /** Navigates to the lobby */
  const handleEnterLobby = (): void => {
    if (!roomId) return;
    navigation.navigate('RummyRoomLobby', { roomId });
  };

  /** Stepper helper */
  const adjust = (
    value: number,
    setter: (v: number) => void,
    min: number,
    max: number,
    delta: number
  ): void => {
    const next = value + delta;
    if (next >= min && next <= max) setter(next);
  };

  const selectedVariantInfo = VARIANTS.find(v => v.id === selectedVariant)!;

  // ── Room created state ─────────────────────────────────────────────────────

  if (roomId) {
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

          <Text style={styles.title}>Room created</Text>
          <Text style={styles.subtitle}>Share this code with your players</Text>

          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>ROOM CODE</Text>
            <Text style={styles.code}>{roomId}</Text>
            <View style={styles.codeMeta}>
              <Text style={styles.codeMetaText}>{selectedVariantInfo.label}</Text>
              <Text style={styles.codeMetaDot}>·</Text>
              <Text style={styles.codeMetaText}>{playerCount} players</Text>
            </View>
          </View>

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
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Create form ────────────────────────────────────────────────────────────

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
          Choose a variant, set the table, and share the code.
        </Text>

        {/* ── Variant ─────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Variant</Text>
        <View style={styles.variantGrid}>
          {VARIANTS.map((v) => {
            const isSelected = selectedVariant === v.id;
            return (
              <TouchableOpacity
                key={v.id}
                style={[styles.variantCard, isSelected && styles.variantCardSelected]}
                onPress={() => setSelectedVariant(v.id)}
                accessibilityLabel={`Select ${v.label}`}
              >
                <Text style={[styles.variantLabel, isSelected && styles.variantLabelSelected]}>
                  {v.label}
                </Text>
                <Text style={styles.variantDesc}>{v.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Player count ──────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Number of players</Text>
        <View style={styles.pillRow}>
          {[2, 3, 4, 5, 6].map((n) => {
            const isSelected = playerCount === n;
            return (
              <TouchableOpacity
                key={n}
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => setPlayerCount(n)}
                accessibilityLabel={`Set player count to ${n}`}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                  {n}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Turn timer ────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Turn timer</Text>
        <View style={styles.pillRow}>
          {TIMER_OPTIONS.map((opt) => {
            const isSelected = turnTimerSeconds === opt.seconds;
            return (
              <TouchableOpacity
                key={String(opt.seconds)}
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => setTurnTimerSeconds(opt.seconds)}
                accessibilityLabel={`Set turn timer to ${opt.label}`}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Timer expiry action — only shown when timer is on */}
        {turnTimerSeconds !== null && (
          <>
            <Text style={styles.sectionSubtitle}>When time runs out</Text>
            <View style={styles.advancedPanel}>
              {EXPIRY_OPTIONS.map((opt, i) => {
                const isSelected = timerExpiryAction === opt.value;
                const isLast = i === EXPIRY_OPTIONS.length - 1;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.configRow, isLast && styles.configRowLast]}
                    onPress={() => setTimerExpiryAction(opt.value)}
                    accessibilityLabel={`Set timer expiry to ${opt.label}`}
                  >
                    <View style={styles.configLabel}>
                      <Text style={[styles.configName, isSelected && styles.configNameSelected]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.configHint}>{opt.hint}</Text>
                    </View>
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* ── Show phase time ───────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Declaration &amp; Show timer</Text>
        <View style={styles.pillRow}>
          {[30, 60, 90, 120].map((secs) => {
            const isSel = showTimeSeconds === secs;
            return (
              <TouchableOpacity
                key={secs}
                style={[styles.pill, isSel && styles.pillSelected]}
                onPress={() => setShowTimeSeconds(secs)}
                accessibilityLabel={`Set show time to ${secs} seconds`}
              >
                <Text style={[styles.pillText, isSel && styles.pillTextSelected]}>
                  {secs}s
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Joker settings ────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Joker settings</Text>
        <View style={styles.advancedPanel}>

          {/* Open / closed joker */}
          <View style={styles.configRow}>
            <View style={styles.configLabel}>
              <Text style={styles.configName}>Joker type</Text>
              <Text style={styles.configHint}>
                {jokerType === 'open'
                  ? 'Open — wild joker is visible to all players'
                  : 'Closed — wild joker is hidden until you form a pure sequence'}
              </Text>
            </View>
            <View style={styles.pillRowInline}>
              {(['open', 'closed'] as JokerType[]).map((jt) => {
                const isSel = jokerType === jt;
                return (
                  <TouchableOpacity
                    key={jt}
                    style={[styles.pillSmall, isSel && styles.pillSelected]}
                    onPress={() => setJokerType(jt)}
                    accessibilityLabel={`Set joker type to ${jt}`}
                  >
                    <Text style={[styles.pillTextSmall, isSel && styles.pillTextSelected]}>
                      {jt.charAt(0).toUpperCase() + jt.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Joker from discard */}
          <View style={[styles.configRow, styles.configRowLast]}>
            <View style={styles.configLabel}>
              <Text style={styles.configName}>Allow joker from discard</Text>
              <Text style={styles.configHint}>
                {allowJokerFromDiscard
                  ? 'Joker can be taken from discard only if it completes a pure sequence'
                  : 'Joker cannot be taken from the discard pile'}
              </Text>
            </View>
            <Switch
              value={allowJokerFromDiscard}
              onValueChange={setAllowJokerFromDiscard}
              trackColor={{ false: COLOURS.BORDER_STRONG, true: COLOURS.PRIMARY }}
              thumbColor={COLOURS.TEXT_ON_PRIMARY}
              accessibilityLabel="Toggle allow joker from discard"
            />
          </View>
        </View>

        {/* ── Advanced settings ─────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced(!showAdvanced)}
          accessibilityLabel={showAdvanced ? 'Hide advanced settings' : 'Show advanced settings'}
        >
          <Text style={styles.advancedToggleText}>
            {showAdvanced ? '▲ Hide advanced settings' : '▼ Advanced settings'}
          </Text>
        </TouchableOpacity>

        {showAdvanced && (
          <View style={styles.advancedPanel}>

            {/* Pool size — only for pool variant */}
            {selectedVariant === 'pool' && (
              <View style={styles.configRow}>
                <View style={styles.configLabel}>
                  <Text style={styles.configName}>Pool limit</Text>
                  <Text style={styles.configHint}>Eliminated when score reaches this</Text>
                </View>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => adjust(poolSize, setPoolSize, 50, 500, -10)}
                    accessibilityLabel="Decrease pool limit"
                  >
                    <Text style={styles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{poolSize}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => adjust(poolSize, setPoolSize, 50, 500, 10)}
                    accessibilityLabel="Increase pool limit"
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* First scoot */}
            <View style={styles.configRow}>
              <View style={styles.configLabel}>
                <Text style={styles.configName}>First scoot points</Text>
                <Text style={styles.configHint}>Points for dropping before drawing</Text>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjust(firstScootPoints, setFirstScootPoints, 10, 50, -5)}
                  accessibilityLabel="Decrease first scoot points"
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepValue}>{firstScootPoints}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjust(firstScootPoints, setFirstScootPoints, 10, 50, 5)}
                  accessibilityLabel="Increase first scoot points"
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Mid scoot */}
            <View style={styles.configRow}>
              <View style={styles.configLabel}>
                <Text style={styles.configName}>Mid-game scoot points</Text>
                <Text style={styles.configHint}>Points for dropping after drawing</Text>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjust(midScootPoints, setMidScootPoints, 20, 80, -5)}
                  accessibilityLabel="Decrease mid scoot points"
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepValue}>{midScootPoints}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjust(midScootPoints, setMidScootPoints, 20, 80, 5)}
                  accessibilityLabel="Increase mid scoot points"
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Full hand penalty */}
            <View style={styles.configRow}>
              <View style={styles.configLabel}>
                <Text style={styles.configName}>Full hand penalty</Text>
                <Text style={styles.configHint}>Max points if no melds at declaration</Text>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjust(fullHandPoints, setFullHandPoints, 60, 120, -10)}
                  accessibilityLabel="Decrease full hand penalty"
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepValue}>{fullHandPoints}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjust(fullHandPoints, setFullHandPoints, 60, 120, 10)}
                  accessibilityLabel="Increase full hand penalty"
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Max scoots */}
            <View style={styles.configRow}>
              <View style={styles.configLabel}>
                <Text style={styles.configName}>Max consecutive scoots</Text>
                <Text style={styles.configHint}>Auto-eliminate after this many scoots</Text>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjust(maxScoots, setMaxScoots, 1, 6, -1)}
                  accessibilityLabel="Decrease max scoots"
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepValue}>{maxScoots}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjust(maxScoots, setMaxScoots, 1, 6, 1)}
                  accessibilityLabel="Increase max scoots"
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Total deals — only for Deals Rummy */}
            {selectedVariant === 'deals' && (
              <View style={styles.configRow}>
                <View style={styles.configLabel}>
                  <Text style={styles.configName}>Total deals</Text>
                  <Text style={styles.configHint}>Number of deals to play</Text>
                </View>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => adjust(totalDeals, setTotalDeals, 2, 10, -1)}
                    accessibilityLabel="Decrease total deals"
                  >
                    <Text style={styles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{totalDeals}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => adjust(totalDeals, setTotalDeals, 2, 10, 1)}
                    accessibilityLabel="Increase total deals"
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <TouchableOpacity
          style={[styles.createBtn, isLoading && styles.createBtnDisabled]}
          onPress={handleCreateRoom}
          disabled={isLoading}
          accessibilityLabel="Create Rummy room"
        >
          {isLoading ? (
            <ActivityIndicator color={COLOURS.TEXT_ON_PRIMARY} />
          ) : (
            <Text style={styles.createBtnText}>Create room</Text>
          )}
        </TouchableOpacity>

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
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: -8,
  },
  sectionSubtitle: {
    color: COLOURS.TEXT_MUTED,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: -8,
    paddingLeft: 2,
  },
  variantGrid: { gap: 8 },
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
  variantLabel: { color: COLOURS.TEXT_PRIMARY, fontSize: 15, fontWeight: '600' },
  variantLabelSelected: { color: COLOURS.PRIMARY },
  variantDesc: { color: COLOURS.TEXT_SECONDARY, fontSize: 12, lineHeight: 18 },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pillRowInline: { flexDirection: 'row', gap: 6 },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLOURS.SURFACE,
    borderWidth: 1.5,
    borderColor: COLOURS.BORDER,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSmall: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLOURS.SURFACE,
    borderWidth: 1.5,
    borderColor: COLOURS.BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSelected: {
    borderColor: COLOURS.PRIMARY,
    backgroundColor: COLOURS.PRIMARY_LIGHT,
  },
  pillText: { color: COLOURS.TEXT_SECONDARY, fontSize: 14, fontWeight: '600' },
  pillTextSmall: { color: COLOURS.TEXT_SECONDARY, fontSize: 13, fontWeight: '600' },
  pillTextSelected: { color: COLOURS.PRIMARY },
  advancedToggle: { alignSelf: 'flex-start', paddingVertical: 4 },
  advancedToggleText: { color: COLOURS.PRIMARY, fontSize: 13, fontWeight: '600' },
  advancedPanel: {
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    overflow: 'hidden',
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLOURS.BORDER,
    gap: 12,
  },
  configRowLast: { borderBottomWidth: 0 },
  configLabel: { flex: 1, gap: 3 },
  configName: { color: COLOURS.TEXT_PRIMARY, fontSize: 14, fontWeight: '500' },
  configNameSelected: { color: COLOURS.PRIMARY },
  configHint: { color: COLOURS.TEXT_MUTED, fontSize: 11, lineHeight: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLOURS.SURFACE_ELEVATED,
    borderWidth: 1,
    borderColor: COLOURS.BORDER_STRONG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: COLOURS.TEXT_PRIMARY, fontSize: 18, fontWeight: '600', lineHeight: 22 },
  stepValue: {
    color: COLOURS.PRIMARY,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLOURS.BORDER_STRONG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: COLOURS.PRIMARY },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLOURS.PRIMARY,
  },
  errorText: { color: COLOURS.ERROR, fontSize: 13, textAlign: 'center' },
  createBtn: {
    backgroundColor: COLOURS.PRIMARY,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 4,
  },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: { color: COLOURS.TEXT_ON_PRIMARY, fontSize: 16, fontWeight: '700' },
  // Code display state
  codeCard: {
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 12,
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
  code: { color: COLOURS.PRIMARY, fontSize: 48, fontWeight: '800', letterSpacing: 8 },
  codeMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  codeMetaText: { color: COLOURS.TEXT_MUTED, fontSize: 13 },
  codeMetaDot: { color: COLOURS.BORDER_STRONG, fontSize: 13 },
  shareBtn: {
    backgroundColor: COLOURS.SURFACE_ELEVATED,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOURS.BORDER_STRONG,
  },
  shareBtnText: { color: COLOURS.TEXT_PRIMARY, fontSize: 15, fontWeight: '600' },
  lobbyBtn: {
    backgroundColor: COLOURS.PRIMARY,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  lobbyBtnText: { color: COLOURS.TEXT_ON_PRIMARY, fontSize: 16, fontWeight: '700' },
});
