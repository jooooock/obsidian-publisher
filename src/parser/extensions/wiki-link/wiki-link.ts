// @ts-nocheck micromark-util-types 无法自定义token类型

import {markdownLineEnding, markdownLineEndingOrSpace} from 'micromark-util-character'
import {codes} from 'micromark-util-symbol'
import type {Code, State, Effects, Extension} from 'micromark-util-types'


/**
 * wiki-link 插件
 * 解析 `[[dest|alias]]` 语法
 */
export function wikiLink(): Extension {
    debugger

    const aliasMarker = '|'
    const startMarker = '[['
    const endMarker = ']]'


    function wikiLinkTokenize(effects: Effects, ok: State, nok: State) {
        let hasTarget = false
        let hasAlias = false

        let aliasCursor = 0
        let startMarkerCursor = 0
        let endMarkerCursor = 0

        return start


        function start(code: Code) {
            debugger

            if (code !== startMarker.charCodeAt(startMarkerCursor)) {
                return nok
            }

            effects.enter('wikiLink')
            effects.enter('wikiLinkMarker')
            effects.consume(code)

            return consumeStart
        }

        function consumeStart(code: Code) {
            debugger

            if (startMarkerCursor === startMarker.length) {
                effects.exit('wikiLinkMarker')
                return consumeData
            }

            if (code !== startMarker.charCodeAt(startMarkerCursor)) {
                return nok
            }

            effects.consume(code)
            startMarkerCursor++

            return consumeStart
        }

        function consumeData(code: Code) {
            debugger

            if (markdownLineEnding(code) || code === codes.eof) {
                return nok
            }

            effects.enter('wikiLinkData')
            effects.enter('wikiLinkTarget')

            return consumeTarget
        }

        function consumeTarget(code: Code) {
            debugger

            if (code === aliasMarker.charCodeAt(aliasCursor)) {
                if (!hasTarget) {
                    return nok
                }

                effects.exit('wikiLinkTarget')
                effects.enter('wikiLinkAliasMarker')
                return consumeAliasMarker
            }

            if (code === endMarker.charCodeAt(endMarkerCursor)) {
                if (!hasTarget) {
                    return nok
                }

                effects.exit('wikiLinkTarget')
                effects.exit('wikiLinkData')
                effects.enter('wikiLinkMarker')
                return consumeEnd
            }

            if (markdownLineEnding(code) || code === codes.eof) {
                return nok
            }

            if (!markdownLineEndingOrSpace(code)) {
                hasTarget = true
            }

            effects.consume(code)

            return consumeTarget
        }

        function consumeAliasMarker(code: Code) {
            debugger

            if (aliasCursor === aliasMarker.length) {
                effects.exit('wikiLinkAliasMarker')
                effects.enter('wikiLinkAlias')
                return consumeAlias
            }

            if (code !== aliasMarker.charCodeAt(aliasCursor)) {
                return nok
            }

            effects.consume(code)
            aliasCursor++

            return consumeAliasMarker
        }

        function consumeAlias(code: Code) {
            debugger

            if (code === endMarker.charCodeAt(endMarkerCursor)) {
                if (!hasAlias) {
                    return nok
                }
                effects.exit('wikiLinkAlias')
                effects.exit('wikiLinkData')
                effects.enter('wikiLinkMarker')
                return consumeEnd
            }

            if (markdownLineEnding(code) || code === codes.eof) {
                return nok
            }

            if (!markdownLineEndingOrSpace(code)) {
                hasAlias = true
            }

            effects.consume(code)

            return consumeAlias
        }

        function consumeEnd(code: Code) {
            debugger

            if (endMarkerCursor === endMarker.length) {
                effects.exit('wikiLinkMarker')
                effects.exit('wikiLink')
                return ok
            }

            if (code !== endMarker.charCodeAt(endMarkerCursor)) {
                return nok
            }

            effects.consume(code)
            endMarkerCursor++

            return consumeEnd
        }
    }

    return {
        text: {
            // `[`
            91: {
                name: 'wiki-link',
                tokenize: wikiLinkTokenize,
            }
        }
    }
}
