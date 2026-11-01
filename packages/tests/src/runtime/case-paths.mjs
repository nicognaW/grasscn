import path from 'node:path'

export function normalizeCasePath(value) {
  if (typeof value !== 'string' || !value || /[\u0000-\u001f\u007f›]/.test(value) || path.posix.isAbsolute(value) || path.win32.isAbsolute(value) || /^[A-Za-z]:/.test(value)) {
    throw Error('Expected a safe relative case path')
  }
  const normalized = value.replaceAll('\\', '/')
  if (normalized.split('/').some(part => !part || part === '.' || part === '..')) {
    throw Error('Case path must not escape or contain ambiguous segments')
  }
  return normalized
}

export function relativeCaseFile(root, file) {
  return normalizeCasePath(path.relative(root, file).replaceAll(path.sep, '/'))
}

export function browserFilePattern(file) {
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return String.raw`(?:^|[\\/])${normalizeCasePath(file).split('/').map(escape).join(String.raw`[\\/]`)}$`
}
