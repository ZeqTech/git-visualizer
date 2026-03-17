/**
 * Git Parser Utilities
 * Helper functions for parsing git commands
 */

/**
 * Smart split that respects quoted strings
 * @example
 * smartSplit('commit -m "hello world"')
 * // Returns: ['commit', '-m', 'hello world']
 */
export function smartSplit(input: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = "";
    } else if (char === " " && !inQuotes) {
      if (current) {
        result.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    result.push(current);
  }

  return result;
}
