// Terminal output helpers. ANSI only when the stream is a TTY and NO_COLOR is unset —
// CI logs and piped output stay clean.

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

const wrap = (open, close) => (s) => (useColor ? `\u001b[${open}m${s}\u001b[${close}m` : String(s));

export const bold = wrap(1, 22);
export const dim = wrap(2, 22);
export const green = wrap(32, 39);
export const cyan = wrap(36, 39);
export const yellow = wrap(33, 39);
export const red = wrap(31, 39);

export function banner(version) {
  console.log('');
  console.log(`  ${bold('create-primitives-app')} ${dim(`v${version}`)}`);
  console.log(`  ${dim('identity, authority, and data that belong to the person — not your app')}`);
  console.log('');
}

export function step(message) {
  console.log(`  ${green('✔')} ${message}`);
}

export function info(message) {
  console.log(`  ${dim(message)}`);
}

export function warn(message) {
  console.warn(`  ${yellow('!')} ${message}`);
}

export function errorLine(message) {
  console.error(`\n  ${red('✖')} ${message}\n`);
}
