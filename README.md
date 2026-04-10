# Roq Material Theme

A clone of MkDocs' material theme for use in Quarkus Roq. This repository is currently under construction. Much of the javascript code is based on minified build output from MkDocs, and therefore will be difficult to read in its current state.

## How To Use

Note that this currently only works if you have locally cloned the repository.

Include the dependency in `pom.xml` as you would the defalut theme:

```xml
<dependency>
    <groupId>io.quarkiverse.roq</groupId>
    <artifactId>quarkus-roq-theme-material</artifactId>
    <version>1.0.0-SNAPSHOT</version>
</dependency>
```

Specify the necessary information in `data/extra.yml` like so:

```yaml
name: Smallrye Stork
repo_url: https://github.com/smallrye/smallrye-stork
logo: /images/stork-white.png
version:
  current: SNAPSHOT
```

## Work Left to Do

- Code cleanup
    - Change `extra.yml` to something that makes more sense
- Replace custom search functionality with [Roq's Lunr Plugin](https://quarkus.io/extensions/io.quarkiverse.roq/quarkus-roq-plugin-lunr/)
- Add admonition support
- Customizability options (e.g. header color, search enabled/disabled, etc.)