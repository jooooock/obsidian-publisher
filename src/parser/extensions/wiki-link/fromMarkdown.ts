import type {CompileContext, Token} from 'mdast-util-from-markdown'


function wikiLinkFromMarkdown() {
    let node: any

    function enterWikiLink(this: CompileContext, token: Token) {
        node = {
            type: 'wikiLink',
            value: null,
            alias: null,
        }
        this.enter(node, token)
    }

    function top(stack: any[]) {
        return stack[stack.length - 1]
    }

    function exitWikiLinkAlias(this: CompileContext, token: Token) {
        const alias = this.sliceSerialize(token)
        const current = top(this.stack)
        current.alias = alias
    }

    function exitWikiLinkTarget(this: CompileContext, token: Token) {
        const target = this.sliceSerialize(token)
        const current = top(this.stack)
        current.value = target
    }

    function exitWikiLink(this: CompileContext, token: Token) {
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
            wikiLink: enterWikiLink
        },
        exit: {
            wikiLinkTarget: exitWikiLinkTarget,
            wikiLinkAlias: exitWikiLinkAlias,
            wikiLink: exitWikiLink
        }
    }
}

export {wikiLinkFromMarkdown}
