
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface FormStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
  isValid?: boolean;
}

interface FormWizardProps {
  steps: FormStep[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
  className?: string;
}

const FormWizard: React.FC<FormWizardProps> = ({
  steps,
  onSubmit,
  onCancel,
  isLoading = false,
  className = ""
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStep || completedSteps.has(stepIndex)) {
      setCurrentStep(stepIndex);
    }
  };

  const handleSubmit = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    onSubmit({});
  };

  const progress = ((currentStep + 1) / steps.length) * 100;
  const currentStepData = steps[currentStep];

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Progress Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Add New Employee</h2>
          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Navigation */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => handleStepClick(index)}
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                  ${index === currentStep 
                    ? 'border-blue-500 bg-blue-500 text-white' 
                    : completedSteps.has(index)
                    ? 'border-green-500 bg-green-500 text-white'
                    : index < currentStep
                    ? 'border-blue-300 bg-blue-100 text-blue-600 cursor-pointer hover:bg-blue-200'
                    : 'border-gray-300 bg-gray-100 text-gray-400'
                  }`}
                disabled={index > currentStep && !completedSteps.has(index)}
              >
                {completedSteps.has(index) ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </button>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 ${
                  index < currentStep || completedSteps.has(index) 
                    ? 'bg-blue-500' 
                    : 'bg-gray-300'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{currentStepData.title}</CardTitle>
          <CardDescription>{currentStepData.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {currentStepData.component}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <div className="flex space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          {currentStep > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
          )}
        </div>

        <div>
          {currentStep < steps.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={currentStepData.isValid === false}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading || currentStepData.isValid === false}
            >
              {isLoading ? 'Adding Employee...' : 'Add Employee'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormWizard;
