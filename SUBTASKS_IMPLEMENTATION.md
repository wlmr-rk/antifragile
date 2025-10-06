# Subtasks Implementation

## Backend Changes ✅ COMPLETE

1. **Schema Updated** (`src/convex/schema.ts`)
   - Added `parentId` field to link subtasks to parent
   - Added `level` field (0 = parent, 1 = subtask, 2 = sub-subtask)
   - Added index `by_parent` for efficient subtask queries

2. **Mutations Updated** (`src/convex/todos.ts`)
   - `addTodo` now accepts `parentId` and calculates level
   - Added `getSubtasks` query to fetch subtasks for a parent
   - Added `updateTodo` mutation for editing todos
   - `getTodos` now filters out subtasks (only returns parent-level todos)

## Frontend Changes NEEDED

### 1. Update Todo Type Definition
Add `parentId`, `level`, and `subtasks` to the todo type in the todos page.

### 2. Fetch Subtasks
For each parent todo, fetch its subtasks using the `getSubtasks` query.

### 3. UI Updates
- Add expand/collapse button to todos that have subtasks
- Show subtask count badge
- Indent subtasks visually (level 1 = 20px, level 2 = 40px)
- Add "Add Subtask" button when todo is expanded
- Limit subtask creation to 2 levels deep

### 4. Subtask Modal
- Reuse existing add modal but pass `parentId`
- Show parent task name in modal title
- Disable some fields for subtasks (like isDaily)

### 5. Completion Logic
- When parent is completed, optionally complete all subtasks
- Show progress indicator (e.g., "2/5 subtasks complete")

## Usage
- Click on a todo to expand and see subtasks
- Click "Add Subtask" button to add a subtask
- Subtasks can have their own subtasks (up to 2 levels total)
- Subtasks inherit some properties from parent (like due date)

## Notes
- Maximum depth: 2 levels (parent → subtask → sub-subtask)
- Subtasks are hidden in the main list
- Each subtask can be edited/deleted independently
- Completing a parent doesn't auto-complete subtasks (user choice)
