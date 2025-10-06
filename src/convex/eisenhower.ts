import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all Eisenhower tasks
export const getEisenhowerTasks = query({
  args: {
    includeCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let tasks = await ctx.db
      .query("eisenhower")
      .order("desc")
      .collect();

    if (args.includeCompleted === false) {
      tasks = tasks.filter((t) => !t.isCompleted);
    }

    return tasks;
  },
});

// Get tasks by quadrant
export const getTasksByQuadrant = query({
  args: {
    quadrant: v.union(
      v.literal("urgent-important"),
      v.literal("not-urgent-important"),
      v.literal("urgent-not-important"),
      v.literal("not-urgent-not-important")
    ),
    includeCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let tasks = await ctx.db
      .query("eisenhower")
      .withIndex("by_quadrant", (q) => q.eq("quadrant", args.quadrant))
      .collect();

    if (args.includeCompleted === false) {
      tasks = tasks.filter((t) => !t.isCompleted);
    }

    return tasks;
  },
});

// Get all tasks organized by quadrant
export const getTasksMatrix = query({
  args: {
    includeCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let tasks = await ctx.db
      .query("eisenhower")
      .order("desc")
      .collect();

    if (args.includeCompleted === false) {
      tasks = tasks.filter((t) => !t.isCompleted);
    }

    return {
      urgentImportant: tasks.filter((t) => t.quadrant === "urgent-important"),
      notUrgentImportant: tasks.filter((t) => t.quadrant === "not-urgent-important"),
      urgentNotImportant: tasks.filter((t) => t.quadrant === "urgent-not-important"),
      notUrgentNotImportant: tasks.filter((t) => t.quadrant === "not-urgent-not-important"),
    };
  },
});

// Add a new task
export const addTask = mutation({
  args: {
    text: v.string(),
    quadrant: v.union(
      v.literal("urgent-important"),
      v.literal("not-urgent-important"),
      v.literal("urgent-not-important"),
      v.literal("not-urgent-not-important")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const taskId = await ctx.db.insert("eisenhower", {
      text: args.text,
      quadrant: args.quadrant,
      isCompleted: false,
      createdAt: Date.now(),
      notes: args.notes,
    });
    return taskId;
  },
});

// Update a task
export const updateTask = mutation({
  args: {
    id: v.id("eisenhower"),
    text: v.optional(v.string()),
    quadrant: v.optional(v.union(
      v.literal("urgent-important"),
      v.literal("not-urgent-important"),
      v.literal("urgent-not-important"),
      v.literal("not-urgent-not-important")
    )),
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

// Toggle task completion
export const toggleTask = mutation({
  args: {
    id: v.id("eisenhower"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }

    const updates: any = {
      isCompleted: !task.isCompleted,
    };

    if (!task.isCompleted) {
      updates.completedAt = Date.now();
    } else {
      updates.completedAt = undefined;
    }

    await ctx.db.patch(args.id, updates);
  },
});

// Move task to different quadrant
export const moveTask = mutation({
  args: {
    id: v.id("eisenhower"),
    quadrant: v.union(
      v.literal("urgent-important"),
      v.literal("not-urgent-important"),
      v.literal("urgent-not-important"),
      v.literal("not-urgent-not-important")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      quadrant: args.quadrant,
    });
  },
});

// Delete a task
export const deleteTask = mutation({
  args: {
    id: v.id("eisenhower"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Clear all completed tasks
export const clearCompleted = mutation({
  args: {
    quadrant: v.optional(v.union(
      v.literal("urgent-important"),
      v.literal("not-urgent-important"),
      v.literal("urgent-not-important"),
      v.literal("not-urgent-not-important")
    )),
  },
  handler: async (ctx, args) => {
    let completedTasks = await ctx.db
      .query("eisenhower")
      .filter((q) => q.eq(q.field("isCompleted"), true))
      .collect();

    if (args.quadrant) {
      completedTasks = completedTasks.filter((t) => t.quadrant === args.quadrant);
    }

    await Promise.all(
      completedTasks.map((task) => ctx.db.delete(task._id))
    );
  },
});

// Get Eisenhower matrix summary
export const getMatrixSummary = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db
      .query("eisenhower")
      .collect();

    const activeTasks = tasks.filter((t) => !t.isCompleted);

    return {
      urgentImportant: {
        total: activeTasks.filter((t) => t.quadrant === "urgent-important").length,
        completed: tasks.filter((t) => t.quadrant === "urgent-important" && t.isCompleted).length,
      },
      notUrgentImportant: {
        total: activeTasks.filter((t) => t.quadrant === "not-urgent-important").length,
        completed: tasks.filter((t) => t.quadrant === "not-urgent-important" && t.isCompleted).length,
      },
      urgentNotImportant: {
        total: activeTasks.filter((t) => t.quadrant === "urgent-not-important").length,
        completed: tasks.filter((t) => t.quadrant === "urgent-not-important" && t.isCompleted).length,
      },
      notUrgentNotImportant: {
        total: activeTasks.filter((t) => t.quadrant === "not-urgent-not-important").length,
        completed: tasks.filter((t) => t.quadrant === "not-urgent-not-important" && t.isCompleted).length,
      },
      totalActive: activeTasks.length,
      totalCompleted: tasks.filter((t) => t.isCompleted).length,
    };
  },
});

// Get focus recommendations
export const getFocusRecommendations = query({
  args: {},
  handler: async (ctx) => {
    const urgentImportantTasks = await ctx.db
      .query("eisenhower")
      .withIndex("by_quadrant", (q) => q.eq("quadrant", "urgent-important"))
      .filter((q) => q.eq(q.field("isCompleted"), false))
      .collect();

    const notUrgentImportantTasks = await ctx.db
      .query("eisenhower")
      .withIndex("by_quadrant", (q) => q.eq("quadrant", "not-urgent-important"))
      .filter((q) => q.eq(q.field("isCompleted"), false))
      .collect();

    let recommendation = "";
    let priority = "";

    if (urgentImportantTasks.length > 0) {
      recommendation = "Focus on urgent and important tasks first (Do First)";
      priority = "urgent-important";
    } else if (notUrgentImportantTasks.length > 0) {
      recommendation = "Schedule time for important but not urgent tasks";
      priority = "not-urgent-important";
    } else {
      recommendation = "Great job! Consider delegating or eliminating remaining tasks";
      priority = "none";
    }

    return {
      recommendation,
      priority,
      urgentImportantCount: urgentImportantTasks.length,
      notUrgentImportantCount: notUrgentImportantTasks.length,
    };
  },
});
