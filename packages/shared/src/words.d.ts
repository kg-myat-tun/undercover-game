export type WordPair = {
    civilian: string;
    undercover: string;
};
export type WordPack = {
    id: string;
    name: string;
    locale: string;
    category: string;
    pairs: WordPair[];
};
export declare const wordPacks: WordPack[];
export declare function getWordPack(packId?: string): WordPack;
