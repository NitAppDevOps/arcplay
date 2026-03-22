import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY ?? '',
});

export type ChessAIDifficulty = 'beginner' | 'casual' | 'intermediate' | 'advanced' | 'expert';

/** Returns a difficulty-appropriate system prompt for the Chess AI */
const getChessSystemPrompt = (difficulty: ChessAIDifficulty): string => {
  const prompts: Record<ChessAIDifficulty, string> = {
    beginner: `You are a beginner chess player. You make simple, legal moves without deep strategy. 
      Occasionally make suboptimal moves. Focus on basic piece development. 
      Never sacrifice pieces intentionally. Respond with only the move in UCI format (e.g. e2e4).`,
    casual: `You are a casual chess player with basic knowledge. 
      Make reasonable moves but don't calculate more than 1-2 moves ahead. 
      Sometimes miss tactical opportunities. Respond with only the move in UCI format (e.g. e2e4).`,
    intermediate: `You are an intermediate chess player. 
      Apply basic opening principles, look for simple tactics, protect your pieces. 
      Calculate 2-3 moves ahead. Respond with only the move in UCI format (e.g. e2e4).`,
    advanced: `You are an advanced chess player with strong tactical awareness. 
      Apply sound opening theory, identify tactical patterns, plan 3-4 moves ahead. 
      Look for pins, forks, and discovered attacks. Respond with only the move in UCI format (e.g. e2e4).`,
    expert: `You are an expert chess player. Play the objectively best move in the position. 
      Apply deep strategic understanding, long-term planning, and precise calculation. 
      Consider all tactical and positional factors. Respond with only the move in UCI format (e.g. e2e4).`,
  };
  return prompts[difficulty];
};

/** Gets the best chess move from Claude for the given position */
export const getChessAIMove = async (
  fen: string,
  difficulty: ChessAIDifficulty,
  legalMoves: string[]
): Promise<{ move: string | null; error: string | null }> => {
  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 10,
      system: getChessSystemPrompt(difficulty),
      messages: [
        {
          role: 'user',
          content: `Current position (FEN): ${fen}
Legal moves available: ${legalMoves.join(', ')}
What is your move? Respond with only the UCI move notation (e.g. e2e4). No explanation.`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text.trim().toLowerCase()
      : null;

    if (!responseText) return { move: null, error: 'No response from AI.' };

    // Validate the response is a legal move
    const cleanMove = responseText.replace(/[^a-h1-8qrbn]/g, '');
    const isLegal = legalMoves.some(m => m.toLowerCase() === cleanMove);

    if (!isLegal) {
      // Fall back to a random legal move if Claude returns something unexpected
      const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      return { move: randomMove, error: null };
    }

    return { move: cleanMove, error: null };
  } catch (err) {
    // Fall back to random move on any error
    const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    return { move: randomMove, error: null };
  }
};