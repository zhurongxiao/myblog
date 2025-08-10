---
layout: post
title: "git method"
date: 2025-08-11 06:40:00 +0800
categories: gather

---

If you want to **roll back to the last committed version** (the state of your last `git commit` before any unpushed changes), follow these steps:

### **1. Check Your Commit History**
First, see your recent commits to confirm the correct one:
```bash
git log --oneline
```
(Example output:)
```
a1b2c3d (HEAD) WIP: New feature (unwanted changes)
e4f5g6h Last good commit (the one you want to return to)
```
- The most recent commit (`a1b2c3d`) is your **unpushed changes**.
- The commit before (`e4f5g6h`) is your **last good state**.

### **2. Reset to the Last Good Commit**
To **completely discard** all changes after `e4f5g6h` (including staged and working directory changes):
```bash
git reset --hard e4f5g6h
```
(Replace `e4f5g6h` with your actual commit hash or use `HEAD~1` to go back one commit.)

### **Alternative Options**
- If you want to **keep changes as unstaged files** (not committed but not deleted):
  ```bash
  git reset --mixed e4f5g6h
  ```
- If you want to **keep changes staged** (but undo the commit):
  ```bash
  git reset --soft e4f5g6h
  ```

### **3. Verify the Reset**
Check that your working directory is clean:
```bash
git status
```
You should see:
```
On branch [your-branch]
nothing to commit, working tree clean
```

### **Important Notes**
- **`--hard` is destructive**: It permanently deletes all uncommitted and unpushed changes. If unsure, back them up first:
  ```bash
  git stash -u  # Stashes even untracked files
  ```
- **If you already pushed**: Since you didn’t push, no need for `git push --force`.

### **Summary**
To **completely undo** all local changes since the last commit and return to the last clean state:
```bash
git reset --hard HEAD~1
```
(Or replace `HEAD~1` with the specific commit hash.)

Would you like help confirming the correct commit before resetting?

