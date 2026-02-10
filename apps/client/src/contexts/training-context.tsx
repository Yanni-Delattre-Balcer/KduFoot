import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Exercise } from '@/types/exercise.types';

interface TrainingContextType {
    selectedExercises: Exercise[];
    addExercise: (exercise: Exercise) => void;
    removeExercise: (exerciseId: string) => void;
    clearTraining: () => void;
    isSessionActive: boolean;
    sessionStartTime: number | null;
    startSession: () => void;
    stopSession: () => void;
    elapsedTime: number; // In seconds
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

export function TrainingProvider({ children }: { children: ReactNode }) {
    const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Timer logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isSessionActive && sessionStartTime) {
            interval = setInterval(() => {
                const now = Date.now();
                setElapsedTime(Math.floor((now - sessionStartTime) / 1000));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isSessionActive, sessionStartTime]);

    const addExercise = (exercise: Exercise) => {
        if (!selectedExercises.find(e => e.id === exercise.id)) {
            setSelectedExercises([...selectedExercises, exercise]);
        }
    };

    const removeExercise = (exerciseId: string) => {
        setSelectedExercises(selectedExercises.filter(e => e.id !== exerciseId));
    };

    const clearTraining = () => {
        setSelectedExercises([]);
        setIsSessionActive(false);
        setSessionStartTime(null);
        setElapsedTime(0);
    };

    const startSession = () => {
        setIsSessionActive(true);
        setSessionStartTime(Date.now());
    };

    const stopSession = () => {
        setIsSessionActive(false);
        // Here we could trigger a save or return the duration
    };

    return (
        <TrainingContext.Provider value={{
            selectedExercises,
            addExercise,
            removeExercise,
            clearTraining,
            isSessionActive,
            sessionStartTime,
            startSession,
            stopSession,
            elapsedTime
        }}>
            {children}
        </TrainingContext.Provider>
    );
}

export function useTraining() {
    const context = useContext(TrainingContext);
    if (context === undefined) {
        throw new Error('useTraining must be used within a TrainingProvider');
    }
    return context;
}
