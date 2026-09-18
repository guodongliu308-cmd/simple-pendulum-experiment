export interface QuizQuestion {
  id: string;
  question: string;
  hint: string;
  answer: string;
  explanation: string;
}

export interface CelestialEnvironment {
  id: string;
  name: string;
  shortName: string;
  g: number;
  icon: string;
  description: string;
}

