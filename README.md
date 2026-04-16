# Roq Material Theme

A clone of MkDocs' material theme for use in Quarkus Roq. This repository is currently under construction. Much of the javascript code is based on minified build output from MkDocs, and therefore will be difficult to read in its current state.

## How To Use

Note that this currently only works if you have locally cloned and built the repository:

```sh
git clone https://github.com/RyanJK5/Roq-Material-Theme
cd Roq-Material-Theme
mvn clean build
```

Include the dependency in `pom.xml` of your Roq project as you would the default theme:

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
```

And then run your application:

```sh
mvn quarkus:dev
```


## Work Left to Do

- ~~Fix GitHub widget only showing Stork information~~
- Code cleanup
    - Change `extra.yml` to something that makes more sense
- Replace custom search functionality with [Roq's Lunr Plugin](https://quarkus.io/extensions/io.quarkiverse.roq/quarkus-roq-plugin-lunr/)
- Add admonition support
- Customizability options (e.g. header color, search enabled/disabled, etc.)