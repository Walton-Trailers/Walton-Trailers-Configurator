interface ProgressBarProps {
  currentStep: number;
}

export default function ProgressBar({ currentStep }: ProgressBarProps) {
  const steps = [
    { number: 1, label: "Category" },
    { number: 2, label: "Model" },
    { number: 3, label: "Customize" },
    { number: 4, label: "Summary" }
  ];

  return (
    <div className="hidden md:flex items-center space-x-8">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex items-center space-x-2">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-300 ${
                step.number <= currentStep 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step.number}
            </div>
            <span 
              className={`text-sm transition-colors duration-300 ${
                step.number <= currentStep 
                  ? 'text-foreground' 
                  : 'text-muted-foreground'
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div 
              className={`w-12 h-0.5 ml-2 transition-colors duration-300 ${
                step.number < currentStep 
                  ? 'bg-primary' 
                  : 'bg-muted'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
