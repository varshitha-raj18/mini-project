export enum Theme {
  SPACE = 'space',
  JUNGLE = 'jungle',
  AQUATIC = 'aquatic',
  ACTION = 'action',
  FOCUS = 'deep focus',
}

export enum LearningModule {
  SUMMARY = 'Summary',
  CHAT = 'Chat with the Content',
  MIND_MAP = 'Mind Map',
  PUZZLE_LEARNING = 'Puzzle Learning',
}

export type View = 'SETUP' | 'GENERATING' | 'DASHBOARD';

export interface Level1Question {
  question: string;
  options: string[];
  answer: string;
}

export interface Flashcard {
    term: string;
    definition: string;
}

export interface PuzzleState {
    currentLevel: 1 | 2 | 3;
    isFinished: boolean;
    level1: {
      questions: Level1Question[];
      currentQuestionIndex: number;
      userAnswers: (string | null)[];
      score: number;
      difficulty: 'easy' | 'medium' | 'hard';
    } | null;
    level2: {
      flashcards: Flashcard[];
    } | null;
    level3: {
      scenario: string;
      question: string;
      userAnswer: string;
      feedback: string;
      isEvaluated: boolean;
    } | null;
}

export interface MindMapNode {
    topic: string;
    children?: MindMapNode[];
}

export interface GeneratedContent {
    [LearningModule.MIND_MAP]?: MindMapNode;
    [LearningModule.SUMMARY]?: string;
}