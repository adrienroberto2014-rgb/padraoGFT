import { useState, useCallback } from 'react';
import { subMinutes, isWithinInterval } from 'date-fns';
import { useCheckIn } from './useCheckIn';
import toast from 'react-hot-toast';

export const useTabletCheckIn = (classes: any[], students: any[]) => {
  const { registerCheckIn } = useCheckIn(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const getTodayPortuguese = useCallback(() => {
    const daysMap: { [key: string]: string } = {
      '0': 'Domingo',
      '1': 'Segunda',
      '2': 'Terça',
      '3': 'Quarta',
      '4': 'Quinta',
      '5': 'Sexta',
      '6': 'Sábado'
    };
    return daysMap[new Date().getDay().toString()];
  }, []);

  const findOverlappingClasses = useCallback((student: any) => {
    const now = new Date();
    const todayPortuguese = getTodayPortuguese();

    return classes.filter((cls: any) => {
      // Basic day check
      const dayMatch = cls.dayOfWeek === todayPortuguese || (cls.daysOfWeek && cls.daysOfWeek.includes(todayPortuguese));
      if (!dayMatch) return false;
      
      let start: Date;
      let end: Date;

      if (typeof cls.startTime === 'string' && typeof cls.endTime === 'string') {
        const [startH, startM] = cls.startTime.split(':').map(Number);
        const [endH, endM] = cls.endTime.split(':').map(Number);
        start = new Date(now);
        start.setHours(startH, startM, 0, 0);
        end = new Date(now);
        end.setHours(endH, endM, 0, 0);
      } else if (cls.startTime && cls.endTime) {
        start = cls.startTime.toDate ? cls.startTime.toDate() : new Date(cls.startTime);
        end = cls.endTime.toDate ? cls.endTime.toDate() : new Date(cls.endTime);
      } else {
        return false;
      }

      const bufferStart = subMinutes(start, cls.checkInOffset || 30);
      const bufferEnd = end;
      return isWithinInterval(now, { start: bufferStart, end: bufferEnd });
    });
  }, [classes, getTodayPortuguese]);

  const processCheckIn = async (student: any, targetClasses: any[], fromGympass: boolean = false) => {
    setIsCheckingIn(true);
    try {
      let successCount = 0;
      let alreadyPresentCount = 0;
      let incompatibleCount = 0;

      for (const targetClass of targetClasses) {
        // Validation: Category & Modality Compatibility
        const classCategories = targetClass.categories || [];
        if (classCategories.length > 0 && student.category && !classCategories.includes(student.category)) {
          incompatibleCount++;
          continue;
        }

        const studentModalities = student.modalities || ['Jiu-Jitsu'];
        const classModality = targetClass.modality || 'Jiu-Jitsu';
        if (!studentModalities.includes(classModality)) {
          incompatibleCount++;
          continue;
        }

        const currentPresence = targetClass.presence || [];
        if (currentPresence.includes(student.id)) {
          alreadyPresentCount++;
        } else {
          await registerCheckIn({
            studentId: student.id,
            studentName: student.name,
            classId: targetClass.id,
            className: targetClass.name || targetClass.title || 'Aula',
            modality: targetClass.modality || 'Jiu-Jitsu',
            source: 'tablet',
            isGympass: fromGympass
          }, targetClass);

          if (fromGympass && student.gympassId) {
            try {
              await fetch('/api/gympass/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gympassId: student.gympassId, classId: targetClass.id })
              });
            } catch (err) {
              console.error("Failed to notify Gympass:", err);
            }
          }
          successCount++;
        }
      }

      return { successCount, alreadyPresentCount, incompatibleCount };
    } catch (error) {
      console.error("Check-in processing error:", error);
      throw error;
    } finally {
      setIsCheckingIn(false);
    }
  };

  const validateGympassToken = async (token: string) => {
    const response = await fetch('/api/gympass/validate-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erro ao validar token Wellhub.");
    return data;
  };

  const validateGympassById = async (gympassId: string) => {
    const response = await fetch('/api/gympass/validate-by-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gympassId })
    });
    const data = await response.json();
    return data;
  };

  return {
    isCheckingIn,
    getTodayPortuguese,
    findOverlappingClasses,
    processCheckIn,
    validateGympassToken,
    validateGympassById
  };
};
