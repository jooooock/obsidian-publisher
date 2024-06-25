// @ts-nocheck micromark-util-types 无法自定义token类型

import type {Code, State, Effects} from 'micromark-util-types'


/**
 * tag 插件
 * @return {Extension}
 */
export function tag() {
    const startMarker = '#'


    function tagTokenize(effects: Effects, ok: State, nok: State) {
        let hasNonNumericChars = false

        return start

        /**
         * @param {Code} _code
         */
        function start(_code: Code) {
            effects.enter('tag')
            effects.enter('tagMarker')

            return consumeMarker(code)
        }

        /**
         * @param {Code} code
         */
        function consumeMarker(code: Code) {
            if (String.fromCharCode(code as number) !== startMarker) {
                return nok(code)
            }

            effects.consume(code)
            effects.exit('tagMarker')
            effects.enter('tagData')

            return consumeData
        }

        /**
         * @param {Code} code
         */
        function consumeData(code: Code) {
            // 合法字符
            if (/[a-z0-9_/-]/i.test(String.fromCharCode(code as number))) {
                effects.consume(code)

                if (/[a-z_/-]/i.test(String.fromCharCode(code as number))) {
                    hasNonNumericChars = true
                }

                return consumeData
            }

            if (!hasNonNumericChars) {
                return nok(code)
            }

            effects.exit('tagData')
            effects.exit('tag')

            return ok(code)
        }
    }


    return {
        text: {
            // `#`
            35: {
                name: 'tag',
                tokenize: tagTokenize,
            }
        }
    }
}
