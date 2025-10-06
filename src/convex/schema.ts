import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Todos with enhanced features
  todos: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
    createdAt: v.number(),
    dueDate: v.optional(v.number()), // Unix timestamp for due date
    isDaily: v.optional(v.boolean()), // Daily recurring task
    lastCompletedAt: v.optional(v.number()), // Track last completion for daily tasks
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    category: v.optional(v.string()),
    parentId: v.optional(v.id("todos")), // For subtasks (up to 2 levels)
    level: v.optional(v.number()), // 0 = parent, 1 = subtask, 2 = sub-subtask
  })
    .index("by_created_at", ["createdAt"])
    .index("by_due_date", ["dueDate"])
    .index("by_is_daily", ["isDaily"])
    .index("by_parent", ["parentId"]),

  // Habits tracker
  habits: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    color: v.string(), // Hex color for visual distinction
    icon: v.optional(v.string()), // Emoji or icon identifier
    frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    targetCount: v.number(), // How many times per frequency period
    createdAt: v.number(),
    isActive: v.boolean(),
  }).index("by_created_at", ["createdAt"]),

  // Habit completions (separate for tracking history)
  habitCompletions: defineTable({
    habitId: v.id("habits"),
    completedAt: v.number(),
    note: v.optional(v.string()),
  })
    .index("by_habit", ["habitId"])
    .index("by_completed_at", ["completedAt"])
    .index("by_habit_and_date", ["habitId", "completedAt"]),

  // Countdown timers
  countdowns: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    targetDate: v.number(), // Unix timestamp
    color: v.string(),
    icon: v.optional(v.string()),
    createdAt: v.number(),
    isArchived: v.boolean(),
  })
    .index("by_target_date", ["targetDate"])
    .index("by_created_at", ["createdAt"]),

  // Eisenhower Matrix tasks
  eisenhower: defineTable({
    text: v.string(),
    quadrant: v.union(
      v.literal("urgent-important"), // Do First
      v.literal("not-urgent-important"), // Schedule
      v.literal("urgent-not-important"), // Delegate
      v.literal("not-urgent-not-important") // Eliminate
    ),
    isCompleted: v.boolean(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_quadrant", ["quadrant"])
    .index("by_created_at", ["createdAt"]),

  // Calisthenics workouts
  workouts: defineTable({
    name: v.string(),
    date: v.number(), // Unix timestamp
    duration: v.number(), // Minutes
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_date", ["date"]),

  // Workout exercises (related to workouts)
  exercises: defineTable({
    workoutId: v.id("workouts"),
    exerciseName: v.string(), // e.g., "Push-ups", "Pull-ups", "Squats"
    sets: v.number(),
    reps: v.number(),
    restSeconds: v.optional(v.number()),
    notes: v.optional(v.string()),
    order: v.number(), // Order in the workout
  })
    .index("by_workout", ["workoutId"])
    .index("by_workout_order", ["workoutId", "order"]),

  // Running tracker
  runs: defineTable({
    date: v.number(), // Unix timestamp
    distance: v.number(), // Kilometers
    duration: v.number(), // Minutes
    pace: v.number(), // Minutes per kilometer (calculated)
    route: v.optional(v.string()),
    notes: v.optional(v.string()),
    feeling: v.optional(v.union(
      v.literal("excellent"),
      v.literal("good"),
      v.literal("okay"),
      v.literal("tough"),
      v.literal("struggled")
    )),
    weather: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_created_at", ["createdAt"]),

  // User preferences and settings
  userSettings: defineTable({
    userId: v.string(), // For future auth integration
    theme: v.optional(v.union(v.literal("dark"), v.literal("light"))),
    defaultView: v.optional(v.string()),
    notifications: v.optional(v.boolean()),
    weekStartsOn: v.optional(v.union(
      v.literal("sunday"),
      v.literal("monday")
    )),
    units: v.optional(v.union(v.literal("metric"), v.literal("imperial"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
