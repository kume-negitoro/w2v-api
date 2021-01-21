export const normalized = (values: number[]): number[] => {
    const len = Math.sqrt(values.reduce((acc, v) => acc + v * v, 0))
    return values.map((v) => v / len)
}

export const bInsert = <T>(
    comparator: (target: T, other: T) => number,
    value: T,
    array: T[],
    left = -1,
    right: number = array.length
): T[] => {
    if (!(right - left > 1)) return array.splice(right, 0, value), array
    const mid = left + (((right - left) / 2) | 0)
    if (comparator(array[mid], value) < 1)
        return bInsert(comparator, value, array, mid, right)
    return bInsert(comparator, value, array, left, mid)
}

export type MayWordVector = WordVector | undefined

export class WordVector {
    word: string
    values: number[]

    constructor(word: string, values: number[]) {
        this.word = word
        this.values = values
    }

    sum(): number {
        return this.values.reduce((acc, v) => acc + v, 0)
    }

    add(wordvec: WordVector): WordVector {
        const values: number[] = []
        for (let i = 0; i < this.values.length; i++) {
            values[i] = this.values[i] + wordvec.values[i]
        }
        return new WordVector('', values)
    }

    sub(wordvec: WordVector): WordVector {
        const values: number[] = []
        for (let i = 0; i < this.values.length; i++) {
            values[i] = this.values[i] - wordvec.values[i]
        }
        return new WordVector('', values)
    }

    mul(wordvec: WordVector): WordVector {
        const values: number[] = []
        for (let i = 0; i < this.values.length; i++) {
            values[i] = this.values[i] * wordvec.values[i]
        }
        return new WordVector('', values)
    }

    normalized(): WordVector {
        return new WordVector('', normalized(this.values))
    }
}

export interface WordDist {
    word: string
    dist: number
}

export class Model {
    vocab: WordVector[]

    constructor(vocab: WordVector[]) {
        this.vocab = vocab
    }

    getVector(word: string): WordVector | undefined {
        return this.vocab.find((v) => v.word === word)
    }

    getVectors(words: string[]): MayWordVector[] {
        const vectors: MayWordVector[] = words.map((_) => undefined)
        for (const wv of this.vocab)
            for (const [i, word] of words.entries())
                if (!vectors[i] && word === wv.word) vectors[i] = wv
        return vectors
    }

    similarity(word1: string, word2: string): number | undefined {
        if (word1 === word2) return 1
        const vecs = this.vocab.filter(
            (wv) => wv.word === word1 || wv.word === word2
        )
        if (vecs.length !== 2) return undefined
        return vecs[0].values.reduce((a, v, i) => a + v * vecs[1].values[i], 0)
    }

    getNearestWords(
        vectors: MayWordVector[],
        n: number,
        excludes: MayWordVector[] = []
    ): WordDist[][] {
        const distsList: WordDist[][] = []
        for (const wv of this.vocab) {
            if (excludes.includes(wv)) continue
            for (const [i, vector] of vectors.entries()) {
                if (!vector) continue
                if (vector.word == wv.word) continue
                const dist = normalized(vector.values).reduce(
                    (acc, v, j) => acc + v * wv.values[j],
                    0
                )
                distsList[i] = bInsert(
                    (o, v) => v.dist - o.dist,
                    { dist, word: wv.word },
                    distsList[i] || []
                )
            }
        }
        return distsList.map((dists) =>
            dists.sort((v1, v2) => v2.dist - v1.dist).slice(0, n)
        )
    }

    mostSimilar(
        phrases: string[],
        n = 10,
        excludes: string[] = []
    ): WordDist[][] {
        const wvs = this.getVectors([...phrases, ...excludes])
        const iwvs = wvs.slice(0, phrases.length)
        const ewvs = wvs.slice(phrases.length, phrases.length + excludes.length)
        return this.getNearestWords(iwvs, n, ewvs)
    }

    analogy(positives: string[], negatives: string[], n = 10): WordDist[][] {
        const wvs = this.getVectors([...positives, ...negatives])

        const pwvs: WordVector[] = []
        const nwvs: WordVector[] = []
        for (const wv of wvs) {
            if (!wv) return []
            if (positives.includes(wv.word)) pwvs.push(wv)
            if (negatives.includes(wv.word)) nwvs.push(wv)
        }

        const init = new WordVector(
            '',
            this.vocab[0].values.map((_) => 0)
        )
        const vector = pwvs
            .reduce((vec, wvs) => vec.add(wvs), init)
            .sub(nwvs.reduce((vec, wvs) => vec.add(wvs), init))
        return this.getNearestWords([vector], n, [...pwvs, ...nwvs])
    }
}

export const parseAsVocablary = (tsv: string): WordVector[] => {
    return tsv
        .trim()
        .split('\n')
        .map((row) => {
            const [, word, _vector] = row.split('\t')
            const vector: number[] = JSON.parse(_vector)
            return new WordVector(word, normalized(vector))
        })
}

export const parseAsModel = (tsv: string): Model => {
    return new Model(parseAsVocablary(tsv))
}
