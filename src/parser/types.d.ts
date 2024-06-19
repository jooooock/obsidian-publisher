declare module 'micromark-util-types' {
    export interface TokenTypeMap {
        tag: 'tag'
        tagMarker: 'tagMarker'
        tagData: 'tagData'

        wikiEmbed: 'wikiEmbed'
        wikiEmbedMarker: 'wikiEmbedMarker'
        wikiEmbedData: 'wikiEmbedData'
        wikiEmbedTarget: 'wikiEmbedTarget'
        wikiEmbedAliasMarker: 'wikiEmbedAliasMarker'
        wikiEmbedAlias: 'wikiEmbedAlias'

        wikiLink: 'wikiLink'
        wikiLinkMarker: 'wikiLinkMarker'
        wikiLinkData: 'wikiLinkData'
        wikiLinkTarget: 'wikiLinkTarget'
        wikiLinkAliasMarker: 'wikiLinkAliasMarker'
        wikiLinkAlias: 'wikiLinkAlias'
    }
}


export type Pos = [number, number, number, number, number, number]

export interface Frontmatter {
    [p: string]: string | string[] | number | boolean | Date
}

export interface FrontmatterLink {
    key: string
    link: string
    original: string
    displayText: string
}

export type FrontmatterPos = Pos

export interface Link {
    link: string
    displayText: string
    pos: Pos
}

export interface Embed {
    link: string
    displayText: string
    pos: Pos
}

export interface Heading {
    heading: string
    level: number
    pos: Pos
}

export interface ListItem {
    parent: number
    pos: Pos
    task?: string
}

export interface Tag {
    tag: string
    pos: Pos
}

export interface ParseResult {
    headings?: Heading[]
    links?: Link[]
    embeds?: Embed[]
    listItems?: ListItem[]
    frontmatter?: Frontmatter
    frontmatterLinks?: FrontmatterLink[]
    frontmatterPos?: FrontmatterPos
}
