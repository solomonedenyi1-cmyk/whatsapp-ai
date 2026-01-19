/** @type {import('semantic-release').GlobalConfig} */
module.exports = {
    branches: ['main'],
    tagFormat: 'v${version}',
    plugins: [
        '@semantic-release/commit-analyzer',
        [
            '@semantic-release/release-notes-generator',
            {
                preset: 'angular',
                writerOpts: {
                    transform: (commit, context) => {
                        let discard = true;
                        const notes = (commit.notes || []).map((note) => {
                            discard = false;
                            return {
                                ...note,
                                title: 'BREAKING CHANGES',
                            };
                        });

                        const rawType = typeof commit.type === 'string' ? commit.type : '';

                        const typeMap = {
                            feat: 'Features',
                            fix: 'Bug Fixes',
                            perf: 'Performance Improvements',
                            refactor: 'Refactoring',
                            docs: 'Documentation',
                            test: 'Tests',
                            ci: 'Continuous Integration',
                            build: 'Build System',
                            chore: 'Chores',
                            style: 'Styles',
                            revert: 'Reverts',
                            security: 'Security',
                            deps: 'Dependencies',
                        };

                        let type;
                        if (rawType === 'revert' || commit.revert) {
                            type = typeMap.revert;
                        } else if (rawType && typeMap[rawType]) {
                            type = typeMap[rawType];
                        } else if (rawType) {
                            type = rawType
                                .split(/[-_]/g)
                                .filter(Boolean)
                                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ');
                        } else {
                            type = 'Other';
                        }

                        if (discard && !rawType) {
                            return undefined;
                        }

                        const scope = commit.scope === '*' ? '' : commit.scope;
                        const shortHash =
                            typeof commit.hash === 'string'
                                ? commit.hash.substring(0, 7)
                                : commit.shortHash;

                        const issues = [];
                        let { subject } = commit;

                        if (typeof subject === 'string') {
                            let url = context.repository
                                ? `${context.host}/${context.owner}/${context.repository}`
                                : context.repoUrl;

                            if (url) {
                                url = `${url}/issues/`;
                                subject = subject.replace(/#([0-9]+)/g, (_, issue) => {
                                    issues.push(issue);
                                    return `[#${issue}](${url}${issue})`;
                                });
                            }

                            if (context.host) {
                                subject = subject.replace(
                                    /\B@([a-z0-9](?:-?[a-z0-9/]){0,38})/g,
                                    (_, username) => {
                                        if (username.includes('/')) {
                                            return `@${username}`;
                                        }

                                        return `[@${username}](${context.host}/${username})`;
                                    }
                                );
                            }
                        }

                        const references = (commit.references || []).filter(
                            (reference) => !issues.includes(reference.issue)
                        );

                        return {
                            notes,
                            type,
                            scope,
                            shortHash,
                            subject,
                            references,
                        };
                    },
                    groupBy: 'type',
                    commitGroupsSort: 'title',
                    commitsSort: ['scope', 'subject'],
                },
            },
        ],
        [
            '@semantic-release/github',
            {
                successComment: false,
                failComment: false,
            },
        ],
    ],
};
