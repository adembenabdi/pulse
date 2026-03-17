'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, PageHeader, Input, TextArea, Modal, Label, Select, Tabs } from '@/components/ui/primitives';
import { UtensilsCrossed, Plus, Check, Clock, ChefHat, Trash2, Calendar, Coffee, Sun as SunIcon, Moon } from 'lucide-react';
import { getFromStorage, saveToStorage, generateId } from '@/lib/storage';
import type { DayMealPlan, Meal, MealType, WeeklyMealProgram } from '@/types';
import { format, startOfWeek, addDays } from 'date-fns';

const MEAL_ICONS: Record<MealType, React.ReactNode> = {
  breakfast: <Coffee className="w-4 h-4" />,
  lunch: <SunIcon className="w-4 h-4" />,
  dinner: <Moon className="w-4 h-4" />,
  snack: <UtensilsCrossed className="w-4 h-4" />,
};

const MEAL_COLORS: Record<MealType, string> = {
  breakfast: '#FBBF24',
  lunch: '#FB923C',
  dinner: '#8B5CF6',
  snack: '#06B6D4',
};

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Meal suggestions for weekly program
const MEAL_SUGGESTIONS: Record<string, string[]> = {
  Monday: ['Shakshuka', 'Couscous with vegetables', 'Chorba frik'],
  Tuesday: ['Msemen with honey', 'Grilled chicken & rice', 'Lentil soup'],
  Wednesday: ['Omelette & bread', 'Rechta pasta', 'Tajine zitoune'],
  Thursday: ['Pancakes', 'Chakhchoukha', 'Grilled fish & salad'],
  Friday: ['Mahjouba', 'Traditional Couscous', 'Harira soup'],
  Saturday: ['Croissant & coffee', 'Spaghetti bolognese', 'Bourek & salad'],
  Sunday: ['French toast', 'Riz au poulet', 'Shorba with bread'],
};

export default function MealsPage() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const dayName = format(new Date(), 'EEEE');
  const [tab, setTab] = useState('today');

  // Today's plan
  const [dayPlan, setDayPlan] = useState<DayMealPlan | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newMeal, setNewMeal] = useState({ type: 'lunch' as MealType, name: '', ingredients: '', prepTime: 30, notes: '' });

  // Weekly program
  const [weekProgram, setWeekProgram] = useState<WeeklyMealProgram | null>(null);

  useEffect(() => {
    if (!user) return;
    const saved = getFromStorage<DayMealPlan | null>(user.id, `meals:${today}`, null);
    if (saved) {
      setDayPlan(saved);
    } else {
      const plan: DayMealPlan = {
        id: generateId(),
        date: today,
        meals: [],
        preparedMorning: false,
        notes: '',
      };
      setDayPlan(plan);
      saveToStorage(user.id, `meals:${today}`, plan);
    }

    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const wp = getFromStorage<WeeklyMealProgram | null>(user.id, `meals:week:${weekStart}`, null);
    if (wp) {
      setWeekProgram(wp);
    } else {
      // Generate default weekly program
      const defaultProgram: WeeklyMealProgram = {
        id: generateId(),
        weekStart,
        days: {},
      };
      DAY_NAMES.forEach(day => {
        const suggestions = MEAL_SUGGESTIONS[day] || [];
        defaultProgram.days[day] = [
          { id: generateId(), type: 'breakfast', name: suggestions[0] || '', ingredients: [], prepTime: 15, prepared: false },
          { id: generateId(), type: 'lunch', name: suggestions[1] || '', ingredients: [], prepTime: 45, prepared: false },
          { id: generateId(), type: 'dinner', name: suggestions[2] || '', ingredients: [], prepTime: 30, prepared: false },
        ];
      });
      setWeekProgram(defaultProgram);
      saveToStorage(user.id, `meals:week:${weekStart}`, defaultProgram);
    }
  }, [user, today]);

  const addMeal = () => {
    if (!dayPlan || !user || !newMeal.name.trim()) return;
    const meal: Meal = {
      id: generateId(),
      type: newMeal.type,
      name: newMeal.name.trim(),
      ingredients: newMeal.ingredients.split(',').map(s => s.trim()).filter(Boolean),
      prepTime: newMeal.prepTime,
      prepared: false,
    };
    const updated = { ...dayPlan, meals: [...dayPlan.meals, meal] };
    setDayPlan(updated);
    saveToStorage(user.id, `meals:${today}`, updated);
    setShowAdd(false);
    setNewMeal({ type: 'lunch', name: '', ingredients: '', prepTime: 30, notes: '' });
  };

  const toggleMealPrepared = (mealId: string) => {
    if (!dayPlan || !user) return;
    const updated = {
      ...dayPlan,
      meals: dayPlan.meals.map(m => m.id === mealId ? { ...m, prepared: !m.prepared } : m),
    };
    setDayPlan(updated);
    saveToStorage(user.id, `meals:${today}`, updated);
  };

  const removeMeal = (mealId: string) => {
    if (!dayPlan || !user) return;
    const updated = { ...dayPlan, meals: dayPlan.meals.filter(m => m.id !== mealId) };
    setDayPlan(updated);
    saveToStorage(user.id, `meals:${today}`, updated);
  };

  const toggleMorningPrep = () => {
    if (!dayPlan || !user) return;
    const updated = { ...dayPlan, preparedMorning: !dayPlan.preparedMorning };
    setDayPlan(updated);
    saveToStorage(user.id, `meals:${today}`, updated);
  };

  const updateWeekMeal = (day: string, mealIdx: number, name: string) => {
    if (!weekProgram || !user) return;
    const updated = { ...weekProgram };
    if (updated.days[day] && updated.days[day][mealIdx]) {
      updated.days[day][mealIdx] = { ...updated.days[day][mealIdx], name };
    }
    setWeekProgram(updated);
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    saveToStorage(user.id, `meals:week:${weekStart}`, updated);
  };

  if (!user || !dayPlan) return null;

  const preparedCount = dayPlan.meals.filter(m => m.prepared).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meal Preparation"
        description="Plan and prepare your meals"
        icon={<UtensilsCrossed className="w-5 h-5" />}
      >
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Meal</Button>
      </PageHeader>

      <Tabs
        tabs={[
          { id: 'today', label: 'Today', icon: <ChefHat className="w-4 h-4" /> },
          { id: 'week', label: 'Weekly Program', icon: <Calendar className="w-4 h-4" /> },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'today' && (
        <>
          {/* Morning prep status */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card
              variant="interactive"
              depth
              className={`p-5 cursor-pointer ${dayPlan.preparedMorning ? 'opacity-70' : ''}`}
              onClick={toggleMorningPrep}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    dayPlan.preparedMorning
                      ? 'bg-[var(--success)]/20 text-[var(--success)]'
                      : 'bg-[var(--warning)]/15 text-[var(--warning)]'
                  }`}>
                    <ChefHat className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--foreground)]">Morning Preparation</p>
                    <p className="text-sm text-[var(--foreground-muted)]">
                      {dayPlan.preparedMorning
                        ? '✅ Meals prepared for today!'
                        : 'Prepare your meals for lunch and dinner'}
                    </p>
                  </div>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  dayPlan.preparedMorning ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-[var(--background-surface)]'
                }`}>
                  <Check className="w-4 h-4" />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Today's suggestions from weekly program */}
          {weekProgram?.days[dayName] && (
            <Card variant="glass" className="p-4">
              <p className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mb-2">
                Today&apos;s Suggestion ({dayName})
              </p>
              <div className="flex flex-wrap gap-2">
                {weekProgram.days[dayName].map(meal => (
                  <Badge key={meal.id} variant="primary">{meal.name || 'Not set'}</Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Meals list */}
          <div className="space-y-3">
            {dayPlan.meals.length === 0 ? (
              <Card className="p-8 text-center">
                <UtensilsCrossed className="w-8 h-8 text-[var(--foreground-muted)]/30 mx-auto mb-3" />
                <p className="text-sm text-[var(--foreground-muted)]">No meals planned yet. Add one!</p>
              </Card>
            ) : (
              dayPlan.meals.map((meal, i) => (
                <motion.div key={meal.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card variant="interactive" depth className={`p-4 ${meal.prepared ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: `${MEAL_COLORS[meal.type]}15`, color: MEAL_COLORS[meal.type] }}
                        >
                          {MEAL_ICONS[meal.type]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold text-[var(--foreground)] ${meal.prepared ? 'line-through' : ''}`}>{meal.name}</p>
                            <Badge variant="outline">{meal.type}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
                            <Clock className="w-3 h-3" /> {meal.prepTime} min
                            {meal.ingredients.length > 0 && <span>• {meal.ingredients.length} ingredients</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => toggleMealPrepared(meal.id)}>
                          <Check className={`w-4 h-4 ${meal.prepared ? 'text-[var(--success)]' : ''}`} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => removeMeal(meal.id)}>
                          <Trash2 className="w-4 h-4 text-[var(--danger)]" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </>
      )}

      {tab === 'week' && weekProgram && (
        <div className="space-y-3">
          {DAY_NAMES.map((day, i) => (
            <motion.div key={day} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card variant={day === dayName ? 'elevated' : 'default'} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={day === dayName ? 'primary' : 'outline'}>{day}</Badge>
                  {day === dayName && <Badge variant="success">Today</Badge>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(weekProgram.days[day] || []).map((meal, mIdx) => (
                    <div key={meal.id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${MEAL_COLORS[meal.type]}15`, color: MEAL_COLORS[meal.type] }}>
                        {MEAL_ICONS[meal.type]}
                      </div>
                      <Input
                        value={meal.name}
                        onChange={e => updateWeekMeal(day, mIdx, e.target.value)}
                        placeholder={`${meal.type}...`}
                        className="text-xs h-7"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Meal Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Meal" description="Plan a meal for today">
        <div className="space-y-4">
          <div>
            <Label>Meal Type</Label>
            <Select value={newMeal.type} onChange={e => setNewMeal(m => ({ ...m, type: e.target.value as MealType }))}>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </Select>
          </div>
          <div>
            <Label>Meal Name</Label>
            <Input placeholder="e.g. Couscous with vegetables" value={newMeal.name} onChange={e => setNewMeal(m => ({ ...m, name: e.target.value }))} />
          </div>
          <div>
            <Label>Ingredients (comma separated)</Label>
            <TextArea placeholder="chicken, vegetables, spices..." value={newMeal.ingredients} onChange={e => setNewMeal(m => ({ ...m, ingredients: e.target.value }))} rows={2} />
          </div>
          <div>
            <Label>Prep Time (minutes)</Label>
            <Input type="number" value={newMeal.prepTime} onChange={e => setNewMeal(m => ({ ...m, prepTime: parseInt(e.target.value) || 0 }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addMeal} disabled={!newMeal.name.trim()}>Add Meal</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
