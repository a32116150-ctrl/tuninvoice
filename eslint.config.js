const js = require('@eslint/js');

module.exports = [
    js.configs.recommended,
    {
        ignores: ['dist/**', 'node_modules/**', 'broken_state_backup/**', 'fix_*.js', 'replace_*.js', 'src/**/*.min.js']
    },
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                window: 'readonly',
                document: 'readonly',
                lucide: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                Notification: 'readonly',
                console: 'readonly',
                require: 'readonly',
                __dirname: 'readonly',
                module: 'readonly',
                exports: 'readonly',
                process: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                fetch: 'readonly',
                alert: 'readonly',
                Buffer: 'readonly',
                electronAPI: 'readonly',
                setImmediate: 'readonly',
                clearImmediate: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': 'off',
            'prefer-const': 'warn',
            'no-var': 'warn',
            'eqeqeq': ['warn', 'smart'],
            'no-throw-literal': 'warn',
            semi: ['warn', 'always'],
            quotes: ['warn', 'single', { avoidEscape: true }]
        }
    }
];
