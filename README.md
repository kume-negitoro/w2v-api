これは word2vec の api をフロントエンド向けに修正したパッケージです

## api

### WordDist

```ts
interface WordDist {
    word: string // 単語
    dist: number // 類似度
}
```

### parseAsModel

TSV形式の文字列からモデルを生成します。

```ts
(tsv: string) => Model
```

### Model#similarity

word1 と word2 の類似度を返します。

```ts
(word1: string, word2: string) => number | undefined
```

### Model#mostSimilar

phrases の各要素に対して類似度の高い順で単語を返します。

```ts
(phrases: string: [], n = 10) => WordDist[][]
```

### Model#analogy

positives から negatives を減算したベクトルに類似度の高い順で単語を返します。

```ts
(positives: string[], negatives: string[], n = 10) => WordDist[]
```