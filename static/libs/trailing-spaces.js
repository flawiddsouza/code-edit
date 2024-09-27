import * as monaco from 'https://cdn.jsdelivr.net/npm/monaco-editor@0.51.0/+esm'

const TrailingSpacesSettings = {
    regexp: "\\s+",
    includeEmptyLines: false,
    highlightCurrentLine: true,
    languagesToIgnore: { 'plaintext': false },
    schemesToIgnore: { 'file': false }
}

function getRangesToHighlight(editor, model, settings) {
    const ranges = findTrailingSpaces(model, settings);
    const editorSelections = editor.getSelections() || []

    if (!settings.highlightCurrentLine) {
        const currentLines = editorSelections.map(selection => model.getLineContent(selection.selectionStartLineNumber))

        return ranges.filter(range => {
            return !currentLines.some((line, index) => {
                const lineRange = new monaco.Range(editorSelections[index].selectionStartLineNumber, 1, editorSelections[index].selectionStartLineNumber, line.length + 1)
                return intersects(range, lineRange)
            })
        })
    }
    return ranges
}

function findTrailingSpaces(model, settings) {
    if (ignoreDocument(model.getLanguageId(), model.uri.scheme, settings)) {
        console.info(`File with language '${model.getLanguageId()}' and scheme '${model.uri.scheme}' ignored - ${model.uri.toString()}`)
        return []
    } else {
        const offendingRanges = []
        const regexp = "(" + settings.regexp + ")$"
        const noEmptyLinesRegexp = "\\S" + regexp
        const offendingRangesRegexp = new RegExp(settings.includeEmptyLines ? regexp : noEmptyLinesRegexp, "gm")
        const documentText = model.getValue()

        let match
        while ((match = offendingRangesRegexp.exec(documentText)) !== null) {
            const matchStart = (match.index + match[0].length - match[1].length)
            const matchEnd = match.index + match[0].length
            const matchRange = {
                startLineNumber: model.getPositionAt(matchStart).lineNumber,
                startColumn: model.getPositionAt(matchStart).column,
                endLineNumber: model.getPositionAt(matchEnd).lineNumber,
                endColumn: model.getPositionAt(matchEnd).column
            }
            if (matchRange.startColumn !== matchRange.endColumn) {
                offendingRanges.push(matchRange)
            }
        }
        return offendingRanges
    }
}

function ignoreDocument(language, scheme, settings) {
    return (!!settings.languagesToIgnore[language] || !!settings.schemesToIgnore[scheme])
}

function intersects(range1, range2) {
    return !(range2.startLineNumber > range1.endLineNumber ||
        range2.endLineNumber < range1.startLineNumber ||
        (range2.startLineNumber === range1.endLineNumber && range2.startColumn > range1.endColumn) ||
        (range2.endLineNumber === range1.startLineNumber && range2.endColumn < range1.startColumn))
}

let oldDecorations = []

export function updateDecorations(editor) {
    const model = editor.getModel()
    if (!model) return

    const ranges = getRangesToHighlight(editor, model, TrailingSpacesSettings).map(range => ({
        range: new monaco.Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn),
        options: { inlineClassName: 'trailing-spaces-highlight' }
    }))

    oldDecorations = editor.deltaDecorations(oldDecorations, ranges)
}
