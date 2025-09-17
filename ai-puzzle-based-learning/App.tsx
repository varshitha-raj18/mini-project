
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Chat } from "@google/genai";
import jsPDF from 'jspdf';
import { Theme, LearningModule, View, PuzzleState, GeneratedContent, MindMapNode, Level1Question } from './types';
import { SpaceIcon, JungleIcon, AquaticIcon, ActionIcon, FocusIcon, BookIcon } from './components/icons';
import * as geminiService from './services/geminiService';

type ThemeColors = { primary: string; secondary: string; accent: string; light: string; };

const THEME_PALETTES: Record<Theme, ThemeColors> = {
  [Theme.FOCUS]: { primary: '30 41 59', secondary: '51 65 85', accent: '56 189 248', light: '241 245 249' },
  [Theme.SPACE]: { primary: '11 15 25', secondary: '28 32 53', accent: '139 92 246', light: '224 231 255' },
  [Theme.JUNGLE]: { primary: '20 54 1', secondary: '36 85 1', accent: '173 255 47', light: '240 255 240' },
  [Theme.AQUATIC]: { primary: '0 77 122', secondary: '0 119 182', accent: '0 180 216', light: '202 240 248' },
  [Theme.ACTION]: { primary: '29 29 29', secondary: '75 85 99', accent: '239 68 68', light: '243 244 246' },
};

const THEMES = [
  { id: Theme.SPACE, name: 'Space', icon: <SpaceIcon /> },
  { id: Theme.JUNGLE, name: 'Jungle', icon: <JungleIcon /> },
  { id: Theme.AQUATIC, name: 'Aquatic', icon: <AquaticIcon /> },
  { id: Theme.ACTION, name: 'Action', icon: <ActionIcon /> },
  { id: Theme.FOCUS, name: 'Deep Focus', icon: <FocusIcon /> },
];

const LEARNING_MODULE_OPTIONS = Object.values(LearningModule);
const QUESTION_COUNT_OPTIONS: (5 | 10 | 15)[] = [5, 10, 15];

const LoadingScreen: React.FC<{text?: string}> = ({text}) => (
    <div className="fixed inset-0 bg-primary/80 backdrop-blur-sm flex flex-col justify-center items-center z-50 animate-fade-in">
        <div className="w-16 h-16 border-4 border-t-accent border-secondary rounded-full animate-spin"></div>
        <p className="mt-4 text-lg text-light">{text || 'Your AI learning partner is crafting your materials...'}</p>
    </div>
);

const SetupScreen: React.FC<{ 
    onGenerate: (text: string, theme: Theme, types: LearningModule[], questionCount: 5 | 10 | 15) => void;
    selectedTheme: Theme;
    onThemeChange: (theme: Theme) => void;
}> = ({ onGenerate, selectedTheme, onThemeChange }) => {
    const [text, setText] = useState('');
    const [selectedTypes, setSelectedTypes] = useState<Set<LearningModule>>(new Set([LearningModule.PUZZLE_LEARNING]));
    const [questionCount, setQuestionCount] = useState<5|10|15>(5);

    const handleSubmit = () => {
        if (!text.trim() || selectedTypes.size === 0) {
            alert('Please provide text to learn and select at least one module.');
            return;
        }
        onGenerate(text, selectedTheme, Array.from(selectedTypes), questionCount);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-primary animate-fade-in">
            <div className="w-full max-w-4xl bg-secondary rounded-2xl shadow-2xl p-8 space-y-8">
                <header className="text-center">
                    <h1 className="text-4xl font-bold text-light">AI Puzzle-Based Learning</h1>
                    <p className="text-accent mt-2">Paste your topic, choose a theme, and start your interactive learning journey.</p>
                </header>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-light">1. Paste Topic to Learn</h2>
                     <div className="relative bg-primary rounded-lg border-2 border-primary/50 focus-within:border-accent transition-colors">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Paste any text or topic you want to learn about here..."
                            className="w-full h-40 p-4 bg-transparent rounded-lg focus:outline-none transition-colors text-light resize-none"
                        />
                    </div>
                </section>
                
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-light">2. Choose a Theme</h2>
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {THEMES.map(({ id, name, icon }) => (
                            <button key={id} onClick={() => onThemeChange(id)} className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 ${selectedTheme === id ? 'bg-accent text-primary border-accent scale-105' : 'bg-primary border-primary/50 hover:border-accent'}`}>{icon}<span className="mt-2 text-sm font-medium">{name}</span></button>
                        ))}
                    </div>
                </section>
                
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-light">3. Select Learning Modules</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {LEARNING_MODULE_OPTIONS.map((type) => (
                            <button key={type} onClick={() => { const newSelection = new Set(selectedTypes); if (newSelection.has(type)) newSelection.delete(type); else newSelection.add(type); setSelectedTypes(newSelection); }} className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${selectedTypes.has(type) ? 'bg-accent text-primary border-accent' : 'bg-primary border-primary/50 hover:border-accent'}`}><span className="font-semibold">{type}</span></button>
                        ))}
                    </div>
                    {selectedTypes.has(LearningModule.PUZZLE_LEARNING) && (
                        <div className="mt-4 p-4 bg-primary rounded-lg animate-fade-in">
                            <label htmlFor="question-count" className="block text-sm font-medium text-light mb-2">Quiz Questions (Level 1):</label>
                             <div className="flex space-x-2">
                                {QUESTION_COUNT_OPTIONS.map(count => (
                                    <button key={count} onClick={() => setQuestionCount(count)} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${questionCount === count ? 'bg-accent text-primary' : 'bg-secondary hover:bg-secondary/70'}`}>{count}</button>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
                
                <div className="text-center pt-4">
                    <button onClick={handleSubmit} disabled={!text.trim() || selectedTypes.size === 0} className="bg-accent text-primary font-bold py-3 px-12 rounded-full text-lg hover:opacity-90 transition-transform duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed transform hover:scale-105">Generate</button>
                </div>
            </div>
        </div>
    );
};

const SummaryDisplay: React.FC<{ summary: string }> = ({ summary }) => (
    <div className="p-6 bg-secondary rounded-lg animate-fade-in">
        <h3 className="text-2xl font-bold text-accent mb-4">Summary</h3>
        <p className="whitespace-pre-wrap text-lg leading-relaxed">{summary}</p>
    </div>
);

const MindMapNodeRecursive: React.FC<{ node: MindMapNode }> = ({ node }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasChildren = node.children && node.children.length > 0;

    const handleToggle = () => {
        if (hasChildren) {
            setIsExpanded(!isExpanded);
        }
    };

    return (
        <div className="ml-4 first:ml-0">
            <div 
                className={`flex items-center p-2 rounded-md transition-colors ${hasChildren ? 'cursor-pointer hover:bg-primary' : 'cursor-default'}`}
                onClick={handleToggle}
            >
                {hasChildren ? (
                    <svg 
                        className={`w-5 h-5 mr-2 text-accent transition-transform transform flex-shrink-0 ${isExpanded ? 'rotate-90' : 'rotate-0'}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                ) : (
                    <div className="w-5 h-5 mr-2 flex-shrink-0 flex items-center justify-center">
                       <div className="w-1.5 h-1.5 bg-secondary rounded-full"></div>
                    </div>
                )}
                <span className="text-light">{node.topic}</span>
            </div>
            {isExpanded && hasChildren && (
                <div className="pl-6 border-l-2 border-secondary/50 ml-[14px]">
                    {node.children.map((child, index) => (
                        <MindMapNodeRecursive key={index} node={child} />
                    ))}
                </div>
            )}
        </div>
    );
};

const MindMapDisplay: React.FC<{ node: MindMapNode }> = ({ node }) => (
    <div className="p-6 bg-secondary rounded-lg animate-fade-in">
        <h3 className="text-2xl font-bold text-accent mb-4">Mind Map</h3>
        <MindMapNodeRecursive node={node} />
    </div>
);

const ChatInterface: React.FC<{ chatInstance: Chat | null }> = ({ chatInstance }) => {
    type ChatHistoryEntry = { role: 'user' | 'model'; text: string };
    const [history, setHistory] = useState<ChatHistoryEntry[]>([]);
    const [message, setMessage] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const chatContainerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => { chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight); }, [history]);
    
    const handleSend = async () => {
        if (!message.trim() || !chatInstance || isThinking) return;
        const userMessage = message;
        setHistory(prev => [...prev, { role: 'user', text: userMessage }]);
        setMessage('');
        setIsThinking(true);
        try {
            const result = await chatInstance.sendMessageStream({ message: userMessage });
            setHistory(prev => [...prev, { role: 'model', text: '' }]);
            for await (const chunk of result) {
                setHistory(prev => { const newHistory = [...prev]; newHistory[newHistory.length - 1].text += chunk.text; return newHistory; });
            }
        } catch (error) {
            console.error("Chat error:", error);
            setHistory(prev => [...prev, { role: 'model', text: "I'm having trouble connecting. Please try again." }]);
        } finally { setIsThinking(false); }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const margin = 10;
        let y = margin;
        
        doc.setFontSize(16);
        doc.text("Chat History", margin, y);
        y += 10;

        doc.setFontSize(12);

        history.forEach(entry => {
            const prefix = entry.role === 'user' ? 'You: ' : 'AI: ';
            const textLines = doc.splitTextToSize(prefix + entry.text, 180);
            
            if (y + (textLines.length * 7) > 280) { // Check if new entry fits on page
                doc.addPage();
                y = margin;
            }

            doc.text(textLines, margin, y);
            y += (textLines.length * 7) + 5;
        });

        doc.save("chat-history.pdf");
    };

    return (
        <div className="h-[85vh] flex flex-col bg-secondary rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-bold text-accent">Chat with the Content</h3>
                 <button onClick={handleExportPDF} disabled={history.length === 0} className="bg-accent/80 text-primary text-xs font-bold py-1 px-3 rounded-full hover:bg-accent transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">Export PDF</button>
            </div>
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto pr-2 space-y-4">
                {history.map((entry, index) => (
                    <div key={index} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xl p-3 rounded-2xl ${entry.role === 'user' ? 'bg-accent text-primary' : 'bg-primary text-light'}`}><p className="whitespace-pre-wrap">{entry.text}</p></div>
                    </div>
                ))}
                {isThinking && <div className="flex justify-start"><div className="max-w-xl p-3 rounded-2xl bg-primary text-light"><div className="flex items-center space-x-2"><div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div><div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-2 h-2 bg-accent rounded-full animate-bounce"></div></div></div></div>}
            </div>
            <div className="mt-4 flex">
                <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask a question about the material..." className="flex-1 p-3 bg-primary rounded-l-full border-2 border-primary/50 focus:border-accent outline-none transition-colors text-light" disabled={isThinking} />
                <button onClick={handleSend} disabled={isThinking || !message.trim()} className="bg-accent text-primary font-bold py-3 px-6 rounded-r-full hover:opacity-90 transition-colors disabled:bg-gray-500">Send</button>
            </div>
        </div>
    );
};

// --- Puzzle Learning Components ---

const Level1Quiz: React.FC<{ puzzleState: PuzzleState; onAnswer: (qIndex: number, answer: string) => void; }> = ({ puzzleState, onAnswer }) => {
    const level1 = puzzleState.level1;
    if (!level1) return null;
    const currentQuestion = level1.questions[level1.currentQuestionIndex];
    const userAnswer = level1.userAnswers[level1.currentQuestionIndex];

    return (
      <div>
        <h3 className="text-xl font-bold text-accent mb-4">Level 1: Knowledge Check - Question {level1.currentQuestionIndex + 1}</h3>
        <div className="p-6 bg-secondary rounded-lg">
          <p className="text-lg mb-6">{currentQuestion.question}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQuestion.options.map((option, index) => {
              let buttonClass = 'bg-primary hover:bg-primary/80';
              if (userAnswer) {
                const isSelected = userAnswer === option;
                const isCorrect = currentQuestion.answer === option;
                if (isSelected && isCorrect) buttonClass = 'bg-green-500';
                else if (isSelected && !isCorrect) buttonClass = 'bg-red-500';
                else if (isCorrect) buttonClass = 'bg-green-500';
                else buttonClass = 'bg-primary opacity-50';
              }
              return <button key={index} onClick={() => onAnswer(level1.currentQuestionIndex, option)} disabled={!!userAnswer} className={`p-4 rounded-lg text-left transition-colors w-full ${buttonClass}`}>{option}</button>
            })}
          </div>
        </div>
      </div>
    );
};

const Flashcard: React.FC<{ term: string, definition: string }> = ({ term, definition }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    return (
        <div className="[perspective:1000px] h-48" onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`relative h-full w-full rounded-lg shadow-md cursor-pointer transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                <div className="absolute inset-0 bg-accent flex items-center justify-center rounded-lg [backface-visibility:hidden] p-4 text-center">
                    <h4 className="text-xl font-bold text-primary">{term}</h4>
                </div>
                <div className="absolute inset-0 bg-light flex flex-col justify-center rounded-lg [backface-visibility:hidden] [transform:rotateY(180deg)] p-4 text-center">
                    <div className="h-full overflow-y-auto">
                      <p className="text-primary text-left">{definition}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Level2Flashcards: React.FC<{ puzzleState: PuzzleState; }> = ({ puzzleState }) => {
    const level2 = puzzleState.level2;
    if (!level2) return null;
    return (
        <div>
            <h3 className="text-xl font-bold text-accent mb-4">Level 2: Flashcard Review</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {level2.flashcards.map((card, i) => <Flashcard key={i} term={card.term} definition={card.definition} />)}
            </div>
        </div>
    );
};

const Level3Scenario: React.FC<{ puzzleState: PuzzleState; onEvaluate: (answer: string) => void; }> = ({ puzzleState, onEvaluate }) => {
    const level3 = puzzleState.level3;
    const [answer, setAnswer] = useState('');

    if (!level3) return null;
    
    return (
        <div>
            <h3 className="text-xl font-bold text-accent mb-4">Level 3: Problem Solving</h3>
            <div className="p-6 bg-secondary rounded-lg space-y-4">
                <h4 className="font-semibold text-light">Scenario:</h4>
                <p className="italic bg-primary p-4 rounded-lg">{level3.scenario}</p>
                <h4 className="font-semibold text-light pt-2">Your Task:</h4>
                <p className="font-bold text-lg">{level3.question}</p>
                
                {level3.isEvaluated ? (
                    <div className="pt-4 animate-fade-in">
                         <h4 className="font-semibold text-light">Your Answer:</h4>
                         <p className="italic bg-primary p-4 rounded-lg mb-4">{level3.userAnswer}</p>
                         <h4 className="font-semibold text-accent">AI Feedback:</h4>
                         <p className="bg-primary p-4 rounded-lg whitespace-pre-wrap">{level3.feedback}</p>
                    </div>
                ) : (
                    <div className="pt-4">
                        <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="Type your solution here..."
                            className="w-full h-32 p-4 bg-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-colors text-light resize-none"
                        />
                        <button onClick={() => onEvaluate(answer)} disabled={!answer.trim()} className="mt-4 bg-accent text-primary font-bold py-2 px-6 rounded-full hover:opacity-90 transition-colors disabled:bg-gray-500">
                            Submit for Evaluation
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


const PuzzleLearning: React.FC<{ 
    puzzleState: PuzzleState | null; 
    onAnswer: (qIndex: number, answer: string) => void; 
    onNextLevel: () => void;
    onEvaluate: (answer: string) => void;
}> = ({ puzzleState, onAnswer, onNextLevel, onEvaluate }) => {
    if (!puzzleState) return null;

    const { level1, currentLevel, isFinished } = puzzleState;
    const isLevel1Finished = level1 && level1.currentQuestionIndex >= level1.questions.length;
    
    const renderLevelComplete = (title: string, buttonText: string) => (
       <div className="text-center p-8 bg-secondary rounded-lg animate-fade-in">
            <h3 className="text-2xl font-bold text-accent">{title}</h3>
            {currentLevel === 1 && level1 && <p className="text-4xl mt-4 font-bold">{level1.score} / {level1.questions.length}</p>}
            <button onClick={onNextLevel} className="mt-6 bg-accent text-primary font-bold py-2 px-6 rounded-full hover:opacity-90 transition-colors">{buttonText}</button>
       </div>
    );

    if (isFinished) return <div className="text-center p-8 bg-secondary rounded-lg"><h3 className="text-2xl font-bold text-accent">Puzzle Learning Complete!</h3><p className="text-lg mt-2">Great job! You've completed all learning levels.</p></div>;
    
    if (isLevel1Finished && currentLevel === 1) return renderLevelComplete("Level 1 Complete!", "Continue to Level 2");

    if (currentLevel === 2 && puzzleState.level2) {
        return (
            <div>
                <Level2Flashcards puzzleState={puzzleState} />
                {renderLevelComplete("Level 2 Complete!", "Continue to Level 3")}
            </div>
        );
    }
    
    if (currentLevel === 3 && puzzleState.level3 && puzzleState.level3.isEvaluated) {
         return (
             <div>
                <Level3Scenario puzzleState={puzzleState} onEvaluate={onEvaluate} />
                {renderLevelComplete("Level 3 Complete!", "Finish")}
            </div>
         );
    }

    return (
        <div>
            {currentLevel === 1 && level1 && <Level1Quiz puzzleState={puzzleState} onAnswer={onAnswer} />}
            {currentLevel === 3 && puzzleState.level3 && <Level3Scenario puzzleState={puzzleState} onEvaluate={onEvaluate} />}
        </div>
    );
};

const Dashboard: React.FC<{
    content: GeneratedContent;
    puzzleState: PuzzleState | null;
    chatInstance: Chat | null;
    orderedModules: LearningModule[];
    onPuzzleAnswer: (qIndex: number, answer: string) => void;
    onNextPuzzleLevel: () => void;
    onPuzzleEvaluate: (answer: string) => void;
}> = (props) => {
    const [activeModule, setActiveModule] = useState<LearningModule>(props.orderedModules[0]);
    const { content, puzzleState, chatInstance, onPuzzleAnswer, onNextPuzzleLevel, onPuzzleEvaluate } = props;

    return (
        <div className="min-h-screen flex animate-fade-in">
            <aside className="w-64 bg-secondary p-6 flex flex-col">
                <h2 className="text-2xl font-bold text-light mb-8 flex items-center"><BookIcon /> Modules</h2>
                <nav className="space-y-2">
                    {props.orderedModules.map(type => (
                        <button key={type} onClick={() => setActiveModule(type)} className={`w-full text-left p-3 rounded-lg font-semibold transition-colors flex items-center ${activeModule === type ? 'bg-accent text-primary' : 'hover:bg-primary'}`}>{type}</button>
                    ))}
                </nav>
            </aside>
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-none">
                   {activeModule === LearningModule.SUMMARY && content[LearningModule.SUMMARY] && <SummaryDisplay summary={content[LearningModule.SUMMARY]} />}
                   {activeModule === LearningModule.MIND_MAP && content[LearningModule.MIND_MAP] && <MindMapDisplay node={content[LearningModule.MIND_MAP]} />}
                   {activeModule === LearningModule.CHAT && <ChatInterface chatInstance={chatInstance} />}
                   {activeModule === LearningModule.PUZZLE_LEARNING && <PuzzleLearning puzzleState={puzzleState} onAnswer={onPuzzleAnswer} onNextLevel={onNextPuzzleLevel} onEvaluate={onPuzzleEvaluate} />}
                </div>
            </main>
        </div>
    );
};

const App: React.FC = () => {
    const [view, setView] = useState<View>('SETUP');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingText, setLoadingText] = useState('');
    
    const [activeTheme, setActiveTheme] = useState<Theme>(Theme.FOCUS);
    const [baseText, setBaseText] = useState('');
    const [orderedModules, setOrderedModules] = useState<LearningModule[]>([]);

    const [generatedContent, setGeneratedContent] = useState<GeneratedContent>({});
    const [puzzleState, setPuzzleState] = useState<PuzzleState | null>(null);
    const [chatInstance, setChatInstance] = useState<Chat | null>(null);

    useEffect(() => {
        const colors = THEME_PALETTES[activeTheme];
        const root = document.documentElement;
        root.style.setProperty('--color-primary', colors.primary);
        root.style.setProperty('--color-secondary', colors.secondary);
        root.style.setProperty('--color-accent', colors.accent);
        root.style.setProperty('--color-light', colors.light);
    }, [activeTheme]);

    const handleGenerate = useCallback(async (text: string, theme: Theme, types: LearningModule[], questionCount: 5 | 10 | 15) => {
        setView('GENERATING');
        setIsLoading(true);
        setLoadingText('Generating your learning modules...');
        
        setBaseText(text);
        setOrderedModules(types);

        const newContent: GeneratedContent = {};
        const promises = [];
        
        if (types.includes(LearningModule.SUMMARY)) {
            promises.push(geminiService.generateSummary(text, theme).then(res => newContent[LearningModule.SUMMARY] = res));
        }
        if (types.includes(LearningModule.MIND_MAP)) {
            promises.push(geminiService.generateMindMap(text, theme).then(res => newContent[LearningModule.MIND_MAP] = res));
        }
        if (types.includes(LearningModule.PUZZLE_LEARNING)) {
            promises.push(geminiService.generateLevel1Questions(text, theme, 'easy', questionCount).then(questions => {
                setPuzzleState({
                    currentLevel: 1, isFinished: false,
                    level1: { questions, currentQuestionIndex: 0, userAnswers: new Array(questions.length).fill(null), score: 0, difficulty: 'easy' },
                    level2: null, level3: null
                });
            }));
        }
        if (types.includes(LearningModule.CHAT)) {
            setChatInstance(geminiService.createChat(text, theme));
        }
        
        await Promise.all(promises);
        setGeneratedContent(newContent);
        
        setIsLoading(false);
        setLoadingText('');
        setView('DASHBOARD');
    }, []);

    const handlePuzzleAnswer = (qIndex: number, answer: string) => {
        setPuzzleState(prev => {
            if (!prev || !prev.level1) return null;
            const newAnswers = [...prev.level1.userAnswers]; newAnswers[qIndex] = answer;
            const isCorrect = prev.level1.questions[qIndex].answer === answer;
            const newScore = prev.level1.score + (isCorrect ? 1 : 0);
            setTimeout(() => setPuzzleState(p => p && p.level1 ? { ...p, level1: { ...p.level1, currentQuestionIndex: p.level1.currentQuestionIndex + 1 } } : null), 1000);
            return { ...prev, level1: { ...prev.level1, userAnswers: newAnswers, score: newScore } };
        });
    };
    
    const handleNextPuzzleLevel = useCallback(async () => {
        if (!puzzleState) return;
        
        const nextLevel = puzzleState.currentLevel + 1;
        if (nextLevel > 3) {
            setPuzzleState(prev => prev ? { ...prev, isFinished: true } : null);
            return;
        }

        setIsLoading(true);

        if (nextLevel === 2) {
            setLoadingText("Creating flashcards...");
            const flashcards = await geminiService.generateLevel2Flashcards(baseText, activeTheme);
            setPuzzleState(prev => prev ? { ...prev, currentLevel: 2, level2: { flashcards } } : null);
        } else if (nextLevel === 3) {
            setLoadingText("Generating scenario...");
            const { scenario, question } = await geminiService.generateLevel3Scenario(baseText, activeTheme);
            setPuzzleState(prev => prev ? { ...prev, currentLevel: 3, level3: { scenario, question, userAnswer: '', feedback: '', isEvaluated: false } } : null);
        }
        
        setIsLoading(false);
        setLoadingText('');
    }, [puzzleState, baseText, activeTheme]);
    
    const handlePuzzleEvaluate = useCallback(async (userAnswer: string) => {
        if (!puzzleState || !puzzleState.level3) return;
        setIsLoading(true);
        setLoadingText("AI is evaluating your answer...");

        const { scenario, question } = puzzleState.level3;
        const feedback = await geminiService.evaluateLevel3Answer(baseText, scenario, question, userAnswer);
        
        setPuzzleState(prev => {
            if (!prev || !prev.level3) return null;
            return { ...prev, level3: { ...prev.level3, userAnswer, feedback, isEvaluated: true } };
        });

        setIsLoading(false);
        setLoadingText('');
    }, [puzzleState, baseText]);



    return (
        <>
            {isLoading && <LoadingScreen text={loadingText} />}
            {view === 'SETUP' && <SetupScreen onGenerate={handleGenerate} selectedTheme={activeTheme} onThemeChange={setActiveTheme} />}
            {view === 'DASHBOARD' && (
                <Dashboard
                    content={generatedContent}
                    puzzleState={puzzleState}
                    chatInstance={chatInstance}
                    orderedModules={orderedModules}
                    onPuzzleAnswer={handlePuzzleAnswer}
                    onNextPuzzleLevel={handleNextPuzzleLevel}
                    onPuzzleEvaluate={handlePuzzleEvaluate}
                />
            )}
        </>
    );
};

export default App;
