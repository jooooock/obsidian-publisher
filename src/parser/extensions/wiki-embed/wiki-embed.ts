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
                return nok(code)
            }

            effects.enter('wikiEmbed')
            effects.enter('wikiEmbedMarker')

            return consumeStart(code)
        }

        /**
         * @param {Code} code
         */
        function consumeStart(code: Code) {
            if (startMarkerCursor === startMarker.length) {
                effects.exit('wikiEmbedMarker')
                return consumeData(code)
            }

            if (code !== startMarker.charCodeAt(startMarkerCursor)) {
                return nok(code)
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
                return nok(code)
            }

            effects.enter('wikiEmbedData')
            effects.enter('wikiEmbedTarget')

            return consumeTarget(code)
        }

        /**
         * @param {Code} code
         */
        function consumeTarget(code: Code) {
            if (code === aliasMarker.charCodeAt(aliasCursor)) {
                if (!hasTarget) {
                    return nok(code)
                }

                effects.exit('wikiEmbedTarget')
                effects.enter('wikiEmbedAliasMarker')
                return consumeAliasMarker(code)
            }

            if (code === endMarker.charCodeAt(endMarkerCursor)) {
                if (!hasTarget) {
                    return nok(code)
                }

                effects.exit('wikiEmbedTarget')
                effects.exit('wikiEmbedData')
                effects.enter('wikiEmbedMarker')
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

        /**
         * @param {Code} code
         */
        function consumeAliasMarker(code: Code) {
            if (aliasCursor === aliasMarker.length) {
                effects.exit('wikiEmbedAliasMarker')
                effects.enter('wikiEmbedAlias')
                return consumeAlias(code)
            }

            if (code !== aliasMarker.charCodeAt(aliasCursor)) {
                return nok(code)
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
                    return nok(code)
                }
                effects.exit('wikiEmbedAlias')
                effects.exit('wikiEmbedData')
                effects.enter('wikiEmbedMarker')
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

        /**
         * @param {Code} code
         */
        function consumeEnd(code: Code) {
            if (endMarkerCursor === endMarker.length) {
                effects.exit('wikiEmbedMarker')
                effects.exit('wikiEmbed')
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
            // `!`
            33: {
                name: 'wiki-embed',
                tokenize: wikiEmbedTokenize,
            }
        }
    }
}
