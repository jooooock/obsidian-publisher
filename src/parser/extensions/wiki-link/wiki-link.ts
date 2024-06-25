// @ts-nocheck micromark-util-types 无法自定义token类型

import {markdownLineEnding, markdownLineEndingOrSpace} from 'micromark-util-character'
import {codes} from 'micromark-util-symbol'
import type {Code, State, Effects, Extension} from 'micromark-util-types'


/**
 * wiki-link 插件
 * 解析 `[[dest|alias]]` 语法
 */
export function wikiLink(): Extension {
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
            if (code !== startMarker.charCodeAt(startMarkerCursor)) {
                return nok(code)
            }

            effects.enter('wikiLink')
            effects.enter('wikiLinkMarker')

            return consumeStart(code)
        }

        function consumeStart(code: Code) {
            if (startMarkerCursor === startMarker.length) {
                effects.exit('wikiLinkMarker')
                return consumeData(code)
            }

            if (code !== startMarker.charCodeAt(startMarkerCursor)) {
                return nok(code)
            }

            effects.consume(code)
            startMarkerCursor++

            return consumeStart
        }

        function consumeData(code: Code) {
            if (markdownLineEnding(code) || code === codes.eof) {
                return nok(code)
            }

            effects.enter('wikiLinkData')
            effects.enter('wikiLinkTarget')

            return consumeTarget(code)
        }

        function consumeTarget(code: Code) {
            if (code === aliasMarker.charCodeAt(aliasCursor)) {
                if (!hasTarget) {
                    return nok(code)
                }

                effects.exit('wikiLinkTarget')
                effects.enter('wikiLinkAliasMarker')
                return consumeAliasMarker(code)
            }

            if (code === endMarker.charCodeAt(endMarkerCursor)) {
                if (!hasTarget) {
                    return nok(code)
                }

                effects.exit('wikiLinkTarget')
                effects.exit('wikiLinkData')
                effects.enter('wikiLinkMarker')
                return consumeEnd(code)
            }

            if (markdownLineEnding(code) || code === codes.eof) {
                return nok(code)
            }

            if (!markdownLineEndingOrSpace(code)) {
                hasTarget = true
            }

            effects.consume(code)

            return consumeTarget
        }

        function consumeAliasMarker(code: Code) {
            if (aliasCursor === aliasMarker.length) {
                effects.exit('wikiLinkAliasMarker')
                effects.enter('wikiLinkAlias')
                return consumeAlias(code)
            }

            if (code !== aliasMarker.charCodeAt(aliasCursor)) {
                return nok(code)
            }

            effects.consume(code)
            aliasCursor++

            return consumeAliasMarker
        }

        function consumeAlias(code: Code) {
            if (code === endMarker.charCodeAt(endMarkerCursor)) {
                if (!hasAlias) {
                    return nok(code)
                }
                effects.exit('wikiLinkAlias')
                effects.exit('wikiLinkData')
                effects.enter('wikiLinkMarker')
                return consumeEnd(code)
            }

            if (markdownLineEnding(code) || code === codes.eof) {
                return nok(code)
            }

            if (!markdownLineEndingOrSpace(code)) {
                hasAlias = true
            }

            effects.consume(code)

            return consumeAlias
        }

        function consumeEnd(code: Code) {
            if (endMarkerCursor === endMarker.length) {
                effects.exit('wikiLinkMarker')
                effects.exit('wikiLink')
                return ok(code)
            }

            if (code !== endMarker.charCodeAt(endMarkerCursor)) {
                return nok(code)
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
