# What the next release's changelog will say (from Conventional Commits since the last tag).
changelog:
    git cliff --unreleased --strip header

# The tag triggers .github/workflows/release.yml.
# Bump package.json, write CHANGELOG.md, commit, tag and push.
release version:
    @echo "{{version}}" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || (echo "usage: just release 1.2.3" && exit 1)
    @git diff --quiet HEAD || (echo "commit or stash your changes first" && exit 1)
    npm pkg set version={{version}}
    git cliff --tag v{{version}} -o CHANGELOG.md
    git add package.json CHANGELOG.md
    git commit -m "Release v{{version}}"
    git tag v{{version}}
    git push origin HEAD v{{version}}
