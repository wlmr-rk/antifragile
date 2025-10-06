import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all todos with enhanced filtering
export const getTodos = query({
  args: {
    includeCompleted: v.optional(v.boolean()),
    filterDaily: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let todos = await ctx.db
      .query("todos")
      .order("desc")
      .collect();

    // Only get parent-level todos (level 0 or undefined)
    todos = todos.filter((todo) => !todo.parentId);

    // Reset daily tasks if needed
    todos = todos.map((todo) => {
      if (todo.isDaily && todo.isCompleted && todo.lastCompletedAt) {
        const lastCompleted = new Date(todo.lastCompletedAt);
        const today = new Date(now);

        // Check if it's a new day
        if (lastCompleted.getDate() !== today.getDate() ||
          lastCompleted.getMonth() !== today.getMonth() ||
          lastCompleted.getFullYear() !== today.getFullYear()) {
          return { ...todo, isCompleted: false };
        }
      }
      return todo;
    });

    // Apply filters
    if (args.includeCompleted === false) {
      todos = todos.filter((todo) => !todo.isCompleted);
    }

    if (args.filterDaily !== undefined) {
      todos = todos.filter((todo) => todo.isDaily === args.filterDaily);
    }

    return todos;
  },
});

// Get todos by priority
export const getTodosByPriority = query({
  args: {},
  handler: async (ctx) => {
    const todos = await ctx.db
      .query("todos")
      .filter((q) => q.eq(q.field("isCompleted"), false))
      .collect();

    return {
      high: todos.filter((t) => t.priority === "high"),
      medium: todos.filter((t) => t.priority === "medium"),
      low: todos.filter((t) => t.priority === "low"),
      none: todos.filter((t) => !t.priority),
    };
  },
});

// Get overdue todos
export const getOverdueTodos = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const todos = await ctx.db
      .query("todos")
      .filter((q) => q.eq(q.field("isCompleted"), false))
      .collect();

    return todos.filter((todo) => todo.dueDate && todo.dueDate < now);
  },
});

// Add a new todo
export const addTodo = mutation({
  args: {
    text: v.string(),
    dueDate: v.optional(v.number()),
    isDaily: v.optional(v.boolean()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    category: v.optional(v.string()),
    parentId: v.optional(v.id("todos")),
  },
  handler: async (ctx, args) => {
    let level = 0;
    
    // Determine level based on parent
    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent) {
        throw new Error("Parent todo not found");
      }
      level = (parent.level || 0) + 1;
      
      // Limit to 2 levels (0, 1, 2)
      if (level > 2) {
        throw new Error("Maximum subtask depth reached");
      }
    }
    
    const todoId = await ctx.db.insert("todos", {
      text: args.text,
      isCompleted: false,
      createdAt: Date.now(),
      dueDate: args.dueDate,
      isDaily: args.isDaily,
      priority: args.priority,
      category: args.category,
      parentId: args.parentId,
      level,
    });
    return todoId;
  },
});

// Get subtasks for a todo
export const getSubtasks = query({
  args: {
    parentId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const subtasks = await ctx.db
      .query("todos")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .order("desc")
      .collect();
    
    return subtasks;
  },
});

// Toggle todo completion status
export const toggleTodo = mutation({
  args: {
    id: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new Error("Todo not found");
    }

    const updates: any = {
      isCompleted: !todo.isCompleted,
    };

    // If marking as complete and it's a daily task, record the completion time
    if (!todo.isCompleted && todo.isDaily) {
      updates.lastCompletedAt = Date.now();
    }

    await ctx.db.patch(args.id, updates);
  },
});

// Update todo due date
export const updateDueDate = mutation({
  args: {
    id: v.id("todos"),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      dueDate: args.dueDate,
    });
  },
});

// Toggle daily status
export const toggleDaily = mutation({
  args: {
    id: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new Error("Todo not found");
    }

    await ctx.db.patch(args.id, {
      isDaily: !todo.isDaily,
    });
  },
});

// Update priority
export const updatePriority = mutation({
  args: {
    id: v.id("todos"),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      priority: args.priority,
    });
  },
});

// Update todo (for editing)
export const updateTodo = mutation({
  args: {
    id: v.id("todos"),
    text: v.string(),
    dueDate: v.optional(v.number()),
    isDaily: v.boolean(),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      text: args.text,
      dueDate: args.dueDate,
      isDaily: args.isDaily,
      priority: args.priority,
    });
  },
});

// Delete a todo
export const deleteTodo = mutation({
  args: {
    id: v.id("todos"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Clear all completed todos (except daily tasks)
export const clearCompleted = mutation({
  args: {},
  handler: async (ctx) => {
    const completedTodos = await ctx.db
      .query("todos")
      .filter((q) => q.and(
        q.eq(q.field("isCompleted"), true),
        q.eq(q.field("isDaily"), false)
      ))
      .collect();

    await Promise.all(
      completedTodos.map((todo) => ctx.db.delete(todo._id))
    );
  },
});

// Get daily tasks summary
export const getDailyTasksSummary = query({
  args: {},
  handler: async (ctx) => {
    const dailyTasks = await ctx.db
      .query("todos")
      .filter((q) => q.eq(q.field("isDaily"), true))
      .collect();

    const total = dailyTasks.length;
    const completed = dailyTasks.filter((t) => t.isCompleted).length;

    return {
      total,
      completed,
      remaining: total - completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  },
});
