import React, { useMemo } from 'react';
import { Award, TrendingUp, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../utils/formatters';

interface GraduationSuggestionsProps {
  students: any[];
  checkIns: any[];
  belts: any[];
}

export const GraduationSuggestions = ({ students, checkIns, belts }: GraduationSuggestionsProps) => {
  const suggestions = useMemo(() => {
    const activeStudents = students.filter(s => s.status === 'Active');
    
    return activeStudents.map(student => {
      const studentCheckIns = checkIns.filter(c => c.studentId === student.id);
      const attendanceCount = studentCheckIns.length;
      
      // Calculate time in current rank (using joinDate if lastGraduation is missing)
      const startTimestamp = student.lastGraduationDate || student.joinDate;
      if (!startTimestamp?.seconds) return null;
      
      const startDate = new Date(startTimestamp.seconds * 1000);
      const monthsInRank = (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      
      let progress = 0;
      let reason = "";
      let type: 'belt' | 'stripe' = 'stripe';

      // Simple logic for stripes (every 3 months + 25 classes)
      if (student.stripes < 4) {
        const stripeProgress = Math.min(100, (attendanceCount % 25) * 4);
        const timeProgress = Math.min(100, (monthsInRank % 3) * 33);
        progress = (stripeProgress + timeProgress) / 2;
        reason = `${attendanceCount} aulas, ${Math.floor(monthsInRank)} meses`;
        type = 'stripe';
      } else {
        // Belt promotion logic (example)
        const beltCriteria: any = {
          'Branca': { months: 12, classes: 100 },
          'Azul': { months: 24, classes: 200 },
          'Roxa': { months: 18, classes: 150 },
          'Marrom': { months: 12, classes: 100 },
        };

        const criteria = beltCriteria[student.belt];
        if (criteria) {
          const classProgress = Math.min(100, (attendanceCount / criteria.classes) * 100);
          const timeProgress = Math.min(100, (monthsInRank / criteria.months) * 100);
          progress = (classProgress + timeProgress) / 2;
          reason = `${attendanceCount}/${criteria.classes} aulas, ${Math.floor(monthsInRank)}/${criteria.months} meses`;
          type = 'belt';
        }
      }

      return {
        ...student,
        progress: Math.round(progress),
        reason,
        type,
        startDate
      };
    })
    .filter(s => s !== null && s.progress >= 80) // Only show those close to promotion
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5);
  }, [students, checkIns]);

  if (suggestions.length === 0) return null;

  return (
    <div className="premium-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-100 dark:bg-white/5 rounded-xl">
            <Award className="w-4 h-4 text-zinc-900 dark:text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">Pronto para Graduação</h3>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none">Análise automatizada</p>
          </div>
        </div>
        <TrendingUp className="w-4 h-4 text-emerald-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suggestions.map(student => (
          <div key={`suggest-${student.id}`} className="group p-4 bg-zinc-50 dark:bg-white/2 rounded-2xl transition-all border border-transparent hover:border-zinc-200 dark:hover:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-[10px] font-bold text-zinc-400">
                  {student.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{student.name}</p>
                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight">
                    {student.belt} • {student.stripes} Graus
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={cn(
                  "px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase",
                  student.progress >= 100 ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                )}>
                  {student.progress}%
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-1000",
                    student.progress >= 100 ? "bg-emerald-500" : "bg-zinc-900 dark:bg-white"
                  )}
                  style={{ width: `${Math.min(100, student.progress)}%` }}
                />
              </div>
              <p className="text-[9px] text-zinc-400 font-medium">
                {student.type === 'belt' ? 'Meta de Faixa' : 'Meta de Grau'}: {student.reason}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <button className="w-full py-3 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-white text-xs font-bold rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 transition-all border border-zinc-200 dark:border-white/5 active:scale-[0.98]">
        Ver Relatório Detalhado
      </button>
    </div>
  );
};
