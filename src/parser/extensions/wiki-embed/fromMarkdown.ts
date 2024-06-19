// deno-lint-ignore-file no-explicit-any
import type {CompileContext, Token} from 'mdast-util-from-markdown'


function wikiEmbedFromMarkdown() {
    let node: any

    function enterWikiEmbed(this: CompileContext, token: Token) {
        node = {
            type: 'wikiEmbed',
            value: null,
            alias: null,
        }
        this.enter(node, token)
    }

    function top(stack: any[]) {
        return stack[stack.length - 1]
    }

    function exitWikiEmbedAlias(this: CompileContext, token: Token) {
        const alias = this.sliceSerialize(token)
        const current = top(this.stack)
        current.alias = alias
    }

    function exitWikiEmbedTarget(this: CompileContext, token: Token) {
        const target = this.sliceSerialize(token)
        const current = top(this.stack)
        current.value = target
    }

    function exitWikiEmbed(this: CompileContext, token: Token) {
        this.exit(token)

        if (!node.alias) {
            node.alias = node.value
        }

        // todo: 此处暂时先用正则替换，后续需要看看转义字符具体怎么处理
        node.value = node.value.replace(/[\\]+$/g, '')

        if (node.alias[0] === '#') {
            node.alias = node.alias.slice(1)
        }
        node.alias = node.alias.replace(/#/g, ' > ')
    }

    return {
        enter: {
            wikiEmbed: enterWikiEmbed
        },
        exit: {
            wikiEmbedTarget: exitWikiEmbedTarget,
            wikiEmbedAlias: exitWikiEmbedAlias,
            wikiEmbed: exitWikiEmbed
        }
    }
}

export {wikiEmbedFromMarkdown}
