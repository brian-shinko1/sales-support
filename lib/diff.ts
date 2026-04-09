export type DiffOp = { type: "equal" | "insert" | "delete"; text: string };

export function computeDiff(original: string, modified: string): DiffOp[] {
  const a = original.split("\n");
  const b = modified.split("\n");
  const m = a.length;
  const n = b.length;

  // Dynamic programming LCS
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1];
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const ops: DiffOp[] = [];
  let i = 0, j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && a[i] === b[j]) {
      ops.push({ type: "equal", text: a[i] });
      i++; j++;
    } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
      ops.push({ type: "insert", text: b[j] });
      j++;
    } else {
      ops.push({ type: "delete", text: a[i] });
      i++;
    }
  }
  return ops;
}
