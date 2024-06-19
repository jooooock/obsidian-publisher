// deno-lint-ignore-file no-explicit-any
import type {CompileContext, Token} from 'mdast-util-from-markdown'


function tagFromMarkdown() {
    let node: any

    function enterTag(this: CompileContext, token: Token) {
        node = {
            type: 'tag',
            value: null,
        }
        this.enter(node, token)
    }

    function top(stack: any[]) {
        return stack[stack.length - 1]
    }

    function exitTag(this: CompileContext, token: Token) {
        const value = this.sliceSerialize(token)
        const current = top(this.stack)
        current.value = value

        this.exit(token)
    }

    return {
        enter: {
            tag: enterTag
        },
        exit: {
            tag: exitTag
        }
    }
}

export {tagFromMarkdown}
