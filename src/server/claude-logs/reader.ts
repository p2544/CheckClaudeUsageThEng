import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

/**
 * Stream-read a .jsonl file from a given byte offset.
 * Yields parsed JSON objects with their byte offset for incremental tracking.
 */
export async function* readSessionFile(
  filePath: string,
  fromOffset = 0,
): AsyncGenerator<{ data: unknown; offset: number }> {
  const stream = createReadStream(filePath, {
    start: fromOffset,
    encoding: 'utf8',
  })

  const rl = createInterface({
    input: stream,
    crlfDelay: Infinity,
  })

  let offset = fromOffset

  for await (const line of rl) {
    offset += Buffer.byteLength(line, 'utf8') + 1 // +1 for newline
    if (!line.trim()) continue
    try {
      yield { data: JSON.parse(line), offset }
    } catch {
      // Skip malformed JSON lines silently
    }
  }
}
