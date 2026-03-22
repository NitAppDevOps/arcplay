import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chess } from 'chess.js';
import { COLOURS } from '@constants/colours';
import { useGameStore } from '@store/gameStore';
import {
  createChessGame,
  getGameState,
  getLegalMovesForSquare,
  makeMove,
  getPieceSymbol,
  requiresPromotion,
} from '@services/chess';
import type { ChessSquare, ChessPieceType } from '@app-types/game.types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '@app-types/navigation.types';

type Props = NativeStackScreenProps<GamesStackParamList, 'ChessBoard'>;

const { width } = Dimensions.get('window');
const BOARD_SIZE = width - 32;
const SQUARE_SIZE = BOARD_SIZE / 8;

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

/** Returns the background colour for a board square */
const getSquareColour = (file: number, rank: number): string => {
  const isLight = (file + rank) % 2 === 0;
  return isLight ? COLOURS.BOARD_LIGHT : COLOURS.BOARD_DARK;
};

/** ChessBoardScreen — fully playable chess board for two players */
export default function ChessBoardScreen({ navigation }: Props): React.JSX.Element {
  const [game, setGame] = useState<Chess>(() => createChessGame());
  const [showPromotion, setShowPromotion] = useState<boolean>(false);
  const [pendingMove, setPendingMove] = useState<{ from: ChessSquare; to: ChessSquare } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('White to move');

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

  /** Initialises game state on mount */
  useEffect(() => {
    const newGame = createChessGame();
    setGame(newGame);
    setChessGameState(getGameState(newGame));
    resetChessGame();
    setChessGameState(getGameState(newGame));
  }, []);

  /** Updates status message whenever game state changes */
  useEffect(() => {
    if (!chessGameState) return;
    if (chessGameState.isCheckmate) {
      const winner = chessGameState.turn === 'w' ? 'Black' : 'White';
      setStatusMessage(`Checkmate — ${winner} wins!`);
    } else if (chessGameState.isStalemate) {
      setStatusMessage('Stalemate — draw!');
    } else if (chessGameState.isDraw) {
      setStatusMessage('Draw!');
    } else if (chessGameState.isCheck) {
      const inCheck = chessGameState.turn === 'w' ? 'White' : 'Black';
      setStatusMessage(`${inCheck} is in check!`);
    } else {
      const toMove = chessGameState.turn === 'w' ? 'White' : 'Black';
      setStatusMessage(`${toMove} to move`);
    }
  }, [chessGameState]);

  /** Handles tapping a square on the board */
  const handleSquareTap = useCallback((square: ChessSquare): void => {
    if (chessGameState?.isGameOver) return;

    // If a square is already selected
    if (selectedSquare) {
      // Tapped the same square — deselect
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // Tapped a legal destination — attempt the move
      if (legalMovesForSelected.includes(square)) {
        if (requiresPromotion(selectedSquare, square, game)) {
          setPendingMove({ from: selectedSquare, to: square });
          setShowPromotion(true);
          return;
        }
        executeMove(selectedSquare, square);
        return;
      }

      // Tapped another piece of same colour — select that instead
      const piece = game.get(square as any);
      if (piece && piece.color === chessGameState?.turn) {
        setSelectedSquare(square);
        setLegalMoves(getLegalMovesForSquare(game, square));
        return;
      }

      // Tapped empty or enemy square that isn't a legal move — deselect
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // No square selected — select if own piece
    const piece = game.get(square as any);
    if (piece && piece.color === chessGameState?.turn) {
      setSelectedSquare(square);
      setLegalMoves(getLegalMovesForSquare(game, square));
    }
  }, [selectedSquare, legalMovesForSelected, game, chessGameState]);

  /** Executes a move and updates all state */
  const executeMove = useCallback((
    from: ChessSquare,
    to: ChessSquare,
    promotion: ChessPieceType = 'q'
  ): void => {
    const move = makeMove(game, from, to, promotion);
    if (!move) return;

    addChessMove(move);
    const newState = getGameState(game);
    setChessGameState(newState);
    setSelectedSquare(null);
    setLegalMoves([]);
    setGame(createChessGame(newState.fen));
  }, [game]);

  /** Handles promotion piece selection */
  const handlePromotion = useCallback((piece: ChessPieceType): void => {
    if (!pendingMove) return;
    setShowPromotion(false);
    executeMove(pendingMove.from, pendingMove.to, piece);
    setPendingMove(null);
  }, [pendingMove, executeMove]);

  /** Resets the game to the starting position */
  const handleNewGame = (): void => {
    const newGame = createChessGame();
    setGame(newGame);
    resetChessGame();
    setChessGameState(getGameState(newGame));
  };

  /** Renders a single board square */
  const renderSquare = (fileIdx: number, rankIdx: number): React.JSX.Element => {
    const square = `${FILES[fileIdx]}${RANKS[rankIdx]}` as ChessSquare;
    const piece = game.get(square as any);
    const isSelected = selectedSquare === square;
    const isLegalMove = legalMovesForSelected.includes(square);
    const bgColour = getSquareColour(fileIdx, rankIdx);

    return (
      <TouchableOpacity
        key={square}
        style={[
          styles.square,
          { backgroundColor: bgColour },
          isSelected && styles.squareSelected,
        ]}
        onPress={() => handleSquareTap(square)}
        accessibilityLabel={`Square ${square}${piece ? `, ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}`}
        activeOpacity={0.8}
      >
        {/* Legal move indicator */}
        {isLegalMove && (
          <View style={[
            styles.legalDot,
            piece ? styles.legalCapture : styles.legalMove,
          ]} />
        )}

        {/* Piece */}
        {piece && (
          <Text style={[
            styles.piece,
            piece.color === 'w' ? styles.whitePiece : styles.blackPiece,
          ]}>
            {getPieceSymbol(piece.type, piece.color)}
          </Text>
        )}

        {/* File label on rank 1 */}
        {rankIdx === 7 && (
          <Text style={[styles.coordLabel, styles.fileLabel]}>
            {FILES[fileIdx]}
          </Text>
        )}

        {/* Rank label on file a */}
        {fileIdx === 0 && (
          <Text style={[styles.coordLabel, styles.rankLabel]}>
            {RANKS[rankIdx]}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            style={styles.backBtn}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Chess</Text>
          <TouchableOpacity
            onPress={handleNewGame}
            accessibilityLabel="New game"
            style={styles.newGameBtn}
          >
            <Text style={styles.newGameText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Status bar */}
        <View style={[
          styles.statusBar,
          chessGameState?.isGameOver && styles.statusBarGameOver,
          chessGameState?.isCheck && !chessGameState?.isGameOver && styles.statusBarCheck,
        ]}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>

        {/* Captured pieces — Black captured by White */}
        <View style={styles.capturedRow}>
          {chessGameState?.capturedByWhite.map((p, i) => (
            <Text key={i} style={styles.capturedPiece}>
              {getPieceSymbol(p.type, p.color)}
            </Text>
          ))}
        </View>

        {/* Board */}
        <View style={styles.board}>
          {RANKS.map((_, rankIdx) => (
            <View key={rankIdx} style={styles.boardRow}>
              {FILES.map((_, fileIdx) => renderSquare(fileIdx, rankIdx))}
            </View>
          ))}
        </View>

        {/* Captured pieces — White captured by Black */}
        <View style={styles.capturedRow}>
          {chessGameState?.capturedByBlack.map((p, i) => (
            <Text key={i} style={styles.capturedPiece}>
              {getPieceSymbol(p.type, p.color)}
            </Text>
          ))}
        </View>

        {/* Move history */}
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

        {/* Promotion modal */}
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
  container: {
    flex: 1,
    backgroundColor: COLOURS.BACKGROUND,
  },
  scroll: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 16,
  },
  backText: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 15,
  },
  title: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
  },
  newGameBtn: {
    backgroundColor: COLOURS.PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newGameText: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '600',
  },
  statusBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
  },
  statusBarCheck: {
    borderColor: COLOURS.WARNING,
    backgroundColor: COLOURS.SURFACE_ELEVATED,
  },
  statusBarGameOver: {
    borderColor: COLOURS.PRIMARY,
    backgroundColor: COLOURS.SURFACE_ELEVATED,
  },
  statusText: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  capturedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    minHeight: 24,
    marginBottom: 4,
  },
  capturedPiece: {
    fontSize: 16,
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
    borderRadius: 4,
    overflow: 'hidden',
  },
  boardRow: {
    flexDirection: 'row',
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareSelected: {
    backgroundColor: COLOURS.BOARD_SELECTED,
  },
  legalDot: {
    position: 'absolute',
    borderRadius: 50,
  },
  legalMove: {
    width: SQUARE_SIZE * 0.3,
    height: SQUARE_SIZE * 0.3,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  legalCapture: {
    width: SQUARE_SIZE * 0.9,
    height: SQUARE_SIZE * 0.9,
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.2)',
    backgroundColor: 'transparent',
  },
  piece: {
    fontSize: SQUARE_SIZE * 0.7,
    lineHeight: SQUARE_SIZE * 0.85,
  },
  whitePiece: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  blackPiece: {
    color: '#1A1A2E',
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  coordLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '600',
    opacity: 0.6,
  },
  fileLabel: {
    bottom: 1,
    right: 2,
    color: COLOURS.TEXT_PRIMARY,
  },
  rankLabel: {
    top: 1,
    left: 2,
    color: COLOURS.TEXT_PRIMARY,
  },
  moveHistory: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
  },
  moveHistoryTitle: {
    color: COLOURS.TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  moveList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  moveItem: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  promotionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLOURS.OVERLAY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promotionBox: {
    backgroundColor: COLOURS.SURFACE_ELEVATED,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
  },
  promotionTitle: {
    color: COLOURS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
  promotionOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  promotionOption: {
    width: 56,
    height: 56,
    backgroundColor: COLOURS.SURFACE,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLOURS.BORDER,
  },
  promotionPiece: {
    fontSize: 32,
  },
});