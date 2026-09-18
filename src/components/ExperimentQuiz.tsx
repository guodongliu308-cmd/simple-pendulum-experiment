import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Lightbulb, CheckCircle, BookOpen } from 'lucide-react';
import type { QuizQuestion } from '../types';

const PENDULUM_QUESTIONS: QuizQuestion[] = [
  {
    id: 'pendulum-1',
    question: '在公园荡秋千时，如果一个体重很重的小朋友和一个很轻的小朋友荡同样长度的秋千，谁荡得更快（周期更短）？',
    hint: '观察理论周期公式 T = 2π√(L/g)，公式里包含物体的质量 m 吗？',
    answer: '两人摆动周期完全一样！',
    explanation:
      '伽利略通过比萨大教堂吊灯晃动的观察发现了单摆的“等时性”：单摆做微幅振动的周期只取决于悬线长度 L 和重力加速度 g，与摆球的质量 m 毫无关系！因此只要秋千绳长相同、重力场相同，轻重不同的人荡秋千的周期是一模一样的。',
  },
  {
    id: 'pendulum-2',
    question: '当单摆摆动到最高点和最低点时，摆球的能量与速度分别具有什么特征？',
    hint: '观察上方动能和势能的动态柱状图在最高点与通过竖直中线时的数值对比。',
    answer: '最高点动能为0、势能最大；最低点势能为0、动能与速度最大。',
    explanation:
      '在最高点时摆球瞬时静止（速度 v = 0），因此动能 Ek = ½mv² = 0，而高度达到最大，重力势能 Ep = mgh 达到峰值；随着摆球向下加速摆动，势能不断转化为动能；当经过最低点（平衡位置）时，高度最低，重力势能为0，全部转化为动能，此时摆球的线速度达到最大值！',
  },
  {
    id: 'pendulum-3',
    question: '如果家里的老式机械摆钟每天走慢了5分钟，我们应该将摆锤下方的调节螺母向上旋（缩短摆长）还是向下旋（增长摆长）？',
    hint: '摆钟“走慢了”说明摆动一次所花费的时间（周期 T）偏大还是偏小？要让 T 变小需要改变 L 吗？',
    answer: '应该向上旋螺母，缩短摆绳有效长度 L。',
    explanation:
      '摆钟走慢说明单摆摆动一次的时间（周期 T）太长了。根据周期公式 T = 2π√(L/g)，周期 T 与摆长 L 的算术平方根成正比。为了让时钟走得快一点，必须减小周期 T，因此必须调小摆长 L。向上旋转螺母会抬高摆锤重心，缩短摆长，从而加快时钟节奏。',
  },
  {
    id: 'pendulum-4',
    question: '如果宇航员把同一个单摆带到月球表面（月球重力加速度约为地球的 1/6），它的周期会如何变化？',
    hint: '在上方实验面板中切换星球环境为“月球”，观察实际摆动与理论周期数值。',
    answer: '周期变长为地球上的约 2.45 倍，摆动明显变慢。',
    explanation:
      '根据单摆周期公式 T = 2π√(L/g)，由于重力加速度 g 在分母位置，月球的 g_月 ≈ g_地 / 6，因此 T_月 = T_地 × √6 ≈ 2.45 × T_地。摆动一个来回需要两倍半的时间，所以在重力微弱的月球上，单摆摆动显得非常轻缓。',
  },
  {
    id: 'pendulum-5',
    question: '“机械能守恒定律”在什么条件下才能严格成立？现实中的单摆为什么最终会慢慢停下来？',
    hint: '摆球在空气中穿行时，除了受重力之外，还会受到什么微弱阻碍？',
    answer: '只有重力（或弹力）做功时才严格守恒。现实中因空气阻力和摩擦阻尼而损失。',
    explanation:
      '机械能守恒的条件是：系统内只有保守力（如重力）做功，没有外力非保守力做功。现实环境中，摆球运动时会受到空气粘滞阻力，悬挂支点也存在极微小的机械摩擦力。这些阻力不断对单摆做负功，将机械能逐渐转化为空气和支点的内能（微热），因而振幅逐渐衰减直至停下。',
  },
];

export const ExperimentQuiz: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string | null>('pendulum-1');

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <section aria-labelledby="quiz-heading" className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700">
            <Lightbulb className="w-4 h-4" />
          </span>
          <div>
            <h2 id="quiz-heading" className="text-sm font-bold text-slate-900">
              单摆与机械能守恒 · 课堂思考与探究题
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              结合上方动手实验与理论公式，点击题目展开探究思路与核心物理原理解答
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-slate-500" />
            共 5 题
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {PENDULUM_QUESTIONS.map((q, index) => {
          const isExpanded = expandedId === q.id;
          return (
            <div
              key={q.id}
              className={`rounded-xl border transition-all duration-150 ${
                isExpanded
                  ? 'bg-slate-50/90 border-blue-300 shadow-xs'
                  : 'bg-white border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <button
                id={`quiz-toggle-${q.id}`}
                onClick={() => toggleExpand(q.id)}
                className="w-full text-left p-3.5 sm:p-4 flex items-start justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-start gap-2.5">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-blue-100/80 text-blue-700 text-xs font-bold shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <p className="text-xs font-semibold text-slate-800 leading-snug">
                    {q.question}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 text-xs flex flex-col gap-2.5">
                  <div className="bg-amber-50/70 border border-amber-200/60 rounded-lg p-2.5 text-amber-900">
                    <span className="font-bold flex items-center gap-1 mb-0.5 text-amber-800 text-[11px]">
                      💡 探究提示：
                    </span>
                    <p className="text-[11px] leading-relaxed text-amber-900/90">{q.hint}</p>
                  </div>

                  <div className="bg-emerald-50/80 border border-emerald-200/60 rounded-lg p-2.5 text-emerald-950">
                    <span className="font-bold flex items-center gap-1 mb-1 text-emerald-800 text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      核心结论与物理原理解析：
                    </span>
                    <p className="font-semibold text-emerald-900 mb-1 text-xs">{q.answer}</p>
                    <p className="text-[11px] leading-relaxed text-emerald-900/80">{q.explanation}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

