import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all countdowns
export const getCountdowns = query({
  args: {
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let countdowns = await ctx.db
      .query("countdowns")
      .order("asc")
      .collect();

    if (!args.includeArchived) {
      countdowns = countdowns.filter((c) => !c.isArchived);
    }

    return countdowns;
  },
});

// Get active countdowns sorted by target date
export const getActiveCountdowns = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const countdowns = await ctx.db
      .query("countdowns")
      .filter((q) => q.eq(q.field("isArchived"), false))
      .collect();

    // Sort by target date (closest first)
    return countdowns.sort((a, b) => a.targetDate - b.targetDate);
  },
});

// Get countdown with time remaining
export const getCountdownWithTimeRemaining = query({
  args: {
    id: v.id("countdowns"),
  },
  handler: async (ctx, args) => {
    const countdown = await ctx.db.get(args.id);
    if (!countdown) return null;

    const now = Date.now();
    const timeRemaining = countdown.targetDate - now;
    const isPast = timeRemaining < 0;

    // Calculate time components
    const totalSeconds = Math.abs(Math.floor(timeRemaining / 1000));
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    return {
      ...countdown,
      timeRemaining: {
        total: timeRemaining,
        days,
        hours,
        minutes,
        seconds,
        isPast,
      },
    };
  },
});

// Get all countdowns with time remaining
export const getAllCountdownsWithTime = query({
  args: {},
  handler: async (ctx) => {
    const countdowns = await ctx.db
      .query("countdowns")
      .filter((q) => q.eq(q.field("isArchived"), false))
      .collect();

    const now = Date.now();

    return countdowns.map((countdown) => {
      const timeRemaining = countdown.targetDate - now;
      const isPast = timeRemaining < 0;

      const totalSeconds = Math.abs(Math.floor(timeRemaining / 1000));
      const days = Math.floor(totalSeconds / (24 * 60 * 60));
      const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
      const seconds = totalSeconds % 60;

      return {
        ...countdown,
        timeRemaining: {
          total: timeRemaining,
          days,
          hours,
          minutes,
          seconds,
          isPast,
        },
      };
    }).sort((a, b) => a.targetDate - b.targetDate);
  },
});

// Create a new countdown
export const addCountdown = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    targetDate: v.number(),
    color: v.string(),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const countdownId = await ctx.db.insert("countdowns", {
      title: args.title,
      description: args.description,
      targetDate: args.targetDate,
      color: args.color,
      icon: args.icon,
      createdAt: Date.now(),
      isArchived: false,
    });
    return countdownId;
  },
});

// Update a countdown
export const updateCountdown = mutation({
  args: {
    id: v.id("countdowns"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    targetDate: v.optional(v.number()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, filteredUpdates);
  },
});

// Archive a countdown
export const archiveCountdown = mutation({
  args: {
    id: v.id("countdowns"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isArchived: true,
    });
  },
});

// Unarchive a countdown
export const unarchiveCountdown = mutation({
  args: {
    id: v.id("countdowns"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isArchived: false,
    });
  },
});

// Delete a countdown
export const deleteCountdown = mutation({
  args: {
    id: v.id("countdowns"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Get upcoming countdowns (next 7 days)
export const getUpcomingCountdowns = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sevenDaysLater = now + (7 * 24 * 60 * 60 * 1000);

    const countdowns = await ctx.db
      .query("countdowns")
      .filter((q) => q.eq(q.field("isArchived"), false))
      .collect();

    return countdowns
      .filter((c) => c.targetDate >= now && c.targetDate <= sevenDaysLater)
      .sort((a, b) => a.targetDate - b.targetDate);
  },
});

// Get countdowns summary
export const getCountdownsSummary = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const countdowns = await ctx.db
      .query("countdowns")
      .filter((q) => q.eq(q.field("isArchived"), false))
      .collect();

    const upcoming = countdowns.filter((c) => c.targetDate >= now);
    const past = countdowns.filter((c) => c.targetDate < now);

    return {
      total: countdowns.length,
      upcoming: upcoming.length,
      past: past.length,
    };
  },
});
