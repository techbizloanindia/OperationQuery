// Centralized branch utility functions

export interface User {
  assignedBranches?: string[];
  branch?: string;
  branchCode?: string;
}

/**
 * Get user's assigned branches with proper fallback logic
 * Priority: assignedBranches > branch + branchCode
 */
export function getUserBranches(user: User | null | undefined): string[] {
  if (!user) return [];

  // Priority: assignedBranches > branch > branchCode
  if (user.assignedBranches && user.assignedBranches.length > 0) {
    return user.assignedBranches;
  }

  const branches: string[] = [];
  if (user.branch) branches.push(user.branch);
  if (user.branchCode && user.branchCode !== user.branch) branches.push(user.branchCode);

  return branches.filter(Boolean);
}

/**
 * Check if a query/application belongs to user's branches
 */
export function isInUserBranches(
  item: { branch?: string; branchCode?: string; assignedToBranch?: string },
  userBranches: string[]
): boolean {
  if (userBranches.length === 0) return true; // Admin access

  return userBranches.some(branch =>
    item.branch === branch ||
    item.branchCode === branch ||
    item.assignedToBranch === branch
  );
}

/**
 * Create MongoDB query filter for branches
 */
export function createBranchFilter(branches: string[]) {
  if (branches.length === 0) return {};

  return {
    $or: [
      { branch: { $in: branches } },
      { branchCode: { $in: branches } },
      { assignedToBranch: { $in: branches } }
    ]
  };
}

/**
 * Filter items by branches (for in-memory filtering)
 */
export function filterByBranches<T extends { branch?: string; branchCode?: string; assignedToBranch?: string }>(
  items: T[],
  userBranches: string[]
): T[] {
  if (userBranches.length === 0) return items;

  return items.filter(item => isInUserBranches(item, userBranches));
}

/**
 * Create branch parameter string for API calls
 */
export function createBranchParam(userBranches: string[]): string {
  return userBranches.length > 0 ? `&branches=${userBranches.join(',')}` : '';
}

/**
 * Normalize branch name (handle different naming conventions)
 */
export function normalizeBranchName(branch: string): string {
  return branch.trim().toLowerCase();
}

/**
 * Check if branch names match (case-insensitive, trimmed)
 */
export function branchesMatch(branch1: string, branch2: string): boolean {
  return normalizeBranchName(branch1) === normalizeBranchName(branch2);
}