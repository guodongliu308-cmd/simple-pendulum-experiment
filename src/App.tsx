import React, { useState } from 'react';
import { Header } from './components/Header';
import { PendulumExperiment } from './components/PendulumExperiment';
import { ExperimentQuiz } from './components/ExperimentQuiz';

export default function App() {
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);

  return (
    <div
      className={`min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900 ${
        isPresentationMode ? 'text-[17px]' : 'text-sm'
      }`}
    >
      {/* Top Application Header */}
      <Header
        isPresentationMode={isPresentationMode}
        setIsPresentationMode={setIsPresentationMode}
      />

      {/* Main Single-Topic Teaching Tool Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dedicated Pendulum & Conservation of Mechanical Energy Experiment */}
        <PendulumExperiment />

        {/* Inquiry and Thinking Quiz for Students */}
        <ExperimentQuiz />
      </main>

      {/* Educational Platform Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>单摆与机械能守恒 · 科学互动电子教具 · 纯前端离线级极速运行</span>
          </div>
          <div>
            覆盖教育部《义务教育物理与科学课程标准》核心知识要点 · 适配触控白板与平板大屏教学
          </div>
        </div>
      </footer>
    </div>
  );
}
