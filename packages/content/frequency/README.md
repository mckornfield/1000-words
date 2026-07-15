# Frequency lists

Top-1000 word frequency lists per target language, used as the input to
`scripts/generate.ts`. One word per line, ordered by descending frequency.

## Source

Derived from [HermitDave/FrequencyWords][src] (2018 OpenSubtitles corpus), MIT
licensed. To regenerate from the upstream `*_50k.txt` files, slice the top 1000
entries that match a per-language token regex (Latin-with-accents for `es`,
Han-only for `zh`); see git history for the one-shot script used originally.

| File     | Source upstream path                       | Token filter        |
|----------|--------------------------------------------|---------------------|
| `es.txt` | `content/2018/es/es_50k.txt`               | `/^[a-záéíóúñü]+$/i`|
| `zh.txt` | `content/2018/zh_cn/zh_cn_50k.txt`         | `/^\p{Han}+$/u`     |
| `ko.txt` | `content/2018/ko/ko_50k.txt`               | `/^[\p{Hangul}]+$/u` (AC00–D7A3 + Jamo) |
| `ja.txt` | `content/2018/ja/ja_full.txt`              | `/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+$/u` |

Lists are checked in so the pipeline is reproducible without a network fetch
and so word selection is reviewable in PRs.

[src]: https://github.com/hermitdave/FrequencyWords
