import React from 'react';
import { Activity, GraduationCap, Monitor, Sparkles, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  isPresentationMode: boolean;
  setIsPresentationMode: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isPresentationMode,
  setIsPresentationMode,
}) => {
  return (
    <header className="w-full bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand & Badge */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  单摆与机械能守恒 · 科学互动教具
                </h1>
                <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  物理教具
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                教育部课标要点 · 动能与势能守恒 · 伽利略周期规律验证
              </p>
            </div>
          </div>
        </div>

        {/* Feature Badges & Big Screen Toggle */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 text-[11px]">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              T = 2π√(L/g)
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 text-[11px]">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              E_总 = E_k + E_p
            </span>
          </div>

          {/* Presentation Mode Button */}
          <button
            id="toggle-presentation-btn"
            onClick={() => setIsPresentationMode(prev => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
              isPresentationMode
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="切换课堂大屏教学演示模式"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>{isPresentationMode ? '课堂大屏模式: 开启' : '大屏授课模式'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

