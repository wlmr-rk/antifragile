import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all workouts
export const getWorkouts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("workouts").order("desc");

    let workouts = await query.collect();

    if (args.limit) {
      workouts = workouts.slice(0, args.limit);
    }

    return workouts;
  },
});

// Get workout with exercises
export const getWorkoutWithExercises = query({
  args: {
    workoutId: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.workoutId);
    if (!workout) return null;

    const exercises = await ctx.db
      .query("exercises")
      .withIndex("by_workout_order", (q) => q.eq("workoutId", args.workoutId))
      .collect();

    return {
      ...workout,
      exercises: exercises.sort((a, b) => a.order - b.order),
    };
  },
});

// Get recent workouts with exercises
export const getRecentWorkouts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const workouts = await ctx.db
      .query("workouts")
      .order("desc")
      .collect();

    const limited = args.limit ? workouts.slice(0, args.limit) : workouts;

    const workoutsWithExercises = await Promise.all(
      limited.map(async (workout) => {
        const exercises = await ctx.db
          .query("exercises")
          .withIndex("by_workout_order", (q) => q.eq("workoutId", workout._id))
          .collect();

        return {
          ...workout,
          exercises: exercises.sort((a, b) => a.order - b.order),
        };
      })
    );

    return workoutsWithExercises;
  },
});

// Get workout statistics
export const getWorkoutStats = query({
  args: {},
  handler: async (ctx) => {
    const workouts = await ctx.db.query("workouts").collect();

    if (workouts.length === 0) {
      return {
        totalWorkouts: 0,
        totalDuration: 0,
        averageDuration: 0,
        thisWeek: 0,
        thisMonth: 0,
      };
    }

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const totalDuration = workouts.reduce((sum, w) => sum + w.duration, 0);
    const thisWeek = workouts.filter((w) => w.date >= weekAgo).length;
    const thisMonth = workouts.filter((w) => w.date >= monthAgo).length;

    return {
      totalWorkouts: workouts.length,
      totalDuration,
      averageDuration: Math.round(totalDuration / workouts.length),
      thisWeek,
      thisMonth,
    };
  },
});

// Get exercise statistics
export const getExerciseStats = query({
  args: {
    exerciseName: v.string(),
  },
  handler: async (ctx, args) => {
    const allExercises = await ctx.db
      .query("exercises")
      .collect();

    const exercises = allExercises.filter(
      (e) => e.exerciseName.toLowerCase() === args.exerciseName.toLowerCase()
    );

    if (exercises.length === 0) {
      return {
        totalSessions: 0,
        totalSets: 0,
        totalReps: 0,
        maxReps: 0,
        averageReps: 0,
        personalBest: null,
      };
    }

    const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);
    const totalReps = exercises.reduce((sum, e) => sum + (e.sets * e.reps), 0);
    const maxReps = Math.max(...exercises.map((e) => e.reps));
    const averageReps = Math.round(totalReps / exercises.length);

    // Get personal best (highest reps in a single set)
    const personalBest = exercises.reduce((best, current) => {
      if (!best || current.reps > best.reps) {
        return current;
      }
      return best;
    }, exercises[0]);

    return {
      totalSessions: exercises.length,
      totalSets,
      totalReps,
      maxReps,
      averageReps,
      personalBest,
    };
  },
});

// Create a new workout
export const addWorkout = mutation({
  args: {
    name: v.string(),
    date: v.number(),
    duration: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workoutId = await ctx.db.insert("workouts", {
      name: args.name,
      date: args.date,
      duration: args.duration,
      notes: args.notes,
      createdAt: Date.now(),
    });
    return workoutId;
  },
});

// Add exercise to workout
export const addExercise = mutation({
  args: {
    workoutId: v.id("workouts"),
    exerciseName: v.string(),
    sets: v.number(),
    reps: v.number(),
    restSeconds: v.optional(v.number()),
    notes: v.optional(v.string()),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const exerciseId = await ctx.db.insert("exercises", {
      workoutId: args.workoutId,
      exerciseName: args.exerciseName,
      sets: args.sets,
      reps: args.reps,
      restSeconds: args.restSeconds,
      notes: args.notes,
      order: args.order,
    });
    return exerciseId;
  },
});

// Update workout
export const updateWorkout = mutation({
  args: {
    id: v.id("workouts"),
    name: v.optional(v.string()),
    date: v.optional(v.number()),
    duration: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, filteredUpdates);
  },
});

// Update exercise
export const updateExercise = mutation({
  args: {
    id: v.id("exercises"),
    exerciseName: v.optional(v.string()),
    sets: v.optional(v.number()),
    reps: v.optional(v.number()),
    restSeconds: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, filteredUpdates);
  },
});

// Delete workout (and all its exercises)
export const deleteWorkout = mutation({
  args: {
    id: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    // Delete all exercises first
    const exercises = await ctx.db
      .query("exercises")
      .withIndex("by_workout", (q) => q.eq("workoutId", args.id))
      .collect();

    await Promise.all(exercises.map((e) => ctx.db.delete(e._id)));

    // Delete the workout
    await ctx.db.delete(args.id);
  },
});

// Delete exercise
export const deleteExercise = mutation({
  args: {
    id: v.id("exercises"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Get workout calendar (for monthly view)
export const getWorkoutCalendar = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const workouts = await ctx.db
      .query("workouts")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate)
        )
      )
      .collect();

    // Group by date
    const groupedByDate: Record<string, any[]> = {};
    workouts.forEach((workout) => {
      const date = new Date(workout.date);
      const dateKey = date.toISOString().split("T")[0];
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(workout);
    });

    return groupedByDate;
  },
});

// Get suggested exercises (common calisthenics)
export const getSuggestedExercises = query({
  args: {},
  handler: async () => {
    return [
      { name: "Push-ups", category: "Push", difficulty: "beginner" },
      { name: "Pull-ups", category: "Pull", difficulty: "intermediate" },
      { name: "Squats", category: "Legs", difficulty: "beginner" },
      { name: "Dips", category: "Push", difficulty: "intermediate" },
      { name: "Lunges", category: "Legs", difficulty: "beginner" },
      { name: "Plank", category: "Core", difficulty: "beginner" },
      { name: "Burpees", category: "Full Body", difficulty: "intermediate" },
      { name: "Mountain Climbers", category: "Core", difficulty: "beginner" },
      { name: "Jumping Jacks", category: "Cardio", difficulty: "beginner" },
      { name: "Leg Raises", category: "Core", difficulty: "intermediate" },
      { name: "Handstand Push-ups", category: "Push", difficulty: "advanced" },
      { name: "Pistol Squats", category: "Legs", difficulty: "advanced" },
      { name: "L-Sit", category: "Core", difficulty: "advanced" },
      { name: "Muscle-ups", category: "Pull", difficulty: "advanced" },
      { name: "Diamond Push-ups", category: "Push", difficulty: "intermediate" },
      { name: "Wide Grip Pull-ups", category: "Pull", difficulty: "intermediate" },
      { name: "Jump Squats", category: "Legs", difficulty: "intermediate" },
      { name: "Side Plank", category: "Core", difficulty: "beginner" },
      { name: "Bicycle Crunches", category: "Core", difficulty: "beginner" },
      { name: "Box Jumps", category: "Legs", difficulty: "intermediate" },
    ];
  },
});

// Get workout streak
export const getWorkoutStreak = query({
  args: {},
  handler: async (ctx) => {
    const workouts = await ctx.db
      .query("workouts")
      .order("desc")
      .collect();

    if (workouts.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Calculate current streak (consecutive days with workouts)
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const workoutDates = new Set(
      workouts.map((w) => {
        const date = new Date(w.date);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
    );

    // Check current streak
    let currentDate = new Date(today);
    while (workoutDates.has(currentDate.getTime())) {
      currentStreak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // Calculate longest streak
    const sortedDates = Array.from(workoutDates).sort((a, b) => b - a);
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0 || sortedDates[i - 1] - sortedDates[i] === 86400000) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    return { currentStreak, longestStreak };
  },
});
