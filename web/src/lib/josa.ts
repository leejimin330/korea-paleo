/** 받침 유무에 따라 조사를 고른다. 한글이 아니면 받침 없는 쪽. */
export function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  const last = word.replace(/[」』)\]\s]+$/u, "").slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  const has = code >= 0 && code <= 11171 && code % 28 !== 0;
  return word + (has ? withBatchim : withoutBatchim);
}
