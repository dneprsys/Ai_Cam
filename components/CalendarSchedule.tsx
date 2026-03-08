"use client";

import React, { useState } from "react";
import { ScheduleRule } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Clock, Calendar, Power, ToggleLeft, ToggleRight } from "lucide-react";

interface CalendarScheduleProps {
  schedule: ScheduleRule[];
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleRule[]>>;
  isAutoMode: boolean;
  setIsAutoMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const DAYS = [
  { value: 0, label: "Воскресенье", short: "Вс" },
  { value: 1, label: "Понедельник", short: "Пн" },
  { value: 2, label: "Вторник", short: "Вт" },
  { value: 3, label: "Среда", short: "Ср" },
  { value: 4, label: "Четверг", short: "Чт" },
  { value: 5, label: "Пятница", short: "Пт" },
  { value: 6, label: "Суббота", short: "Сб" },
];

const CalendarSchedule: React.FC<CalendarScheduleProps> = ({
  schedule,
  setSchedule,
  isAutoMode,
  setIsAutoMode,
}) => {
  const [newRule, setNewRule] = useState({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "18:00",
  });

  const addRule = () => {
    const rule: ScheduleRule = {
      id: Date.now().toString(),
      ...newRule,
      isActive: true,
    };
    setSchedule((prev) => [...prev, rule]);
  };

  const removeRule = (id: string) => {
    setSchedule((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleRule = (id: string) => {
    setSchedule((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  const getDayLabel = (day: number) => {
    return DAYS.find((d) => d.value === day)?.label || "";
  };

  return (
    <div className="space-y-6">
      {/* Auto Mode Toggle */}
      <div className="p-4 bg-secondary rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              isAutoMode ? "bg-primary/20" : "bg-muted"
            )}>
              <Power className={cn("w-5 h-5", isAutoMode ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div>
              <h3 className="font-medium">Автоматический режим</h3>
              <p className="text-sm text-muted-foreground">
                Запись при обнаружении людей по расписанию
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAutoMode(!isAutoMode)}
            className={cn(
              "relative w-14 h-8 rounded-full transition-colors",
              isAutoMode ? "bg-primary" : "bg-muted"
            )}
          >
            <div className={cn(
              "absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform",
              isAutoMode ? "translate-x-7" : "translate-x-1"
            )} />
          </button>
        </div>
      </div>

      {/* Add New Rule */}
      <div className="p-4 bg-secondary rounded-lg space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Добавить правило
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">День недели</label>
            <select
              value={newRule.dayOfWeek}
              onChange={(e) => setNewRule({ ...newRule, dayOfWeek: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {DAYS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">Начало</label>
            <input
              type="time"
              value={newRule.startTime}
              onChange={(e) => setNewRule({ ...newRule, startTime: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">Конец</label>
            <input
              type="time"
              value={newRule.endTime}
              onChange={(e) => setNewRule({ ...newRule, endTime: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <button
          onClick={addRule}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
        >
          <Plus className="w-5 h-5" />
          Добавить
        </button>
      </div>

      {/* Schedule List */}
      <div className="space-y-3">
        <h3 className="font-medium">Расписание</h3>

        {schedule.length === 0 ? (
          <div className="p-8 bg-secondary rounded-lg text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Нет правил расписания</p>
            <p className="text-sm text-muted-foreground">
              Добавьте правило для автоматической записи
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {schedule.map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  "flex items-center justify-between p-4 bg-secondary rounded-lg transition",
                  !rule.isActive && "opacity-50"
                )}
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition",
                      rule.isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {rule.isActive ? (
                      <ToggleRight className="w-5 h-5" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>

                  <div>
                    <p className="font-medium">{getDayLabel(rule.dayOfWeek)}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {rule.startTime} - {rule.endTime}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => removeRule(rule.id)}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Week Overview */}
      <div className="p-4 bg-secondary rounded-lg">
        <h3 className="font-medium mb-4">Обзор недели</h3>
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map((day) => {
            const dayRules = schedule.filter((r) => r.dayOfWeek === day.value && r.isActive);
            const hasRules = dayRules.length > 0;

            return (
              <div
                key={day.value}
                className={cn(
                  "p-2 rounded-lg text-center",
                  hasRules ? "bg-primary/20" : "bg-muted"
                )}
              >
                <span className={cn(
                  "text-xs font-medium",
                  hasRules ? "text-primary" : "text-muted-foreground"
                )}>
                  {day.short}
                </span>
                {hasRules && (
                  <div className="mt-1 w-2 h-2 bg-primary rounded-full mx-auto" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarSchedule;
