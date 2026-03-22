import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '@app-types/navigation.types';
import { COLOURS } from '@constants/colours';
import type { IRummyCard, IMeld } from '@app-types/game.types';
import {
  initRummyGame,
  drawFromStock,
  drawFromDiscard,
  discardCard,
  scoot,
  validateDeclaration,
  sortHand,
  getSuitSymbol,
  getSuitColour,
  isValidSequence,
  isValidSet,
  isPureSequence,
  DEFAULT_RUMMY_CONFIG,
  type IRummyConfig,
} from '@services/rummy';

type Props = NativeStackScreenProps<GamesStackParamList, 'RummyTable'>;

const { width } = Dimensions.get('window');
const CARD_W = (width - 32 - 5 * 6) / 6;
const CARD_H = CARD_W * 1.45;
const MINI_CARD_W = 36;
const MINI_CARD_H = 50;

// Table colours
const TABLE_GREEN = '#1B5E20';
const TABLE_GREEN_MID = '#2E7D32';
const TABLE_GREEN_FELT = '#388E3C';
const CARD_WHITE = '#FAFAFA';
const CARD_BACK = '#1565C0';

/** RummyTableScreen — green felt table design, portrait layout */
export default function RummyTableScreen({ navigation, route }: Props): React.JSX.Element {
  const { roomId } = route.params;

  const variant = roomId.includes('pool201') ? 'pool201'
    : roomId.includes('pool101') ? 'pool101'
    : roomId.includes('deals') ? 'deals'
    : 'points';

  const config: IRummyConfig = {
    ...DEFAULT_RUMMY_CONFIG,
    variant: variant as any,
    poolSize: variant === 'pool201' ? 201 : 101,
    playerCount: 2,
  };

  const [gameState, setGameState] = useState(() =>
    initRummyGame(['player1', 'player2'], ['You', 'Opponent'], config)
  );
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [melds, setMelds] = useState<IMeld[]>([]);
  const [meldError, setMeldError] = useState<string>('');

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = gameState.currentPlayerIndex === 0;
  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
  const sortedHand = sortHand(currentPlayer.hand);

  const handleDrawStock = (): void => {
    if (!isMyTurn || gameState.turnPhase !== 'draw') return;
    setGameState(drawFromStock(gameState));
    setMeldError('');
  };

  const handleDrawDiscard = (): void => {
    if (!isMyTurn || gameState.turnPhase !== 'draw') return;
    if (!topDiscard) return;
    setGameState(drawFromDiscard(gameState));
    setMeldError('');
  };

  const handleCardTap = useCallback((card: IRummyCard): void => {
    if (!isMyTurn || gameState.turnPhase !== 'discard') return;
    setSelectedCards(prev => {
      const next = new Set(prev);
      next.has(card.id) ? next.delete(card.id) : next.add(card.id);
      return next;
    });
    setMeldError('');
  }, [isMyTurn, gameState.turnPhase]);

  const handleDiscard = useCallback((): void => {
    if (selectedCards.size !== 1) {
      setMeldError('Select 1 card to discard');
      return;
    }
    const cardId = Array.from(selectedCards)[0];
    setSelectedCards(new Set());
    setMeldError('');
    setGameState(prev => discardCard(prev, cardId));
  }, [selectedCards]);

  const handleGroupMeld = useCallback((type: 'sequence' | 'set'): void => {
    if (selectedCards.size < 3) { setMeldError('Select 3+ cards'); return; }
    const cards = currentPlayer.hand.filter(c => selectedCards.has(c.id));
    const valid = type === 'sequence' ? isValidSequence(cards) : isValidSet(cards);
    if (!valid) { setMeldError(`Invalid ${type}`); return; }
    setMelds(prev => [...prev, {
      id: `meld_${Date.now()}`,
      cards, type,
      isValid: true,
      isPureSequence: type === 'sequence' && isPureSequence(cards),
    }]);
    setSelectedCards(new Set());
    setMeldError('');
  }, [selectedCards, currentPlayer]);

  const handleRemoveMeld = (id: string): void => {
    setMelds(prev => prev.filter(m => m.id !== id));
  };

  const handleDeclare = useCallback((): void => {
    const { isValid, reason } = validateDeclaration(currentPlayer.hand, melds);
    if (!isValid) { setMeldError(reason); return; }
    Alert.alert('You Win! 🎉', 'Valid declaration!', [
      { text: 'New Game', onPress: handleNewGame },
    ]);
  }, [currentPlayer, melds]);

  const handleScoot = (): void => {
    const isFirst = gameState.turnPhase === 'draw';
    const pts = isFirst ? config.firstScootPoints : config.midScootPoints;
    Alert.alert('Drop?', `${pts} points for ${isFirst ? 'first' : 'mid'} drop.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Drop', style: 'destructive', onPress: () => {
        setGameState(prev => scoot(prev, config));
        setMelds([]); setSelectedCards(new Set());
      }},
    ]);
  };

  const handleOpponentTurn = (): void => {
    if (isMyTurn || gameState.isGameOver) return;
    let state = drawFromStock(gameState);
    const p = state.players[state.currentPlayerIndex];
    const last = p.hand[p.hand.length - 1];
    state = discardCard(state, last.id);
    setGameState(state);
  };

  const handleNewGame = (): void => {
    setGameState(initRummyGame(['player1', 'player2'], ['You', 'Opponent'], config));
    setSelectedCards(new Set()); setMelds([]); setMeldError('');
  };

  /** Renders a full-size card */
  const renderCard = (card: IRummyCard, isSelected: boolean): React.JSX.Element => {
    const colour = card.isJoker ? COLOURS.PRIMARY : getSuitColour(card.suit);
    return (
      <TouchableOpacity
        key={card.id}
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => handleCardTap(card)}
        activeOpacity={0.85}
        accessibilityLabel={card.isJoker ? 'Joker' : `${card.rank}${getSuitSymbol(card.suit)}`}
      >
        <Text style={[styles.cardTopRank, { color: colour }]}>
          {card.isJoker ? '★' : card.rank}
        </Text>
        {!card.isJoker && (
          <Text style={[styles.cardSuitBig, { color: colour }]}>
            {getSuitSymbol(card.suit)}
          </Text>
        )}
        <Text style={[styles.cardBottomRank, { color: colour }]}>
          {card.isJoker ? '★' : card.rank}
        </Text>
      </TouchableOpacity>
    );
  };

  /** Renders a mini card in a meld */
  const renderMiniCard = (card: IRummyCard): React.JSX.Element => {
    const colour = card.isJoker ? COLOURS.PRIMARY : getSuitColour(card.suit);
    return (
      <View key={card.id} style={styles.miniCard}>
        <Text style={[styles.miniCardRank, { color: colour }]}>
          {card.isJoker ? '★' : card.rank}
        </Text>
        {!card.isJoker && (
          <Text style={[styles.miniCardSuit, { color: colour }]}>
            {getSuitSymbol(card.suit)}
          </Text>
        )}
      </View>
    );
  };

  const variantLabel = variant === 'points' ? 'Points'
    : variant === 'deals' ? 'Deals'
    : variant === 'pool201' ? 'Pool 201' : 'Pool 101';

  const turnLabel = isMyTurn
    ? gameState.turnPhase === 'draw' ? 'Draw a card' : 'Select & Discard'
    : "Opponent's turn";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.table}>

        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Leave table">
            <Text style={styles.topBarLeave}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{variantLabel} Rummy</Text>
          <TouchableOpacity onPress={handleNewGame} accessibilityLabel="New game">
            <Text style={styles.topBarNew}>New</Text>
          </TouchableOpacity>
        </View>

        {/* ── Opponent seat ── */}
        <View style={styles.opponentSeat}>
          <View style={styles.seatNameTag}>
            <View style={[styles.seatDot, !isMyTurn && styles.seatDotActive]} />
            <Text style={styles.seatName}>Opponent</Text>
            <Text style={styles.seatCardCount}>{gameState.players[1].hand.length} cards</Text>
          </View>
          {/* Face-down cards */}
          <View style={styles.faceDownRow}>
            {Array.from({ length: Math.min(gameState.players[1].hand.length, 8) }).map((_, i) => (
              <View key={i} style={[styles.faceDownCard, { marginLeft: i === 0 ? 0 : -18 }]} />
            ))}
          </View>
          {!isMyTurn && (
            <TouchableOpacity
              style={styles.opponentPlayBtn}
              onPress={handleOpponentTurn}
              accessibilityLabel="Opponent plays"
            >
              <Text style={styles.opponentPlayText}>Play →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Centre table ── */}
        <View style={styles.centreArea}>

          {/* Joker indicator */}
          <View style={styles.jokerIndicator}>
            <Text style={styles.jokerIndicatorLabel}>Joker</Text>
            {gameState.jokerCard && (
              <Text style={[styles.jokerIndicatorCard, {
                color: gameState.jokerCard.isJoker ? COLOURS.PRIMARY
                  : getSuitColour(gameState.jokerCard.suit)
              }]}>
                {gameState.jokerCard.isJoker ? '★' : `${gameState.jokerCard.rank}${getSuitSymbol(gameState.jokerCard.suit)}`}
              </Text>
            )}
          </View>

          {/* Piles */}
          <View style={styles.pilesArea}>
            {/* Stock */}
            <TouchableOpacity
              style={[styles.stockPileBtn, (!isMyTurn || gameState.turnPhase !== 'draw') && styles.pileInactive]}
              onPress={handleDrawStock}
              accessibilityLabel="Draw from stock"
            >
              <View style={styles.cardBack}>
                <Text style={styles.cardBackText}>🂠</Text>
              </View>
              <Text style={styles.pileCountLabel}>{gameState.stock.length}</Text>
            </TouchableOpacity>

            {/* Status */}
            <View style={styles.turnStatus}>
              <Text style={[styles.turnStatusText, isMyTurn && styles.turnStatusTextActive]}>
                {turnLabel}
              </Text>
              {meldError ? <Text style={styles.meldErrorText}>{meldError}</Text> : null}
            </View>

            {/* Discard */}
            <TouchableOpacity
              style={[styles.discardPileBtn, (!isMyTurn || gameState.turnPhase !== 'draw') && styles.pileInactive]}
              onPress={handleDrawDiscard}
              accessibilityLabel="Draw from discard"
            >
              {topDiscard ? (
                <View style={styles.discardTopCard}>
                  <Text style={[styles.discardTopRank, {
                    color: topDiscard.isJoker ? COLOURS.PRIMARY : getSuitColour(topDiscard.suit)
                  }]}>
                    {topDiscard.isJoker ? '★' : topDiscard.rank}
                  </Text>
                  {!topDiscard.isJoker && (
                    <Text style={[styles.discardTopSuit, {
                      color: getSuitColour(topDiscard.suit)
                    }]}>
                      {getSuitSymbol(topDiscard.suit)}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.emptyPileText}>Empty</Text>
              )}
              <Text style={styles.pileLabel}>Discard</Text>
            </TouchableOpacity>
          </View>

          {/* Melds area */}
          {melds.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.meldsScroll}
              contentContainerStyle={styles.meldsContent}
            >
              {melds.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.meldChip, m.isPureSequence && styles.meldChipPure]}
                  onPress={() => handleRemoveMeld(m.id)}
                  accessibilityLabel={`${m.type} meld, tap to remove`}
                >
                  <Text style={styles.meldChipLabel}>
                    {m.isPureSequence ? 'Pure ✓' : m.type === 'sequence' ? 'Seq ✓' : 'Set ✓'}
                  </Text>
                  <View style={styles.meldChipCards}>
                    {m.cards.map(renderMiniCard)}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Player hand ── */}
        <View style={styles.playerArea}>
          <View style={styles.playerNameRow}>
            <View style={[styles.seatDot, isMyTurn && styles.seatDotActive]} />
            <Text style={styles.seatName}>You</Text>
            <Text style={styles.seatCardCount}>
              {currentPlayer.hand.length} cards
              {selectedCards.size > 0 ? ` · ${selectedCards.size} selected` : ''}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.handScroll}
          >
            {sortedHand.map(card => renderCard(card, selectedCards.has(card.id)))}
          </ScrollView>
        </View>

        {/* ── Action bar ── */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionChip, styles.actionChipDanger]}
            onPress={handleScoot}
            accessibilityLabel="Drop hand"
          >
            <Text style={styles.actionChipTextDanger}>Drop</Text>
          </TouchableOpacity>

          {isMyTurn && gameState.turnPhase === 'discard' && (
            <>
              <TouchableOpacity
                style={[styles.actionChip, styles.actionChipNeutral]}
                onPress={() => handleGroupMeld('sequence')}
                accessibilityLabel="Group as sequence"
              >
                <Text style={styles.actionChipText}>Seq</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionChip, styles.actionChipNeutral]}
                onPress={() => handleGroupMeld('set')}
                accessibilityLabel="Group as set"
              >
                <Text style={styles.actionChipText}>Set</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionChip, styles.actionChipPrimary,
                  selectedCards.size !== 1 && styles.actionChipDisabled]}
                onPress={handleDiscard}
                accessibilityLabel="Discard selected card"
              >
                <Text style={styles.actionChipTextPrimary}>Discard</Text>
              </TouchableOpacity>
            </>
          )}

          {isMyTurn && melds.length >= 2 && (
            <TouchableOpacity
              style={[styles.actionChip, styles.actionChipSuccess]}
              onPress={handleDeclare}
              accessibilityLabel="Declare"
            >
              <Text style={styles.actionChipTextSuccess}>Declare!</Text>
            </TouchableOpacity>
          )}
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: TABLE_GREEN },
  table: { flex: 1, backgroundColor: TABLE_GREEN },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topBarLeave: { color: '#FFCDD2', fontSize: 18, fontWeight: '700', width: 32 },
  topBarTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  topBarNew: { color: '#A5D6A7', fontSize: 13, fontWeight: '600', width: 32, textAlign: 'right' },

  // Opponent seat
  opponentSeat: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 8,
  },
  seatNameTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seatDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#555' },
  seatDotActive: { backgroundColor: '#69F0AE' },
  seatName: { color: '#E8F5E9', fontSize: 13, fontWeight: '600' },
  seatCardCount: { color: '#81C784', fontSize: 11, marginLeft: 4 },
  faceDownRow: { flexDirection: 'row', alignItems: 'center' },
  faceDownCard: {
    width: 28,
    height: 40,
    backgroundColor: CARD_BACK,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1A237E',
  },
  opponentPlayBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  opponentPlayText: { color: '#E8F5E9', fontSize: 12, fontWeight: '600' },

  // Centre area
  centreArea: {
    flex: 1,
    backgroundColor: TABLE_GREEN_MID,
    marginHorizontal: 12,
    borderRadius: 16,
    padding: 10,
    justifyContent: 'center',
    gap: 8,
  },
  jokerIndicator: {
    position: 'absolute',
    top: 8,
    right: 10,
    alignItems: 'center',
  },
  jokerIndicatorLabel: { color: '#A5D6A7', fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  jokerIndicatorCard: { fontSize: 15, fontWeight: '800' },
  pilesArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stockPileBtn: { alignItems: 'center', gap: 4 },
  pileInactive: { opacity: 0.5 },
  cardBack: {
    width: 52,
    height: 72,
    backgroundColor: CARD_BACK,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1A237E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  cardBackText: { fontSize: 32, color: '#FFFFFF' },
  pileCountLabel: { color: '#A5D6A7', fontSize: 11, fontWeight: '600' },
  pileLabel: { color: '#A5D6A7', fontSize: 11, fontWeight: '600' },
  turnStatus: { flex: 1, alignItems: 'center', gap: 4 },
  turnStatusText: { color: '#81C784', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  turnStatusTextActive: { color: '#FFFFFF' },
  meldErrorText: { color: '#FFCDD2', fontSize: 11, textAlign: 'center' },
  discardPileBtn: { alignItems: 'center', gap: 4 },
  discardTopCard: {
    width: 52,
    height: 72,
    backgroundColor: CARD_WHITE,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    gap: 2,
  },
  discardTopRank: { fontSize: 18, fontWeight: '800' },
  discardTopSuit: { fontSize: 14 },
  emptyPileText: { color: '#81C784', fontSize: 11 },
  meldsScroll: { maxHeight: 80 },
  meldsContent: { paddingHorizontal: 4, gap: 8, flexDirection: 'row' },
  meldChip: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 4,
  },
  meldChipPure: { borderColor: '#69F0AE' },
  meldChipLabel: { color: '#A5D6A7', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  meldChipCards: { flexDirection: 'row', gap: 2 },

  // Mini cards in melds
  miniCard: {
    width: MINI_CARD_W,
    height: MINI_CARD_H,
    backgroundColor: CARD_WHITE,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  miniCardRank: { fontSize: 12, fontWeight: '700' },
  miniCardSuit: { fontSize: 10 },

  // Player hand
  playerArea: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  handScroll: { paddingVertical: 4, paddingHorizontal: 4, gap: 6 },

  // Full-size cards
  card: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: CARD_WHITE,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  cardSelected: {
    transform: [{ translateY: -10 }],
    borderColor: '#FFD600',
    borderWidth: 2,
    shadowColor: '#FFD600',
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 6,
  },
  cardTopRank: { fontSize: 13, fontWeight: '800', alignSelf: 'flex-start' },
  cardSuitBig: { fontSize: 20 },
  cardBottomRank: {
    fontSize: 13,
    fontWeight: '800',
    alignSelf: 'flex-end',
    transform: [{ rotate: '180deg' }],
  },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    gap: 8,
  },
  actionChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionChipDanger: { backgroundColor: 'rgba(211,47,47,0.85)' },
  actionChipNeutral: { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  actionChipPrimary: { backgroundColor: '#1565C0', flex: 1 },
  actionChipSuccess: { backgroundColor: '#2E7D32', flex: 1, borderWidth: 1, borderColor: '#69F0AE' },
  actionChipDisabled: { opacity: 0.4 },
  actionChipText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  actionChipTextDanger: { color: '#FFCDD2', fontSize: 13, fontWeight: '700' },
  actionChipTextPrimary: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  actionChipTextSuccess: { color: '#E8F5E9', fontSize: 14, fontWeight: '700' },
});