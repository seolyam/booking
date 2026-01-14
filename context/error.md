[{
"resource": "/c:/project/budget/src/app/dashboard/budget/create/page.tsx",
"owner": "eslint5",
"code": "react-hooks/purity",
"severity": 8,
"message": "Error: Cannot call impure function during render\n\n`Math.random` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent).\n\nC:\\project\\budget\\src\\app\\dashboard\\budget\\create\\page.tsx:35:20\n 33 | const year = now.getFullYear();\n 34 | const month = String(now.getMonth() + 1).padStart(2, \"0\");\n> 35 | const random = Math.random().toString(36).substring(2, 7).toUpperCase();\n | ^^^^^^^^^^^^^ Cannot call impure function\n 36 | return `PROJ-${year}${month}-${random}`;\n 37 | };\n 38 |",
"source": "eslint",
"startLineNumber": 35,
"startColumn": 20,
"endLineNumber": 35,
"endColumn": 33,
"modelVersionId": 416,
"origin": "extHost1"
},{
"resource": "/c:/project/budget/src/app/dashboard/budget/create/page.tsx",
"owner": "tailwindcss-intellisense",
"code": "suggestCanonicalClasses",
"severity": 4,
"message": "The class `min-h-[120px]` can be written as `min-h-30`",
"startLineNumber": 447,
"startColumn": 40,
"endLineNumber": 447,
"endColumn": 53,
"modelVersionId": 416,
"origin": "extHost1"
}]
[{
"resource": "/c:/project/budget/src/app/login/page.tsx",
"owner": "tailwindcss-intellisense",
"code": "suggestCanonicalClasses",
"severity": 4,
"message": "The class `flex-shrink-0` can be written as `shrink-0`",
"startLineNumber": 419,
"startColumn": 64,
"endLineNumber": 419,
"endColumn": 77,
"modelVersionId": 1,
"origin": "extHost1"
}]
