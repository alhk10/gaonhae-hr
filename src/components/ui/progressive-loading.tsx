
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { LoadingStage } from '@/hooks/useProgressiveLoading';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';

interface ProgressiveLoadingProps {
  stages: LoadingStage[];
  currentStage: string;
  progress: number;
  title?: string;
}

export const ProgressiveLoading: React.FC<ProgressiveLoadingProps> = ({
  stages,
  currentStage,
  progress,
  title = 'Loading...'
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden bg-white shadow-sm mb-4">
            <img 
              src="/lovable-uploads/fbbeccdc-3802-4172-9a2a-8e1b0f83829d.png" 
              alt="Gaonhae Taekwondo Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>

        <div className="space-y-4">
          <Progress value={progress} className="w-full" />
          
          <div className="space-y-2">
            {stages.map((stage) => (
              <div key={stage.id} className="flex items-center space-x-3">
                {stage.error ? (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                ) : stage.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : stage.id === currentStage ? (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300" />
                )}
                
                <span className={`text-sm ${
                  stage.error ? 'text-red-600' : 
                  stage.completed ? 'text-green-600' : 
                  stage.id === currentStage ? 'text-blue-600 font-medium' : 
                  'text-gray-500'
                }`}>
                  {stage.label}
                  {stage.error && ` - ${stage.error}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
