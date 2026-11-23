import fs from 'node:fs'
import path from 'node:path'

const ROOTS = [
  path.join(process.cwd(), 'app', '[locale]'),
  path.join(process.cwd(), 'components'),
]

const ALLOWED_SOURCE_CONTENT = [
  '夜が明けるまで',
  'アスファルトの花',
  '波と風と',
  'ミナミ',
  '海音',
  'ヨル猫',
]

const JAPANESE = /[\u3040-\u30ff\u3400-\u9fff]/

const RAW_ERROR_SINKS = [
  /\bset[A-Za-z]*Error\([^)]*\b[A-Za-z_$][\w$]*\.(?:error|message)\b/,
  /\b(?:window\.)?alert\([^)]*\b[A-Za-z_$][\w$]*\.(?:error|message)\b/,
  /throw new Error\([^)]*\b[A-Za-z_$][\w$]*\.(?:error|message)\b/,
]

function collectTsxFiles(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(root, entry.name)
    if (entry.isDirectory()) return collectTsxFiles(fullPath)
    return entry.isFile() && entry.name.endsWith('.tsx') ? [fullPath] : []
  })
}

function findRawErrorSinks(filePath: string): string[] {
  const source = fs.readFileSync(filePath, 'utf8')

  return source
    .split('\n')
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => RAW_ERROR_SINKS.some((pattern) => pattern.test(line)))
    .map(({ line, lineNumber }) => `${lineNumber}: ${line.trim()}`)
}

function findHardcodedJapanese(filePath: string): string[] {
  const source = fs.readFileSync(filePath, 'utf8')
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, '')

  return withoutBlockComments
    .split('\n')
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => !line.trimStart().startsWith('//'))
    .map(({ line, lineNumber }) => {
      const normalized = ALLOWED_SOURCE_CONTENT.reduce(
        (current, value) => current.replaceAll(value, ''),
        line
      )
      return { line: normalized, lineNumber }
    })
    .filter(({ line }) => JAPANESE.test(line))
    .map(({ line, lineNumber }) => `${lineNumber}: ${line.trim()}`)
}

describe('localized UI source', () => {
  it('does not surface raw backend or SDK error messages', () => {
    const failures = ROOTS.flatMap((root) =>
      collectTsxFiles(root).flatMap((filePath) =>
        findRawErrorSinks(filePath).map(
          (match) => `${path.relative(process.cwd(), filePath)}:${match}`
        )
      )
    )

    expect(failures).toEqual([])
  })

  it('does not hard-code Japanese UI copy in locale pages or shared components', () => {
    const failures = ROOTS.flatMap((root) =>
      collectTsxFiles(root).flatMap((filePath) =>
        findHardcodedJapanese(filePath).map(
          (match) => `${path.relative(process.cwd(), filePath)}:${match}`
        )
      )
    )

    expect(failures).toEqual([])
  })
})
