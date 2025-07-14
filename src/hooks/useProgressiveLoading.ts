
import { useState, useCallback } from 'react';

export interface LoadingStage {
  id: string;
  label: string;
  completed: boolean;
  error?: string;
}

export const useProgressiveLoading = (stages: { id: string; label: string }[]) => {
  const [loadingStages, setLoadingStages] = useState<LoadingStage[]>(
    stages.map(stage => ({ ...stage, completed: false }))
  );
  const [currentStage, setCurrentStage] = useState<string>(stages[0]?.id || '');
  const [isLoading, setIsLoading] = useState(false);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setCurrentStage(stages[0]?.id || '');
    setLoadingStages(stages.map(stage => ({ ...stage, completed: false, error: undefined })));
  }, [stages]);

  const completeStage = useCallback((stageId: string) => {
    setLoadingStages(prev =>
      prev.map(stage =>
        stage.id === stageId ? { ...stage, completed: true } : stage
      )
    );
    
    // Move to next stage
    const currentIndex = stages.findIndex(stage => stage.id === stageId);
    const nextStage = stages[currentIndex + 1];
    if (nextStage) {
      setCurrentStage(nextStage.id);
    } else {
      setIsLoading(false);
    }
  }, [stages]);

  const setStageError = useCallback((stageId: string, error: string) => {
    setLoadingStages(prev =>
      prev.map(stage =>
        stage.id === stageId ? { ...stage, error } : stage
      )
    );
    setIsLoading(false);
  }, []);

  const progress = loadingStages.filter(stage => stage.completed).length / loadingStages.length * 100;

  return {
    loadingStages,
    currentStage,
    isLoading,
    progress,
    startLoading,
    completeStage,
    setStageError
  };
};
