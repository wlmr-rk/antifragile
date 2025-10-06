import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all active habits
export const getHabits = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let habits = await ctx.db
      .query("habits")
      .order("desc")
      .collect();

    if (!args.includeInactive) {
      habits = habits.filter((h) => h.isActive);
    }

    return habits;
  },
});

// Get habit with completion statistics
export const getHabitWithStats = query({
  args: {
    habitId: v.id("habits"),
  },
  handler: async (ctx, args) => {
    const habit = await ctx.db.get(args.habitId);
    if (!habit) return null;

    const now = Date.now();
    const todayStart = new Date(now).setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now);
    monthStart.setMonth(monthStart.getMonth() - 1);

    const allCompletions = await ctx.db
      .query("habitCompletions")
      .withIndex("by_habit", (q) => q.eq("habitId", args.habitId))
      .collect();

    const todayCompletions = allCompletions.filter(
      (c) => c.completedAt >= todayStart
    );
    const weekCompletions = allCompletions.filter(
      (c) => c.completedAt >= weekStart.getTime()
    );
    const monthCompletions = allCompletions.filter(
      (c) => c.completedAt >= monthStart.getTime()
    );

    // Calculate current streak
    let streak = 0;
    const sortedCompletions = allCompletions
      .sort((a, b) => b.completedAt - a.completedAt);

    if (sortedCompletions.length > 0) {
      const lastCompletion = new Date(sortedCompletions[0].completedAt);
      const today = new Date(now);

      let currentDate = new Date(today);
      currentDate.setHours(0, 0, 0, 0);

      for (const completion of sortedCompletions) {
        const completionDate = new Date(completion.completedAt);
        completionDate.setHours(0, 0, 0, 0);

        if (completionDate.getTime() === currentDate.getTime()) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else if (completionDate.getTime() < currentDate.getTime()) {
          break;
        }
      }
    }

    return {
      habit,
      stats: {
        total: allCompletions.length,
        today: todayCompletions.length,
        thisWeek: weekCompletions.length,
        thisMonth: monthCompletions.length,
        currentStreak: streak,
      },
    };
  },
});

// Get today's habit progress
export const getTodayProgress = query({
  args: {},
  handler: async (ctx) => {
    const habits = await ctx.db
      .query("habits")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const now = Date.now();
    const todayStart = new Date(now).setHours(0, 0, 0, 0);

    const habitsWithProgress = await Promise.all(
      habits.map(async (habit) => {
        const todayCompletions = await ctx.db
          .query("habitCompletions")
          .withIndex("by_habit", (q) => q.eq("habitId", habit._id))
          .filter((q) => q.gte(q.field("completedAt"), todayStart))
          .collect();

        return {
          ...habit,
          completedToday: todayCompletions.length,
          isComplete: todayCompletions.length >= habit.targetCount,
        };
      })
    );

    return habitsWithProgress;
  },
});

// Create a new habit
export const addHabit = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    color: v.string(),
    icon: v.optional(v.string()),
    frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    targetCount: v.number(),
  },
  handler: async (ctx, args) => {
    const habitId = await ctx.db.insert("habits", {
      name: args.name,
      description: args.description,
      color: args.color,
      icon: args.icon,
      frequency: args.frequency,
      targetCount: args.targetCount,
      createdAt: Date.now(),
      isActive: true,
    });
    return habitId;
  },
});

// Update a habit
export const updateHabit = mutation({
  args: {
    id: v.id("habits"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    frequency: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))),
    targetCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, filteredUpdates);
  },
});

// Toggle habit active status
export const toggleHabitActive = mutation({
  args: {
    id: v.id("habits"),
  },
  handler: async (ctx, args) => {
    const habit = await ctx.db.get(args.id);
    if (!habit) {
      throw new Error("Habit not found");
    }

    await ctx.db.patch(args.id, {
      isActive: !habit.isActive,
    });
  },
});

// Delete a habit (and all its completions)
export const deleteHabit = mutation({
  args: {
    id: v.id("habits"),
  },
  handler: async (ctx, args) => {
    // Delete all completions first
    const completions = await ctx.db
      .query("habitCompletions")
      .withIndex("by_habit", (q) => q.eq("habitId", args.id))
      .collect();

    await Promise.all(
      completions.map((c) => ctx.db.delete(c._id))
    );

    // Delete the habit
    await ctx.db.delete(args.id);
  },
});

// Record a habit completion
export const completeHabit = mutation({
  args: {
    habitId: v.id("habits"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const completionId = await ctx.db.insert("habitCompletions", {
      habitId: args.habitId,
      completedAt: Date.now(),
      note: args.note,
    });
    return completionId;
  },
});

// Undo last habit completion
export const undoHabitCompletion = mutation({
  args: {
    habitId: v.id("habits"),
  },
  handler: async (ctx, args) => {
    const completions = await ctx.db
      .query("habitCompletions")
      .withIndex("by_habit", (q) => q.eq("habitId", args.habitId))
      .order("desc")
      .collect();

    if (completions.length > 0) {
      await ctx.db.delete(completions[0]._id);
    }
  },
});

// Get habit completion history for calendar view
export const getHabitHistory = query({
  args: {
    habitId: v.id("habits"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const completions = await ctx.db
      .query("habitCompletions")
      .withIndex("by_habit_and_date", (q) =>
        q
          .eq("habitId", args.habitId)
          .gte("completedAt", args.startDate)
          .lte("completedAt", args.endDate)
      )
      .collect();

    // Group by date
    const groupedByDate: Record<string, number> = {};
    completions.forEach((completion) => {
      const date = new Date(completion.completedAt);
      const dateKey = date.toISOString().split("T")[0];
      groupedByDate[dateKey] = (groupedByDate[dateKey] || 0) + 1;
    });

    return groupedByDate;
  },
});

// Get overall habits summary
export const getHabitsSummary = query({
  args: {},
  handler: async (ctx) => {
    const habits = await ctx.db
      .query("habits")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const now = Date.now();
    const todayStart = new Date(now).setHours(0, 0, 0, 0);

    let totalCompleted = 0;
    let totalTarget = 0;

    for (const habit of habits) {
      const todayCompletions = await ctx.db
        .query("habitCompletions")
        .withIndex("by_habit", (q) => q.eq("habitId", habit._id))
        .filter((q) => q.gte(q.field("completedAt"), todayStart))
        .collect();

      totalCompleted += Math.min(todayCompletions.length, habit.targetCount);
      totalTarget += habit.targetCount;
    }

    return {
      totalHabits: habits.length,
      totalCompleted,
      totalTarget,
      percentage: totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0,
    };
  },
});
