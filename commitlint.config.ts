import { RuleConfigSeverity } from '@commitlint/types'

const Configuration = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [
            RuleConfigSeverity.Error,
            'always',
            [
                'feat',
                'fix',
                'docs',
                'style',
                'refactor',
                'perf',
                'test',
                'build',
                'ci',
                'chore',
                'revert',
            ],
        ],
        'subject-case': [RuleConfigSeverity.Error, 'always', 'lower-case'],
        'header-max-length': [RuleConfigSeverity.Error, 'always', 100],
    },
}

export default Configuration
