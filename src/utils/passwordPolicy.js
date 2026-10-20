export const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_]).{8,}$/;
export const STRONG_PASSWORD_HTML_PATTERN = STRONG_PASSWORD_PATTERN.source;
export const STRONG_PASSWORD_MESSAGE = 'Use at least 8 characters, including a lowercase letter, an uppercase letter, a number, and a special character (!@#$%^&*_).';