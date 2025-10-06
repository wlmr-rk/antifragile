# Testing Guide - Optimistic UI

## Quick Test Checklist

Use this checklist to verify the optimistic UI is working correctly:

- [ ] Add todo - appears instantly
- [ ] Toggle todo - checkbox changes immediately
- [ ] Delete todo - disappears instantly
- [ ] Clear completed - all completed todos vanish immediately
- [ ] Slow network - see "syncing..." indicator
- [ ] Offline mode - rollback on failure
- [ ] Multiple rapid clicks - no UI glitches

## Prerequisites

1. Make sure your dev server is running:
   ```bash
   bun run dev
   ```

2. Make sure Convex is running:
   ```bash
   bunx convex dev
   ```

3. Open http://localhost:5173 in your browser

4. Open Developer Tools (F12)

## Test 1: Basic Optimistic Add

**Goal:** Verify todos appear instantly

**Steps:**
1. Type "Test todo" in the input field
2. Click "Add" or press Enter
3. **Observe:** Todo appears immediately at the top
4. **Observe:** "syncing..." indicator appears briefly
5. **Observe:** After ~200-500ms, "syncing..." disappears
6. **Result:** Todo is now permanently saved

**Expected Behavior:**
- ✅ Input clears immediately
- ✅ Todo appears at top of list instantly
- ✅ Todo has reduced opacity while syncing
- ✅ "syncing..." text visible during save
- ✅ Todo becomes fully opaque when saved

**Console Check:**
- No errors should appear in the console

---

## Test 2: Optimistic Toggle

**Goal:** Verify checkboxes update instantly

**Steps:**
1. Add a todo if you don't have one
2. Click the checkbox next to a todo
3. **Observe:** Checkbox fills immediately
4. **Observe:** Text gets strikethrough instantly
5. Click the checkbox again
6. **Observe:** Checkbox empties immediately
7. **Observe:** Text strikethrough removes instantly

**Expected Behavior:**
- ✅ No delay between click and visual change
- ✅ Smooth transition animations
- ✅ Works on multiple todos simultaneously

**Try This:**
- Click 5 checkboxes rapidly - all should update immediately

---

## Test 3: Optimistic Delete

**Goal:** Verify todos disappear instantly

**Steps:**
1. Create 3-4 todos
2. Click the trash icon on one todo
3. **Observe:** Todo disappears immediately
4. Delete another todo
5. **Observe:** Also disappears immediately

**Expected Behavior:**
- ✅ No delay between click and removal
- ✅ Smooth fade-out animation
- ✅ Other todos shift up smoothly

---

## Test 4: Clear Completed (Bulk Delete)

**Goal:** Verify bulk operations work optimistically

**Steps:**
1. Create 5 todos
2. Mark 3 of them as completed (checkboxes)
3. Note the "Clear completed (3)" button appears
4. Click "Clear completed (3)"
5. **Observe:** All 3 completed todos vanish instantly
6. **Observe:** Only 2 active todos remain

**Expected Behavior:**
- ✅ Instant removal of all completed todos
- ✅ Button disappears (no completed todos left)
- ✅ Active count updates immediately

---

## Test 5: Slow Network Simulation

**Goal:** Verify optimistic UI works even with slow connections

**Steps:**
1. Open DevTools (F12)
2. Go to **Network** tab
3. Click throttling dropdown (usually says "No throttling")
4. Select **"Slow 3G"**
5. Add a new todo
6. **Observe:** Todo appears instantly
7. **Observe:** "syncing..." indicator stays visible longer (~3-5 seconds)
8. **Observe:** Todo eventually saves and indicator disappears

**Expected Behavior:**
- ✅ UI remains responsive
- ✅ Can add multiple todos while others are syncing
- ✅ "syncing..." indicator visible during entire upload
- ✅ No UI freezing or blocking

**Visual Check:**
```
┌────────────────────────────────────┐
│ [ ] New todo syncing... ← Reduced opacity
│ [x] Existing todo
│ [ ] Another todo
└────────────────────────────────────┘
```

---

## Test 6: Offline Mode (Rollback Test)

**Goal:** Verify graceful failure and rollback

**Steps:**
1. Open DevTools (F12)
2. Go to **Network** tab
3. Check the **"Offline"** checkbox
4. Try to add a new todo
5. **Observe:** Todo appears instantly
6. **Observe:** After a few seconds, todo disappears
7. **Observe:** Input field is restored with your text
8. **Check console:** Should see error message
9. Uncheck "Offline"
10. Click "Add" again
11. **Observe:** Todo saves successfully

**Expected Behavior:**
- ✅ Optimistic add works even offline
- ✅ Todo disappears after server fails
- ✅ Input text is restored (so you can retry)
- ✅ Error logged to console (not shown to user yet)
- ✅ Works normally when back online

**Console Output:**
```
Failed to add todo: [Network Error]
```

---

## Test 7: Race Conditions (Rapid Clicks)

**Goal:** Verify multiple rapid operations don't cause issues

**Steps:**
1. Add a todo
2. Click the checkbox 10 times rapidly
3. **Observe:** Final state matches last click
4. Add 3 todos in rapid succession (type + Enter + type + Enter)
5. **Observe:** All 3 appear and save correctly
6. Click delete on all 3 todos rapidly
7. **Observe:** All disappear smoothly

**Expected Behavior:**
- ✅ No duplicate todos
- ✅ No ghost todos
- ✅ No UI glitches or jumps
- ✅ Final state is consistent with server

---

## Test 8: Filtering with Optimistic Updates

**Goal:** Verify filters work with optimistic state

**Steps:**
1. Add a new todo (stays optimistic)
2. **Observe:** Appears in "All" filter
3. Click "Active" filter
4. **Observe:** Optimistic todo visible in Active
5. Click "Completed" filter
6. **Observe:** Optimistic todo NOT in Completed
7. Go back to "All"
8. Toggle the optimistic todo (while still syncing)
9. **Observe:** Toggle is blocked (button disabled)

**Expected Behavior:**
- ✅ Optimistic todos respect current filter
- ✅ Can't toggle optimistic todos (not saved yet)
- ✅ Can delete optimistic todos (removes from optimisticAdds)
- ✅ Filters update counts correctly

---

## Test 9: Multiple Simultaneous Operations

**Goal:** Verify multiple operations can be in-flight together

**Steps:**
1. Set network to "Slow 3G"
2. Add a todo (will take 3+ seconds)
3. Immediately toggle an existing todo
4. Immediately delete another todo
5. **Observe:** All 3 operations show optimistically
6. Wait for all to complete
7. **Observe:** All operations succeed

**Expected Behavior:**
- ✅ All operations appear instant
- ✅ Multiple "syncing..." indicators can be visible
- ✅ No conflicts or race conditions
- ✅ All operations eventually succeed

---

## Test 10: Optimistic Delete then Recreate

**Goal:** Verify edge case handling

**Steps:**
1. Add a todo "Test"
2. Wait for it to save (syncing indicator disappears)
3. Delete "Test"
4. Immediately add a new todo "Test" (same text)
5. **Observe:** Old "Test" disappears, new "Test" appears
6. Wait for both operations to complete
7. **Observe:** Only one "Test" exists

**Expected Behavior:**
- ✅ Two distinct operations
- ✅ No duplicate entries
- ✅ Clean state after both complete

---

## Performance Testing

### Metrics to Check

1. **Time to First Paint**
   - Add a todo
   - Time from click to visual appearance
   - **Target:** <50ms

2. **Interaction Responsiveness**
   - Click checkbox
   - Time to visual feedback
   - **Target:** <16ms (60fps)

3. **Bulk Operations**
   - Clear 50 completed todos
   - Time to visual removal
   - **Target:** <100ms

### Using Performance Tab

1. Open DevTools → Performance tab
2. Click Record
3. Perform actions (add, toggle, delete)
4. Stop recording
5. Look for:
   - No long tasks (>50ms)
   - Smooth 60fps animations
   - No layout thrashing

---

## Visual Indicators Reference

### Normal Todo
```
[✓] Buy groceries
    ↑ Purple filled checkbox
    Full opacity
```

### Optimistic Todo (Syncing)
```
[ ] New todo syncing...
    ↑ Gray outline checkbox
    Reduced opacity (60%)
    Small pulsing dot
```

### Completed Todo
```
[✓] Done task
    ↑ Purple checkbox
    Strikethrough text
    Gray color
```

---

## Known Behaviors

### Expected
- ✅ Optimistic todos can't be toggled (button disabled)
- ✅ Optimistic todos can be deleted (removes from optimisticAdds)
- ✅ Input clears immediately on add
- ✅ Multiple operations can overlap
- ✅ Rollback on network failure

### Not Bugs
- Optimistic todos have reduced opacity - **This is intentional**
- Can't toggle optimistic todos - **This is intentional** (not saved yet)
- "syncing..." appears briefly - **This is intentional** (feedback)

---

## Troubleshooting

### Issue: Todos don't appear instantly

**Check:**
1. Is optimistic UI code present? (Look for `optimisticAdds` in +page.svelte)
2. Are there console errors?
3. Is Convex dev running?

**Fix:** Restart dev server

### Issue: Todos appear then disappear

**Check:**
1. Is Convex dev running? (`bunx convex dev`)
2. Is .env.local configured correctly?
3. Are there errors in Convex terminal?

**Fix:** Check Convex connection

### Issue: "syncing..." never disappears

**Check:**
1. Network tab - is request stuck?
2. Convex terminal - are there errors?
3. Console - any JavaScript errors?

**Fix:** Check network connectivity

### Issue: Multiple duplicate todos

**Check:**
1. Are you clicking "Add" multiple times?
2. Is optimistic cleanup working?

**Fix:** Clear browser cache and refresh

---

## Automated Testing (Future)

### Unit Tests
```bash
bun test
```

### E2E Tests
```bash
bun test:e2e
```

### Coverage Target
- Line coverage: >80%
- Optimistic flows: 100%

---

## Success Criteria

You've successfully verified optimistic UI if:

- ✅ All operations feel instant (<50ms perceived latency)
- ✅ "syncing..." indicator appears and disappears correctly
- ✅ No UI glitches or race conditions
- ✅ Rollback works on network failure
- ✅ Multiple operations can overlap smoothly
- ✅ Console has no errors during normal operation

---

## Reporting Issues

If you find a bug:

1. **Note the exact steps** to reproduce
2. **Check console** for errors
3. **Record network conditions** (slow, offline, etc.)
4. **Screenshot** the issue if visual
5. **Check Convex logs** in the terminal

---

## Resources

- [Network Throttling in Chrome DevTools](https://developer.chrome.com/docs/devtools/network/#throttle)
- [Testing Optimistic UI Patterns](https://www.patterns.dev/posts/optimistic-ui)
- [Convex Error Handling](https://docs.convex.dev/client/react#error-handling)

Happy Testing! 🚀
