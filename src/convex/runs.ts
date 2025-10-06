import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all runs
export const getRuns = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let runs = await ctx.db
      .query("runs")
      .order("desc")
      .collect();

    if (args.limit) {
      runs = runs.slice(0, args.limit);
    }

    return runs;
  },
});

// Get recent runs
export const getRecentRuns = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const runs = await ctx.db
      .query("runs")
      .order("desc")
      .collect();

    return args.limit ? runs.slice(0, args.limit) : runs;
  },
});

// Get runs in date range
export const getRunsInRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const runs = await ctx.db
      .query("runs")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate)
        )
      )
      .collect();

    return runs.sort((a, b) => b.date - a.date);
  },
});

// Get run statistics
export const getRunStats = query({
  args: {},
  handler: async (ctx) => {
    const runs = await ctx.db.query("runs").collect();

    if (runs.length === 0) {
      return {
        totalRuns: 0,
        totalDistance: 0,
        totalDuration: 0,
        averageDistance: 0,
        averagePace: 0,
        fastestPace: 0,
        longestRun: 0,
        thisWeek: 0,
        thisMonth: 0,
      };
    }

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const totalDistance = runs.reduce((sum, r) => sum + r.distance, 0);
    const totalDuration = runs.reduce((sum, r) => sum + r.duration, 0);
    const averageDistance = totalDistance / runs.length;
    const averagePace =
      runs.reduce((sum, r) => sum + r.pace, 0) / runs.length;
    const fastestPace = Math.min(...runs.map((r) => r.pace));
    const longestRun = Math.max(...runs.map((r) => r.distance));

    const thisWeek = runs.filter((r) => r.date >= weekAgo).length;
    const thisMonth = runs.filter((r) => r.date >= monthAgo).length;

    return {
      totalRuns: runs.length,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalDuration: Math.round(totalDuration),
      averageDistance: Math.round(averageDistance * 100) / 100,
      averagePace: Math.round(averagePace * 100) / 100,
      fastestPace: Math.round(fastestPace * 100) / 100,
      longestRun: Math.round(longestRun * 100) / 100,
      thisWeek,
      thisMonth,
    };
  },
});

// Get weekly running summary
export const getWeeklySummary = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const runs = await ctx.db
      .query("runs")
      .filter((q) => q.gte(q.field("date"), weekAgo))
      .collect();

    const totalDistance = runs.reduce((sum, r) => sum + r.distance, 0);
    const totalDuration = runs.reduce((sum, r) => sum + r.duration, 0);
    const averagePace =
      runs.length > 0
        ? runs.reduce((sum, r) => sum + r.pace, 0) / runs.length
        : 0;

    return {
      runs: runs.length,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalDuration: Math.round(totalDuration),
      averagePace: Math.round(averagePace * 100) / 100,
    };
  },
});

// Get monthly running summary
export const getMonthlySummary = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const runs = await ctx.db
      .query("runs")
      .filter((q) => q.gte(q.field("date"), monthAgo))
      .collect();

    const totalDistance = runs.reduce((sum, r) => sum + r.distance, 0);
    const totalDuration = runs.reduce((sum, r) => sum + r.duration, 0);
    const averagePace =
      runs.length > 0
        ? runs.reduce((sum, r) => sum + r.pace, 0) / runs.length
        : 0;

    // Group by week
    const weeklyData: Record<number, { distance: number; duration: number; count: number }> = {};
    runs.forEach((run) => {
      const weekNumber = Math.floor((now - run.date) / (7 * 24 * 60 * 60 * 1000));
      if (!weeklyData[weekNumber]) {
        weeklyData[weekNumber] = { distance: 0, duration: 0, count: 0 };
      }
      weeklyData[weekNumber].distance += run.distance;
      weeklyData[weekNumber].duration += run.duration;
      weeklyData[weekNumber].count += 1;
    });

    return {
      runs: runs.length,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalDuration: Math.round(totalDuration),
      averagePace: Math.round(averagePace * 100) / 100,
      weeklyBreakdown: weeklyData,
    };
  },
});

// Get personal bests
export const getPersonalBests = query({
  args: {},
  handler: async (ctx) => {
    const runs = await ctx.db.query("runs").collect();

    if (runs.length === 0) {
      return {
        longestDistance: null,
        fastestPace: null,
        longestDuration: null,
      };
    }

    const longestDistance = runs.reduce((best, current) =>
      current.distance > best.distance ? current : best
    );

    const fastestPace = runs.reduce((best, current) =>
      current.pace < best.pace ? current : best
    );

    const longestDuration = runs.reduce((best, current) =>
      current.duration > best.duration ? current : best
    );

    return {
      longestDistance,
      fastestPace,
      longestDuration,
    };
  },
});

// Get running streak
export const getRunningStreak = query({
  args: {},
  handler: async (ctx) => {
    const runs = await ctx.db
      .query("runs")
      .order("desc")
      .collect();

    if (runs.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const runDates = new Set(
      runs.map((r) => {
        const date = new Date(r.date);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
    );

    // Check current streak
    let currentStreak = 0;
    let currentDate = new Date(today);
    while (runDates.has(currentDate.getTime())) {
      currentStreak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedDates = Array.from(runDates).sort((a, b) => b - a);

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

// Add a new run
export const addRun = mutation({
  args: {
    date: v.number(),
    distance: v.number(),
    duration: v.number(),
    route: v.optional(v.string()),
    notes: v.optional(v.string()),
    feeling: v.optional(
      v.union(
        v.literal("excellent"),
        v.literal("good"),
        v.literal("okay"),
        v.literal("tough"),
        v.literal("struggled")
      )
    ),
    weather: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Calculate pace (minutes per kilometer)
    const pace = args.duration / args.distance;

    const runId = await ctx.db.insert("runs", {
      date: args.date,
      distance: args.distance,
      duration: args.duration,
      pace: Math.round(pace * 100) / 100,
      route: args.route,
      notes: args.notes,
      feeling: args.feeling,
      weather: args.weather,
      createdAt: Date.now(),
    });
    return runId;
  },
});

// Update a run
export const updateRun = mutation({
  args: {
    id: v.id("runs"),
    date: v.optional(v.number()),
    distance: v.optional(v.number()),
    duration: v.optional(v.number()),
    route: v.optional(v.string()),
    notes: v.optional(v.string()),
    feeling: v.optional(
      v.union(
        v.literal("excellent"),
        v.literal("good"),
        v.literal("okay"),
        v.literal("tough"),
        v.literal("struggled")
      )
    ),
    weather: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, distance, duration, ...otherUpdates } = args;
    const run = await ctx.db.get(id);
    if (!run) {
      throw new Error("Run not found");
    }

    const updates: any = { ...otherUpdates };

    // Recalculate pace if distance or duration changed
    if (distance !== undefined || duration !== undefined) {
      const newDistance = distance ?? run.distance;
      const newDuration = duration ?? run.duration;
      updates.pace = Math.round((newDuration / newDistance) * 100) / 100;
      if (distance !== undefined) updates.distance = distance;
      if (duration !== undefined) updates.duration = duration;
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, filteredUpdates);
  },
});

// Delete a run
export const deleteRun = mutation({
  args: {
    id: v.id("runs"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Get run calendar (for monthly view)
export const getRunCalendar = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const runs = await ctx.db
      .query("runs")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate)
        )
      )
      .collect();

    // Group by date
    const groupedByDate: Record<
      string,
      { runs: any[]; totalDistance: number; totalDuration: number }
    > = {};

    runs.forEach((run) => {
      const date = new Date(run.date);
      const dateKey = date.toISOString().split("T")[0];
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = { runs: [], totalDistance: 0, totalDuration: 0 };
      }
      groupedByDate[dateKey].runs.push(run);
      groupedByDate[dateKey].totalDistance += run.distance;
      groupedByDate[dateKey].totalDuration += run.duration;
    });

    return groupedByDate;
  },
});

// Get pace zones distribution
export const getPaceZones = query({
  args: {},
  handler: async (ctx) => {
    const runs = await ctx.db.query("runs").collect();

    if (runs.length === 0) {
      return {
        easy: 0,
        moderate: 0,
        tempo: 0,
        fast: 0,
      };
    }

    // Define pace zones (minutes per km)
    const zones = {
      easy: 0, // > 6:30 min/km
      moderate: 0, // 5:30 - 6:30 min/km
      tempo: 0, // 4:30 - 5:30 min/km
      fast: 0, // < 4:30 min/km
    };

    runs.forEach((run) => {
      if (run.pace > 6.5) zones.easy++;
      else if (run.pace > 5.5) zones.moderate++;
      else if (run.pace > 4.5) zones.tempo++;
      else zones.fast++;
    });

    return zones;
  },
});
