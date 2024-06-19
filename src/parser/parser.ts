import {fromMarkdown} from 'mdast-util-from-markdown'
import {gfm} from 'micromark-extension-gfm'
import {gfmFromMarkdown} from 'mdast-util-gfm'
import { frontmatter } from "micromark-extension-frontmatter"
import { frontmatterFromMarkdown } from "mdast-util-frontmatter"
import {wikiLink, wikiLinkFromMarkdown} from './extensions/wiki-link/index'
import {wikiEmbed, wikiEmbedFromMarkdown} from './extensions/wiki-embed/index'
import {tag, tagFromMarkdown} from './extensions/tag/index'
import {load as parseYaml} from "js-yaml"
import type {ListItem, Heading, Link, Tag, ParseResult} from './types'


function formatPosition(position: any): Heading["pos"] {
    const {start, end} = position
    return [
        start.line - 1, start.column - 1, start.offset,
        end.line - 1, end.column - 1, end.offset]
}

/**
 * 查找树中的某类型节点
 * @param root
 * @param type
 * @param level
 * @param parent
 */
function resolveNodes(root: any, type: string, level = 0, parent = 1) {
    const result = []
    if (root.type === type) {
        root._level = level++
        root._parent = parent
        result.push(root)
    }
    if (root.children) {
        root.children.forEach((child: any) => {
            result.push(...resolveNodes(child, type, level, root.position.start.line))
        })
    }
    return result
}

function convertFrontmatter(root: any, result: Record<string, any>, _source: string) {
    if (root.children.length > 0 && root.children[0].type === 'yaml') {
        const yamlNode = root.children[0]

        // [[|123|456\\\||]]
        const frontmatter: Record<string, any> = parseYaml(yamlNode.value) as Record<string, any>
        const frontmatterLinks = []
        for (let [key, value] of Object.entries(frontmatter)) {
            if (typeof value === 'string') {
                value = value.trim()
                if (/^\[\[.+]]$/.test(value)) {
                    const idx = value.findIndex('|')
                    let link, displayText
                    if (idx === -1) {
                        // 没有 | 字符
                        link = displayText = value.substring(2, -2)
                    } else if (idx !== 2) {
                        link = value.substring(2, idx)
                        displayText = value.substring(idx, -2)
                    } else {
                        displayText = value.substring(2, -2)
                        link = value.substring(idx, -2)
                    }
                    frontmatterLinks.push({
                        key: key,
                        original: value,
                        displayText: displayText,
                        link: link,
                    })
                }
            }
        }


        Object.assign(result, {
            frontmatter: frontmatter,
            frontmatterLinks: frontmatterLinks,
            frontmatterPos: formatPosition(yamlNode.position!),
        })
    }
}

function convertHeadings(root: any, result: Record<string, any>, source: string) {
    const headings: Heading[] = []
    const headingNodes = resolveNodes(root, 'heading')
    headingNodes.forEach((node: any) => {
        const heading = source.slice(node.position.start.offset, node.position.end.offset)
        headings.push({
            heading: heading.replace(/^#+\s/, '').replace(/\s+$/, ''),
            level: node.depth,
            pos: formatPosition(node.position),
        })
    })
    if (headings.length > 0) {
        Object.assign(result, {
            headings
        })
    }
}

function convertListItems(root: any, result: Record<string, any>, _source: string) {
    const listItems: ListItem[] = []
    const listNodes = resolveNodes(root, 'list')

    // listNodes.sort((a, b) => a.position.start.offset > b.position.start.offset ? 1 : -1)
    // console.log(listNodes)
    // Deno.writeTextFileSync('result.json', JSON.stringify(listNodes))

    listNodes.forEach((listNode: any) => {
        // 修复list节点的最后一个item结束坐标与list结束坐标不匹配的问题
        // 比如，
        //   - 123
        //   - 456
        //   ..
        //   ^^ 注意此处有2个空格
        // 这样就会导致 list.position.end 与 list.children[1].position.end 不一致，因此需要修复
        if (listNode.position.end.offset !== listNode.children.at(-1).position.end.offset) {
            // 修复位置偏差
            listNode.children.at(-1).position.end = listNode.position.end
        }

        listNode.children.forEach((itemNode: any) => {
            // 如果 listItem 内部嵌套 list 的话，需要修正内部list之前的 listItem 的位置
            const firstListIdx = itemNode.children.findIndex((n: any) => n.type === 'list')
            if (firstListIdx > 0) {
                const target = itemNode.children[firstListIdx - 1]
                itemNode.position.end = target.position.end
            }

            let parent
            if (listNode._level === 0) {
                parent = -1 * (listNode.position.start.line - 1)
            } else {
                parent = listNode._parent - 1
            }
            const item: ListItem = {
                parent: parent,
                pos: formatPosition(itemNode.position),
            }
            if (typeof itemNode.checked === 'boolean') {
                item.task = itemNode.checked ? 'x' : ' '
            }
            listItems.push(item)
        })
    })

    if (listItems.length > 0) {
        // 排序
        listItems.sort((a, b) => a.pos[2] > b.pos[2] ? 1 : -1)
        Object.assign(result, {
            listItems,
        })
    }
}

function convertLinks(root: any, result: Record<string, any>, _source: string) {
    const links: Link[] = []
    const normalLinks = resolveNodes(root, 'link')
    normalLinks.filter(link => !/^([a-z][a-z0-9+\-.]*):/i.test(link.url)).forEach((link: any) => {
        // const text = link.children.filter((n: any) => n.type === 'text').map((n: any) => n.value).join('')
        links.push({
            link: decodeURIComponent(link.url),
            displayText: link.children[0].value,
            pos: formatPosition(link.position),
        })
    })

    const wikiLinks = resolveNodes(root, 'wikiLink')
    wikiLinks.forEach((link: any) => {
        links.push({
            link: link.value,
            displayText: link.alias,
            pos: formatPosition(link.position),
        })
    })
    if (links.length > 0) {
        // 排序
        links.sort((a, b) => a.pos[2] > b.pos[2] ? 1 : -1)
        Object.assign(result, {
            links,
        })
    }
}

function convertEmbeds(root: any, result: Record<string, any>, _source: string) {
    const embeds: Link[] = []
    const normalEmbeds = resolveNodes(root, 'image').filter(image => !/^([a-z][a-z0-9+\-.]*):/i.test(image.url))
    normalEmbeds.forEach(embed => {
        embeds.push({
            link: embed.url,
            displayText: embed.alt,
            pos: formatPosition(embed.position),
        })
    })
    const wikiEmbeds = resolveNodes(root, 'wikiEmbed')
    wikiEmbeds.forEach((embed: any) => {
        embeds.push({
            link: embed.value,
            displayText: embed.alias,
            pos: formatPosition(embed.position),
        })
    })
    if (embeds.length > 0) {
        // 排序
        embeds.sort((a, b) => a.pos[2] > b.pos[2] ? 1 : -1)
        Object.assign(result, {
            embeds,
        })
    }
}

function convertTags(root: any, result: Record<string, any>, _source: string) {
    const tags: Tag[] = []
    const tagNodes = resolveNodes(root, 'tag')
    tagNodes.forEach(tagNode => {
        tags.push({
            tag: tagNode.value,
            pos: formatPosition(tagNode.position),
        })
    })
    if (tags.length > 0) {
        Object.assign(result, {
            tags,
        })
    }
}

function convertBlocks(root: any, result: Record<string, any>, _source: string) {
    // todo: 解析blocks
}

/**
 * 将 ast 转为 publish 兼容的格式
 * @param root AST
 * @param source 源文本
 */
function convertPublishCache(root: any, source: string) {
    const result: Record<string, any> = {}

    // frontmatter
    convertFrontmatter(root, result, source)

    // headings
    convertHeadings(root, result, source)

    // listItems
    convertListItems(root, result, source)

    // links
    convertLinks(root, result, source)

    // embeds
    convertEmbeds(root, result, source)

    // tags
    convertTags(root, result, source)

    // blocks
    convertBlocks(root, result, source)

    return result
}

/**
 * 解析 markdown
 * @param source 源文本
 */
export function parseMarkdown(source: string): ParseResult {
    const root = fromMarkdown(source, {
        extensions: [
            gfm(),
            frontmatter(['yaml']),
            // wikiLink(),
            // wikiEmbed(),
            // tag(),
        ],
        mdastExtensions: [
            gfmFromMarkdown(),
            frontmatterFromMarkdown(['yaml']),
            // wikiLinkFromMarkdown(),
            // wikiEmbedFromMarkdown(),
            // tagFromMarkdown(),
        ]
    })

    // console.log(root)

    return convertPublishCache(root, source)
}
