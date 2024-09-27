import * as monaco from 'https://cdn.jsdelivr.net/npm/monaco-editor@0.51.0/+esm'
import 'https://cdn.jsdelivr.net/npm/monaco-editor-nginx@2.0.2/+esm'
import * as trailingSpaces from './libs/trailing-spaces.js'

const editor = monaco.editor.create(document.getElementById('editor'), {
    value: '',
    language: 'plaintext',
    theme: 'vs-dark',
    automaticLayout: true,
})

let originalContent = ''

let path = window.location.pathname

const sortedLanguages = monaco.languages.getLanguages().slice(0).sort((a, b) => {
    const aName = a.aliases ? a.aliases[0] : a.id
    const bName = b.aliases ? b.aliases[0] : b.id
    return aName.localeCompare(bName)
})

sortedLanguages.forEach(lang => {
    const option = document.createElement('option')
    option.value = lang.id
    option.textContent = lang.aliases ? lang.aliases[0] : lang.id
    document.getElementById('language-selector').appendChild(option)
})

fetch(`/file${path}`).then(async response => {
    if (!response.ok) {
        const responseText = await response.text()
        throw new Error(responseText)
    }
    return response.json()
}).then(data => {
    originalContent = data.content
    editor.setValue(data.content)
    document.title = data.name

    const model = monaco.editor.createModel(data.content, undefined, monaco.Uri.file(data.name))
    editor.setModel(model)

    const languageId = model.getLanguageId()
    document.getElementById('language-selector').value = languageId

    trailingSpaces.updateDecorations(editor)
}).catch(error => {
    document.body.classList.add('error')
    document.body.textContent = error.message
}).finally(() => {
    document.body.classList.remove('loading')
})

editor.onDidChangeModelContent(() => {
    trailingSpaces.updateDecorations(editor)
    if (editor.getValue() !== originalContent) {
        document.title = document.title.replace('*', '') + ' *'
    } else {
        document.title = document.title.replace('*', '')
    }
})

document.getElementById('language-selector').addEventListener('change', function() {
    const newLanguage = this.value
    const currentModel = editor.getModel()
    monaco.editor.setModelLanguage(currentModel, newLanguage)
})

window.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault() // Prevent the default save dialog

        fetch('/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: path.replace('/', ''),
                content: editor.getValue()
            })
        }).then(response => {
            if (response.ok) {
                originalContent = editor.getValue() // Update original content to current content
                document.title = document.title.replace('*', '') // Remove asterisk from title
                alert('Saved successfully')
            } else {
                alert('Save failed')
            }
        })

        return false
    }
})
