# Bump package.json, commit, tag and push; the tag triggers .github/workflows/release.yml.
release version:
    @echo "{{version}}" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || (echo "usage: just release 1.2.3" && exit 1)
    @git diff --quiet HEAD || (echo "commit or stash your changes first" && exit 1)
    npm pkg set version={{version}}
    git commit -am "Release v{{version}}"
    git tag v{{version}}
    git push origin HEAD v{{version}}
