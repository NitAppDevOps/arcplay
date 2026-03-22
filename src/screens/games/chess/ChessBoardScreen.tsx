import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chess } from 'chess.js';
import { COLOURS } from '@constants/colours';
import { useGameStore } from '@store/gameStore';
import { useAuthStore } from '@store/authStore';
import {
  createChessGame,
  getGameState,
  getLegalMovesForSquare,
  getLegalMovesUCI,
  makeMove,
  getPieceSymbol,
  requiresPromotion,
} from '@services/chess';
import {
  getRoom,
  subscribeToMoves,
  saveMove,
  updateRoomFen,
  completeRoom,
} from '@services/rooms';
import { getChessAIMove, type ChessAIDifficulty } from '@services/claude';
import type { ChessSquare, ChessPieceType } from '@app-types/game.types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '@app-types/navigation.types';

type Props = NativeStackScreenProps<GamesStackParamList, 'ChessBoard'>;

const { width } = Dimensions.get('window');
const BOARD_SIZE = width - 32;
const SQUARE_SIZE = BOARD_SIZE / 8;
const FILES_WHITE = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const FILES_BLACK = ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
const RANKS_WHITE = ['8', '7', '6', '5', '4', '3', '2', '1'];
const RANKS_BLACK = ['1', '2', '3', '4', '5', '6', '7', '8'];

const getSquareColour = (file: number, rank: number): string => {
  const isLight = (file + rank) % 2 === 0;
  return isLight ? COLOURS.BOARD_LIGHT : COLOURS.BOARD_DARK;
};

/** Formats seconds into mm:ss display */
const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/** ChessBoardScreen — local, online multiplayer, and AI with optional timer */
export default function ChessBoardScreen({ navigation, route }: Props): React.JSX.Element {
  const { roomId, timeControl } = route.params;
  const isOnline = roomId !== 'local' && !roomId.startsWith('ai_');
  const isAI = roomId.startsWith('ai_');
  const aiDifficulty = isAI ? (roomId.replace('ai_', '') as ChessAIDifficulty) : null;
  const hasTimer = timeControl != null && timeControl > 0;

  const { user } = useAuthStore();
  const {
    chessGameState,
    selectedSquare,
    legalMovesForSelected,
    setChessGameState,
    setSelectedSquare,
    setLegalMoves,
    addChessMove,
    resetChessGame,
  } = useGameStore();

  const gameRef = useRef<Chess>(createChessGame());
  const [, forceUpdate] = useState<number>(0);
  const [showPromotion, setShowPromotion] = useState<boolean>(false);
  const [pendingMove, setPendingMove] = useState<{ from: ChessSquare; to: ChessSquare } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('White to move');
  const [myColour, setMyColour] = useState<'w' | 'b'>('w');
  const [isLoadingRoom, setIsLoadingRoom] = useState<boolean>(isOnline);
  const [isAIThinking, setIsAIThinking] = useState<boolean>(false);
  const isAIThinkingRef = useRef<boolean>(false);

  // Timer state
  const [whiteTime, setWhiteTime] = useState<number>(timeControl ?? 0);
  const [blackTime, setBlackTime] = useState<number>(timeControl ?? 0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameStartedRef = useRef<boolean>(false);

  /** Starts the timer for the current player's turn */
  const startTimer = useCallback((turn: 'w' | 'b'): void => {
    if (!hasTimer) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (turn === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleTimeout('w');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleTimeout('b');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
  }, [hasTimer]);

  /** Stops the timer */
  const stopTimer = useCallback((): void => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Handles a player running out of time */
  const handleTimeout = useCallback((timedOutColour: 'w' | 'b'): void => {
    stopTimer();
    const winner = timedOutColour === 'w' ? 'Black' : 'White';
    setStatusMessage(`Time out — ${winner} wins!`);
    if (isOnline) {
      const winnerId = timedOutColour !== myColour ? user?.id ?? null : null;
      completeRoom(roomId, winnerId, 'timeout');
    }
  }, [isOnline, myColour, user, roomId]);

  /** Cleans up timer on unmount */
  useEffect(() => {
    return () => { stopTimer(); };
  }, []);

  /** Initialises the game on mount */
  useEffect(() => {
    const init = async (): Promise<void> => {
      const newGame = createChessGame();
      gameRef.current = newGame;
      resetChessGame();
      setChessGameState(getGameState(newGame));
      forceUpdate(n => n + 1);
      if (hasTimer) {
        setWhiteTime(timeControl!);
        setBlackTime(timeControl!);
      }

      if (isAI) {
        setMyColour('w');
        return;
      }

      if (isOnline && user) {
        const { room } = await getRoom(roomId);
        if (room) {
          const isHost = room.host_id === user.id;
          const colour = isHost
            ? room.host_colour
            : (room.host_colour === 'w' ? 'b' : 'w');
          setMyColour(colour);
          const roomTimeControl = room.time_control;
          if (roomTimeControl) {
            setWhiteTime(roomTimeControl);
            setBlackTime(roomTimeControl);
          }
          if (room.current_fen !== newGame.fen()) {
            const restoredGame = createChessGame(room.current_fen);
            gameRef.current = restoredGame;
            setChessGameState(getGameState(restoredGame));
            forceUpdate(n => n + 1);
          }
        }
        setIsLoadingRoom(false);
      }
    };
    init();
  }, []);

  /** Subscribes to opponent moves in online mode */
  useEffect(() => {
    if (!isOnline) return;
    const subscription = subscribeToMoves(roomId, (moveData) => {
      if (moveData.player_id === user?.id) return;
      const move = makeMove(
        gameRef.current,
        moveData.from_square,
        moveData.to_square,
        moveData.promotion ?? 'q'
      );
      if (!move) return;
      addChessMove(move);
      const newState = getGameState(gameRef.current);
      setChessGameState(newState);
      gameRef.current = createChessGame(newState.fen);
      forceUpdate(n => n + 1);
      if (hasTimer) startTimer(newState.turn);
    });
    return () => { subscription.unsubscribe(); };
  }, [isOnline, roomId, hasTimer]);

  /** Updates status message on game state change */
  useEffect(() => {
    if (!chessGameState) return;
    if (chessGameState.isGameOver) {
      stopTimer();
      if (chessGameState.isCheckmate) {
        const winner = chessGameState.turn === 'w' ? 'Black' : 'White';
        setStatusMessage(`Checkmate — ${winner} wins!`);
        if (isOnline) {
          const winnerId = chessGameState.turn !== myColour ? user?.id ?? null : null;
          completeRoom(roomId, winnerId, 'checkmate');
        }
      } else if (chessGameState.isStalemate) {
        setStatusMessage('Stalemate — draw!');
        if (isOnline) completeRoom(roomId, null, 'stalemate');
      } else if (chessGameState.isDraw) {
        setStatusMessage('Draw!');
        if (isOnline) completeRoom(roomId, null, 'draw');
      }
    } else if (chessGameState.isCheck) {
      const inCheck = chessGameState.turn === 'w' ? 'White' : 'Black';
      if (isAI) {
        setStatusMessage(chessGameState.turn === myColour ? `${inCheck} is in check!` : 'AI is in check!');
      } else {
        setStatusMessage(`${inCheck} is in check!`);
      }
    } else {
      if (isAI) {
        setStatusMessage(chessGameState.turn === myColour ? 'Your turn' : isAIThinkingRef.current ? 'AI is thinking...' : "AI's turn");
      } else if (isOnline) {
        setStatusMessage(chessGameState.turn === myColour ? 'Your turn' : "Opponent's turn");
      } else {
        setStatusMessage(chessGameState.turn === 'w' ? 'White to move' : 'Black to move');
      }
    }
  }, [chessGameState]);

  /** Executes a move */
  const executeMove = useCallback(async (
    from: ChessSquare,
    to: ChessSquare,
    promotion: ChessPieceType = 'q'
  ): Promise<void> => {
    const move = makeMove(gameRef.current, from, to, promotion);
    if (!move) return;
    addChessMove(move);
    const newState = getGameState(gameRef.current);
    setChessGameState(newState);
    setSelectedSquare(null);
    setLegalMoves([]);
    gameRef.current = createChessGame(newState.fen);
    forceUpdate(n => n + 1);

    // Start timer for next player
    if (hasTimer && !newState.isGameOver) {
      if (!gameStartedRef.current) gameStartedRef.current = true;
      startTimer(newState.turn);
    }

    if (isOnline && user) {
      const moveNumber = (chessGameState?.moveCount ?? 0) + 1;
      await saveMove(roomId, user.id, move, moveNumber);
      await updateRoomFen(roomId, newState.fen);
    }
  }, [chessGameState, isOnline, user, roomId, hasTimer, startTimer]);

  /** Triggers AI move after player moves */
  useEffect(() => {
    if (!isAI || !chessGameState || chessGameState.isGameOver) return;
    if (chessGameState.turn === myColour) return;
    if (isAIThinkingRef.current) return;

    const triggerAIMove = async (): Promise<void> => {
      isAIThinkingRef.current = true;
      setIsAIThinking(true);
      setStatusMessage('AI is thinking...');
      try {
        const legalMoves = getLegalMovesUCI(gameRef.current);
        if (legalMoves.length === 0) return;
        const { move } = await getChessAIMove(chessGameState.fen, aiDifficulty!, legalMoves);
        const moveToPlay = (move && move.length >= 4) ? move : legalMoves[0];
        const from = moveToPlay.slice(0, 2) as ChessSquare;
        const to = moveToPlay.slice(2, 4) as ChessSquare;
        const promotion = moveToPlay.length === 5 ? moveToPlay[4] as ChessPieceType : 'q';
        await executeMove(from, to, promotion);
      } catch {
        const legalMoves = getLegalMovesUCI(gameRef.current);
        if (legalMoves.length > 0) {
          const fallback = legalMoves[0];
          await executeMove(fallback.slice(0, 2) as ChessSquare, fallback.slice(2, 4) as ChessSquare, 'q');
        }
      } finally {
        isAIThinkingRef.current = false;
        setIsAIThinking(false);
      }
    };

    triggerAIMove();
  }, [chessGameState?.fen]);

  const isMyTurn = (): boolean => {
    if (!isOnline && !isAI) return true;
    if (isAI) return chessGameState?.turn === myColour && !isAIThinkingRef.current;
    return chessGameState?.turn === myColour;
  };

  /** Handles tapping a square */
  const handleSquareTap = useCallback((square: ChessSquare): void => {
    if (chessGameState?.isGameOver) return;
    if (!isMyTurn()) return;

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
      if (legalMovesForSelected.includes(square)) {
        if (requiresPromotion(selectedSquare, square, gameRef.current)) {
          setPendingMove({ from: selectedSquare, to: square });
          setShowPromotion(true);
          return;
        }
        executeMove(selectedSquare, square);
        return;
      }
      const piece = gameRef.current.get(square as any);
      if (piece && piece.color === chessGameState?.turn) {
        setSelectedSquare(square);
        setLegalMoves(getLegalMovesForSquare(gameRef.current, square));
        return;
      }
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    const piece = gameRef.current.get(square as any);
    if (piece && piece.color === chessGameState?.turn) {
      setSelectedSquare(square);
      setLegalMoves(getLegalMovesForSquare(gameRef.current, square));
    }
  }, [selectedSquare, legalMovesForSelected, chessGameState, myColour, isAIThinking]);

  /** Handles promotion selection */
  const handlePromotion = useCallback((piece: ChessPieceType): void => {
    if (!pendingMove) return;
    setShowPromotion(false);
    executeMove(pendingMove.from, pendingMove.to, piece);
    setPendingMove(null);
  }, [pendingMove, executeMove]);

  /** Resets the game */
  const handleNewGame = (): void => {
    if (isOnline) return;
    stopTimer();
    const newGame = createChessGame();
    gameRef.current = newGame;
    resetChessGame();
    setChessGameState(getGameState(newGame));
    setIsAIThinking(false);
    isAIThinkingRef.current = false;
    gameStartedRef.current = false;
    if (hasTimer) {
      setWhiteTime(timeControl!);
      setBlackTime(timeControl!);
    }
    forceUpdate(n => n + 1);
  };

  /** Renders a single square */
  const renderSquare = (fileIdx: number, rankIdx: number): React.JSX.Element => {
    const FILES = myColour === 'b' ? FILES_BLACK : FILES_WHITE;
    const RANKS = myColour === 'b' ? RANKS_BLACK : RANKS_WHITE;
    const square = `${FILES[fileIdx]}${RANKS[rankIdx]}` as ChessSquare;
    const piece = gameRef.current.get(square as any);
    const isSelected = selectedSquare === square;
    const isLegalMove = legalMovesForSelected.includes(square);
    const bgColour = getSquareColour(fileIdx, rankIdx);

    return (
      <TouchableOpacity
        key={square}
        style={[styles.square, { backgroundColor: bgColour }, isSelected && styles.squareSelected]}
        onPress={() => handleSquareTap(square)}
        accessibilityLabel={`Square ${square}`}
        activeOpacity={0.8}
      >
        {isLegalMove && (
          <View style={[styles.legalDot, piece ? styles.legalCapture : styles.legalMove]} />
        )}
        {piece && (
          <Text style={[styles.piece, piece.color === 'w' ? styles.whitePiece : styles.blackPiece]}>
            {getPieceSymbol(piece.type, piece.color)}
          </Text>
        )}
        {rankIdx === 7 && (
          <Text style={[styles.coordLabel, styles.fileLabel]}>
            {(myColour === 'b' ? FILES_BLACK : FILES_WHITE)[fileIdx]}
          </Text>
        )}
        {fileIdx === 0 && (
          <Text style={[styles.coordLabel, styles.rankLabel]}>
            {(myColour === 'b' ? RANKS_BLACK : RANKS_WHITE)[rankIdx]}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  /** Returns timer colour — red when under 10 seconds */
  const timerColour = (seconds: number): string =>
    seconds <= 10 && seconds > 0 ? COLOURS.ERROR : COLOURS.TEXT_PRIMARY;

  const opponentColour = myColour === 'w' ? 'b' : 'w';

  if (isLoadingRoom) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={COLOURS.PRIMARY} />
          <Text style={styles.loadingText}>Loading game...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Go back" style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isAI ? `vs AI (${aiDifficulty})` : isOnline ? `Room ${roomId}` : 'Chess'}
          </Text>
          {!isOnline && (
            <TouchableOpacity onPress={handleNewGame} accessibilityLabel="New game" style={styles.newGameBtn}>
              <Text style={styles.newGameText}>New</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Opponent timer */}
        {hasTimer && (
          <View style={[styles.timerRow, styles.timerRowOpponent]}>
            <Text style={styles.timerLabel}>
              {isAI ? 'AI' : isOnline ? 'Opponent' : opponentColour === 'w' ? 'White' : 'Black'}
            </Text>
            <View style={[
              styles.timerBox,
              chessGameState?.turn === opponentColour && !chessGameState?.isGameOver && styles.timerBoxActive,
            ]}>
              <Text style={[
                styles.timerText,
                { color: timerColour(opponentColour === 'w' ? whiteTime : blackTime) },
              ]}>
                {formatTime(opponentColour === 'w' ? whiteTime : blackTime)}
              </Text>
            </View>
          </View>
        )}

        <View style={[
          styles.statusBar,
          chessGameState?.isGameOver && styles.statusBarGameOver,
          chessGameState?.isCheck && !chessGameState?.isGameOver && styles.statusBarCheck,
          isAIThinking && styles.statusBarThinking,
        ]}>
          {isAIThinking && <ActivityIndicator size="small" color={COLOURS.PRIMARY} style={styles.thinkingIndicator} />}
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>

        <View style={styles.capturedRow}>
          {chessGameState?.capturedByWhite.map((p, i) => (
            <Text key={i} style={styles.capturedPiece}>{getPieceSymbol(p.type, p.color)}</Text>
          ))}
        </View>

        <View style={styles.board}>
          {(myColour === 'b' ? RANKS_BLACK : RANKS_WHITE).map((_, rankIdx) => (
            <View key={rankIdx} style={styles.boardRow}>
              {(myColour === 'b' ? FILES_BLACK : FILES_WHITE).map((_, fileIdx) =>
                renderSquare(fileIdx, rankIdx)
              )}
            </View>
          ))}
        </View>

        <View style={styles.capturedRow}>
          {chessGameState?.capturedByBlack.map((p, i) => (
            <Text key={i} style={styles.capturedPiece}>{getPieceSymbol(p.type, p.color)}</Text>
          ))}
        </View>

        {/* My timer */}
        {hasTimer && (
          <View style={styles.timerRow}>
            <Text style={styles.timerLabel}>You</Text>
            <View style={[
              styles.timerBox,
              chessGameState?.turn === myColour && !chessGameState?.isGameOver && styles.timerBoxActive,
            ]}>
              <Text style={[
                styles.timerText,
                { color: timerColour(myColour === 'w' ? whiteTime : blackTime) },
              ]}>
                {formatTime(myColour === 'w' ? whiteTime : blackTime)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.moveHistory}>
          <Text style={styles.moveHistoryTitle}>Moves</Text>
          <View style={styles.moveList}>
            {useGameStore.getState().chessMoveHistory.map((move, i) => (
              <Text key={i} style={styles.moveItem}>
                {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ''}{move.san}
                {i % 2 === 0 ? ' ' : '\n'}
              </Text>
            ))}
          </View>
        </View>

        {showPromotion && (
          <View style={styles.promotionOverlay}>
            <View style={styles.promotionBox}>
              <Text style={styles.promotionTitle}>Promote pawn to:</Text>
              <View style={styles.promotionOptions}>
                {(['q', 'r', 'b', 'n'] as ChessPieceType[]).map((piece) => (
                  <TouchableOpacity
                    key={piece}
                    style={styles.promotionOption}
                    onPress={() => handlePromotion(piece)}
                    accessibilityLabel={`Promote to ${piece}`}
                  >
                    <Text style={styles.promotionPiece}>
                      {getPieceSymbol(piece, chessGameState?.turn === 'w' ? 'w' : 'b')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOURS.BACKGROUND },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: COLOURS.TEXT_SECONDARY, fontSize: 14 },
  scroll: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { paddingVertical: 4, paddingRight: 16 },
  backText: { color: COLOURS.TEXT_SECONDARY, fontSize: 15 },
  title: { color: COLOURS.TEXT_PRIMARY, fontSize: 18, fontWeight: '700' },
  newGameBtn: { backgroundColor: COLOURS.PRIMARY, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  newGameText: { color: COLOURS.TEXT_PRIMARY, fontSize: 13, fontWeight: '600' },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 4,
  },
  timerRowOpponent: { marginBottom: 0, marginTop: 4 },
  timerLabel: { color: COLOURS.TEXT_MUTED, fontSize: 12 },
  timerBox: {
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    minWidth: 72,
    alignItems: 'center',
  },
  timerBoxActive: { borderColor: COLOURS.PRIMARY, backgroundColor: COLOURS.SURFACE_ELEVATED },
  timerText: { fontSize: 20, fontWeight: '700', fontFamily: 'monospace' },
  statusBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusBarCheck: { borderColor: COLOURS.WARNING, backgroundColor: COLOURS.SURFACE_ELEVATED },
  statusBarGameOver: { borderColor: COLOURS.PRIMARY, backgroundColor: COLOURS.SURFACE_ELEVATED },
  statusBarThinking: { borderColor: COLOURS.PRIMARY },
  thinkingIndicator: { marginRight: 4 },
  statusText: { color: COLOURS.TEXT_PRIMARY, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  capturedRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, minHeight: 24, marginBottom: 4 },
  capturedPiece: { fontSize: 16 },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    borderRadius: 4,
    overflow: 'hidden',
  },
  boardRow: { flexDirection: 'row' },
  square: { width: SQUARE_SIZE, height: SQUARE_SIZE, alignItems: 'center', justifyContent: 'center' },
  squareSelected: { backgroundColor: COLOURS.BOARD_SELECTED },
  legalDot: { position: 'absolute', borderRadius: 50 },
  legalMove: { width: SQUARE_SIZE * 0.3, height: SQUARE_SIZE * 0.3, backgroundColor: 'rgba(0,0,0,0.2)' },
  legalCapture: { width: SQUARE_SIZE * 0.9, height: SQUARE_SIZE * 0.9, borderWidth: 3, borderColor: 'rgba(0,0,0,0.2)', backgroundColor: 'transparent' },
  piece: { fontSize: SQUARE_SIZE * 0.7, lineHeight: SQUARE_SIZE * 0.85 },
  whitePiece: { color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0.5, height: 0.5 }, textShadowRadius: 1 },
  blackPiece: { color: '#1A1A2E', textShadowColor: 'rgba(255,255,255,0.3)', textShadowOffset: { width: 0.5, height: 0.5 }, textShadowRadius: 1 },
  coordLabel: { position: 'absolute', fontSize: 9, fontWeight: '600', opacity: 0.6 },
  fileLabel: { bottom: 1, right: 2, color: COLOURS.TEXT_PRIMARY },
  rankLabel: { top: 1, left: 2, color: COLOURS.TEXT_PRIMARY },
  moveHistory: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
  },
  moveHistoryTitle: { color: COLOURS.TEXT_SECONDARY, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  moveList: { flexDirection: 'row', flexWrap: 'wrap' },
  moveItem: { color: COLOURS.TEXT_PRIMARY, fontSize: 13, fontFamily: 'monospace' },
  promotionOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLOURS.OVERLAY, alignItems: 'center', justifyContent: 'center' },
  promotionBox: { backgroundColor: COLOURS.SURFACE_ELEVATED, borderRadius: 16, padding: 24, alignItems: 'center', gap: 16, borderWidth: 1, borderColor: COLOURS.BORDER },
  promotionTitle: { color: COLOURS.TEXT_PRIMARY, fontSize: 16, fontWeight: '600' },
  promotionOptions: { flexDirection: 'row', gap: 12 },
  promotionOption: { width: 56, height: 56, backgroundColor: COLOURS.SURFACE, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLOURS.BORDER },
  promotionPiece: { fontSize: 32 },
});