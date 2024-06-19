// @ts-nocheck micromark-util-types 无法自定义token类型

import {markdownLineEnding, markdownLineEndingOrSpace} from 'micromark-util-character'
import {codes} from 'micromark-util-symbol'
import type {Code, State, Effects} from 'micromark-util-types'


/**
 * wiki-embed 插件
 * @return {Extension}
 */
export function wikiEmbed() {
    const aliasMarker = '|'
    const startMarker = '![['
    const endMarker = ']]'


    function wikiEmbedTokenize(effects: Effects, ok: State, nok: State) {
        let hasTarget = false
        let hasAlias = false

        let aliasCursor = 0
        let startMarkerCursor = 0
        let endMarkerCursor = 0

        return start

        /**
         * @param {Code} code
         */
        function start(code: Code) {
            if (code !== startMarker.charCodeAt(startMarkerCursor)) {
                return nok
            }

            effects.enter('wikiEmbed')
            effects.enter('wikiEmbedMarker')

            return consumeStart
        }

        /**
         * @param {Code} code
         */
        function consumeStart(code: Code) {
            if (startMarkerCursor === startMarker.length) {
                effects.exit('wikiEmbedMarker')
                return consumeData
            }

            if (code !== startMarker.charCodeAt(startMarkerCursor)) {
                return nok
            }

            effects.consume(code)
            startMarkerCursor++

            return consumeStart
        }

        /**
         * @param {Code} code
         */
        function consumeData(code: Code) {
            if (markdownLineEnding(code) || code === codes.eof) {
                return nok
            }

            effects.enter('wikiEmbedData')
            effects.enter('wikiEmbedTarget')

            return consumeTarget
        }

        /**
         * @param {Code} code
         */
        function consumeTarget(code: Code) {
            if (code === aliasMarker.charCodeAt(aliasCursor)) {
                if (!hasTarget) {
                    return nok
                }

                effects.exit('wikiEmbedTarget')
                effects.enter('wikiEmbedAliasMarker')
                return consumeAliasMarker
            }

            if (code === endMarker.charCodeAt(endMarkerCursor)) {
                if (!hasTarget) {
                    return nok
                }

                effects.exit('wikiEmbedTarget')
                effects.exit('wikiEmbedData')
                effects.enter('wikiEmbedMarker')
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

        /**
         * @param {Code} code
         */
        function consumeAliasMarker(code: Code) {
            if (aliasCursor === aliasMarker.length) {
                effects.exit('wikiEmbedAliasMarker')
                effects.enter('wikiEmbedAlias')
                return consumeAlias
            }

            if (code !== aliasMarker.charCodeAt(aliasCursor)) {
                return nok
            }

            effects.consume(code)
            aliasCursor++

            return consumeAliasMarker
        }

        /**
         * @param {Code} code
         */
        function consumeAlias(code: Code) {
            if (code === endMarker.charCodeAt(endMarkerCursor)) {
                if (!hasAlias) {
                    return nok
                }
                effects.exit('wikiEmbedAlias')
                effects.exit('wikiEmbedData')
                effects.enter('wikiEmbedMarker')
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

        /**
         * @param {Code} code
         */
        function consumeEnd(code: Code) {
            if (endMarkerCursor === endMarker.length) {
                effects.exit('wikiEmbedMarker')
                effects.exit('wikiEmbed')
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
            // `!`
            33: {
                name: 'wiki-embed',
                tokenize: wikiEmbedTokenize,
            }
        }
    }
}
