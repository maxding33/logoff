/**
 * Basic content filter — blocks common profanity and slurs in user-generated text.
 * Returns null if the text is clean, or an error string to show the user.
 */

const BANNED: RegExp[] = [
  /\bf+u+c+k+\b/i,
  /\bs+h+i+t+\b/i,
  /\ba+s+s+h+o+l+e+\b/i,
  /\bb+i+t+c+h+\b/i,
  /\bc+u+n+t+\b/i,
  /\bd+i+c+k+\b/i,
  /\bc+o+c+k+\b/i,
  /\bp+u+s+s+y+\b/i,
  /\bw+h+o+r+e+\b/i,
  /\bs+l+u+t+\b/i,
  /\bf+a+g+g+o+t+\b/i,
  /\bf+a+g+\b/i,
  /\bn+i+g+g+e+r+\b/i,
  /\bn+i+g+g+a+\b/i,
  /\br+e+t+a+r+d+\b/i,
  /\bc+h+i+n+k+\b/i,
  /\bs+p+i+c+\b/i,
  /\bk+i+k+e+\b/i,
  /\bt+w+a+t+\b/i,
  /\bw+a+n+k+e+r+\b/i,
  /\bj+i+z+z+\b/i,
];

export function containsBannedContent(text: string): string | null {
  for (const re of BANNED) {
    if (re.test(text)) return "That word isn't allowed here.";
  }
  return null;
}
